import { Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ManDocument } from '../entities/man.entities';
import { MkistatDocument } from '../entities/mkistat.entities';
import { TrdDocument } from '../entities/trd.entities';
import { IdxDocument } from '../entities/idx.entities';
import { LastDataService } from './lastData.service';

import { config } from '../../dbconfig/db.config';
import { StatusService } from '../../daily_status/status.service';
import { MarketHours } from '../../daily_status/market-hours';
import { PollReporter } from '../../daily_status/poll-reporter';
import {
  classifyMysqlError,
  ClassifiedError,
} from '../../daily_status/mysql-errors';

import { FieldPacket, RowDataPacket } from 'mysql2';
// MySQL table -> API endpoint reported in daily_status.
const ENDPOINT_BY_TABLE: Record<string, string> = {
  IDX: '/idx',
  TRD: '/trd',
  MAN: '/man',
  MKISTAT: '/mkistat',
};

interface WriteResult {
  written: number;
  error?: unknown;
}

const isDuplicateError = (error: any): boolean =>
  error?.code === 11000 ||
  (Array.isArray(error?.writeErrors) &&
    error.writeErrors.length > 0 &&
    error.writeErrors.every((w: any) => (w?.err?.code ?? w?.code) === 11000));

const insertedBefore = (error: any): number =>
  error?.result?.insertedCount ?? error?.insertedDocs?.length ?? 0;

@Injectable()
export class MdsdataService {
  constructor(
    @InjectModel('idx') private idxModel: Model<IdxDocument>,
    @InjectModel('trd') private trdModel: Model<TrdDocument>,
    @InjectModel('mkistat') private mkistatModel: Model<MkistatDocument>,
    @InjectModel('man') private manModel: Model<ManDocument>,
    private readonly lastDataService: LastDataService,
    private readonly status: StatusService,
    private readonly marketHours: MarketHours,
  ) {
    for (const [table, endpoint] of Object.entries(ENDPOINT_BY_TABLE)) {
      this.reporters[table] = new PollReporter(status, marketHours, endpoint);
    }
  }

  private readonly reporters: Record<string, PollReporter> = {};

  async readAll(): Promise<any> {
    // console.log('last Data...', await this.lastDataService.getLastData());
    await this.startOfPoll();

    let connection: mysql.Connection;
    try {
      // console.log('config', config);
      connection = await mysql.createConnection(config);
      console.log('Connection established successfully.');
    } catch (error) {
      console.error('Error connecting to the database:', error);
      const failure = classifyMysqlError(error, 'connect');
      await Promise.all(
        Object.values(this.reporters).map((r) => r.error(failure)),
      );
      return;
    }

    try {
      //!===============================//////
      const mySqlTables = ['MKISTAT', 'IDX', 'MAN', 'TRD'];

      //!....................................... Last data
      const LastDoc = await this.lastDataService.getLastData();
      //!....................................... Last data

      // Each table migrates independently; wait for all of them so the
      // connection is only closed once every query has finished.
      await Promise.all(
        mySqlTables.map((table) =>
          this.migrateTable(connection, table, LastDoc),
        ),
      );
    } catch (error) {
      console.error('Error connecting to the database:', error);
    } finally {
      //!---------------------------
      await connection.end().catch(() => undefined); // Closing Connection
      //!---------------------------
    }
  }

  // Creates today's daily_status document when the poll starts inside the
  // session window (idempotent; closed days are never initialised).
  private async startOfPoll(): Promise<void> {
    if (await this.marketHours.inReportingWindow()) {
      await this.status.initDay();
    }
  }

  private async migrateTable(
    connection: mysql.Connection,
    table: string,
    LastDoc: any,
  ): Promise<void> {
    let model, SortOn, LastData;

    //!....................................... Last data
    const fieldName = `${table}LastData`;
    LastData = LastDoc[0][fieldName];
    //!....................................... Last data

    let total = 0;
    let queryError: unknown;
    let mongoError: unknown;

    try {
      if (table == 'IDX') {
        model = this.idxModel;
        SortOn = 'IDX_DATE_TIME';
      } else if (table == 'MAN') {
        model = this.manModel;
        SortOn = 'MAN_ANNOUNCEMENT_DATE_TIME';
      } else if (table == 'MKISTAT') {
        model = this.mkistatModel;
        SortOn = 'MKISTAT_LM_DATE_TIME';
      } else if (table == 'TRD') {
        model = this.trdModel;
        SortOn = 'TRD_LM_DATE_TIME';
      } else {
        throw new Error('No model found');
      }

      // Repeats until the table has no rows newer than the last migrated one.
      for (;;) {
        let rows: RowDataPacket[];
        try {
          [rows] = (await connection.execute(
            `SELECT * FROM ${table} WHERE ${SortOn} > '${LastData}' ORDER BY ${SortOn} LIMIT 50000`,
          )) as [RowDataPacket[], FieldPacket[]];
        } catch (error) {
          console.log('error in mdsdata', error);
          queryError = error;
          break;
        }

        if (Object.keys(rows).length == 0) {
          console.log(
            'Task Completed...For',
            table,
            ' at ',
            new Date().toLocaleString('sv-SE'),
          );
          break;
        }

        // console.time(`Writing_Time_to..${table}`);
        const result =
          table == 'TRD'
            ? await this.writeTrd(model, rows)
            : await this.writeBulk(table, model, rows);
        total += result.written;
        mongoError ??= result.error;
        // console.timeEnd(`Writing_Time_to..${table}`);

        LastData = rows.pop()[SortOn].toLocaleString('sv-SE'); // "sv-SE" Converting date formate
        // console.log('LastData .....', LastData);
        await this.lastDataService.setLastData({
          [fieldName]: LastData,
        }); //Saving last migrated data trace to DB.
      }
    } catch (error) {
      console.log('error in mdsdata', error);
      mongoError ??= error;
    }

    let failure: ClassifiedError | undefined;
    if (queryError) {
      failure = classifyMysqlError(queryError);
    } else if (mongoError) {
      const e = mongoError as { code?: unknown; name?: string };
      failure = {
        label: 'MongoDB write failed',
        detail: String(e?.code ?? e?.name ?? 'unknown'),
      };
    }
    const reporter = this.reporters[table];
    if (!failure || total > 0) await reporter.success(total);
    if (failure) await reporter.error(failure);
  }

  private async writeTrd(
    model: any,
    rows: RowDataPacket[],
  ): Promise<WriteResult> {
    const result: WriteResult = { written: 0 };
    console.log(
      'Writing to Collection ',
      'TRD',
      ' ',
      new Date().toLocaleString('sv-SE'),
    );

    for (const row of rows) {
      try {
        //!

        const existingDocument = await model.findOne({
          $expr: {
            $eq: [
              {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$TRD_LM_DATE_TIME',
                },
              },
              {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: row.TRD_LM_DATE_TIME,
                },
              },
            ],
          },
        });

        if (existingDocument) {
          // Perform update operation
          console.log('Updating into TRD...');
          await model.updateOne({ _id: existingDocument._id }, { $set: row });
        } else {
          // Perform insert operation
          console.log('Inserting into TRD....');

          await model.create(row);
        }
        result.written++;

        //!
      } catch (error) {
        console.log('Skiped duplicate in TRD', error);
        if (!isDuplicateError(error)) result.error ??= error;
      }
    }
    return result;
  }

  private async writeBulk(
    table: string,
    model: any,
    rows: RowDataPacket[],
  ): Promise<WriteResult> {
    try {
      console.log(
        'Writing to Collection ',
        table,
        ' ',
        new Date().toLocaleString('sv-SE'),
      );

      if (table === 'MAN') {
        const formattedRows = rows.map((row) => {
          const originalDate = row.MAN_ANNOUNCEMENT_DATE_TIME;

          let parsedDate: Date | null = null;

          // If already a valid Date
          if (originalDate instanceof Date) {
            parsedDate = originalDate;
          }

          // If the external service sends it as a string
          else if (typeof originalDate === 'string') {
            const cleanedDate = originalDate.replace(
              ' (Coordinated Universal Time)',
              '',
            );

            const date = new Date(cleanedDate);

            // Check if it was successfully converted
            if (!isNaN(date.getTime())) {
              parsedDate = date;
            }
          }

          return {
            ...row,

            // Keep the original value from the external service
            MAN_ANNOUNCEMENT_DATE_TIME_SOURCE: String(originalDate),

            // Save normalized MongoDB Date
            MAN_ANNOUNCEMENT_DATE_TIME: parsedDate,
          };
        });

        await model.insertMany(formattedRows, {
          ordered: false,
        });
      } else {
        await model.insertMany(rows, {
          ordered: false,
        });
      }
      return { written: rows.length };
    } catch (error) {
      console.log('Skiped duplicate in ', table);
      return {
        written: insertedBefore(error),
        error: isDuplicateError(error) ? undefined : error,
      };
    }
  }
}
