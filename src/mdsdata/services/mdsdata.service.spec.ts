import * as mysql from 'mysql2/promise';
import { MdsdataService } from './mdsdata.service';

jest.mock('mysql2/promise', () => ({ createConnection: jest.fn() }));

const createConnection = mysql.createConnection as unknown as jest.Mock;

// 12:14 Dhaka on a trading day
const row = (n: number) => ({
  IDX_DATE_TIME: new Date(Date.UTC(2026, 9, 7, 6, n)),
});

function build() {
  const models: Record<string, any> = {};
  for (const name of ['idx', 'trd', 'mkistat', 'man']) {
    models[name] = {
      insertMany: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
    };
  }
  const lastData = {
    getLastData: jest
      .fn()
      .mockResolvedValue([
        {
          IDXLastData: '0',
          MANLastData: '0',
          MKISTATLastData: '0',
          TRDLastData: '0',
        },
      ]),
    setLastData: jest.fn().mockResolvedValue(undefined),
  };
  const status = {
    initDay: jest.fn().mockResolvedValue(true),
    recordSuccess: jest.fn().mockResolvedValue(undefined),
    recordError: jest.fn().mockResolvedValue(undefined),
    recordRecovery: jest.fn().mockResolvedValue(undefined),
  };
  const hours = { inReportingWindow: jest.fn().mockResolvedValue(true) };
  const service = new MdsdataService(
    models.idx,
    models.trd,
    models.mkistat,
    models.man,
    lastData as any,
    status as any,
    hours as any,
  );
  return { service, models, lastData, status, hours };
}

/** execute() answers per table from a script of batches; [] ends the table. */
function fakeConnection(
  script: Record<string, any[][]>,
  fail?: Record<string, any>,
) {
  const queue = Object.fromEntries(
    Object.entries(script).map(([k, v]) => [k, [...v]]),
  );
  let ended = false;
  const connection = {
    execute: jest.fn(async (sql: string) => {
      if (ended)
        throw new Error(
          "Can't add new command when connection is in closed state",
        );
      const table = sql.match(/FROM (\w+)/)![1];
      if (fail?.[table]) throw fail[table];
      return [queue[table]?.shift() ?? [], []];
    }),
    end: jest.fn(async () => {
      ended = true;
    }),
  };
  return connection;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('MdsdataService.readAll', () => {
  it('pages through every batch before closing the connection', async () => {
    const { service, models, lastData, status } = build();
    const connection = fakeConnection({
      IDX: [[row(14), row(15)], [row(16)], []],
      MKISTAT: [[]],
      MAN: [[]],
      TRD: [[]],
    });
    createConnection.mockResolvedValue(connection);

    await service.readAll();

    expect(models.idx.insertMany).toHaveBeenCalledTimes(2);
    expect(lastData.setLastData).toHaveBeenCalledTimes(2);
    expect(connection.end).toHaveBeenCalledTimes(1);
    // every execute() happened before end()
    const lastExec = Math.max(...connection.execute.mock.invocationCallOrder);
    expect(lastExec).toBeLessThan(connection.end.mock.invocationCallOrder[0]);
    expect(status.recordSuccess).toHaveBeenCalledWith('/idx', 3);
    expect(status.recordSuccess).toHaveBeenCalledWith('/trd', 0);
    expect(status.recordError).not.toHaveBeenCalled();
  });

  it('writes TRD rows by insert or update and counts them', async () => {
    const { service, models, status } = build();
    models.trd.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 1 });
    createConnection.mockResolvedValue(
      fakeConnection({
        TRD: [
          [{ TRD_LM_DATE_TIME: new Date() }, { TRD_LM_DATE_TIME: new Date() }],
          [],
        ],
      }),
    );
    await service.readAll();
    expect(models.trd.create).toHaveBeenCalledTimes(1);
    expect(models.trd.updateOne).toHaveBeenCalledTimes(1);
    expect(status.recordSuccess).toHaveBeenCalledWith('/trd', 2);
  });

  it('duplicates are skipped silently and still count as a successful poll', async () => {
    const { service, models, status } = build();
    models.idx.insertMany.mockRejectedValue(
      Object.assign(new Error('dup'), {
        code: 11000,
        result: { insertedCount: 1 },
      }),
    );
    createConnection.mockResolvedValue(
      fakeConnection({ IDX: [[row(14), row(15)], []] }),
    );
    await service.readAll();
    expect(status.recordSuccess).toHaveBeenCalledWith('/idx', 1);
    expect(status.recordError).not.toHaveBeenCalled();
  });

  it('a non-duplicate Mongo write failure is reported', async () => {
    const { service, models, status } = build();
    models.idx.insertMany.mockRejectedValue(
      Object.assign(new Error('boom'), { code: 91 }),
    );
    createConnection.mockResolvedValue(
      fakeConnection({ IDX: [[row(14)], []] }),
    );
    await service.readAll();
    expect(status.recordError).toHaveBeenCalledWith(
      '/idx',
      'MongoDB write failed',
      '91',
    );
  });

  it('a MySQL connection drop is reported on that endpoint only', async () => {
    const { service, status } = build();
    createConnection.mockResolvedValue(
      fakeConnection(
        { MKISTAT: [[]], MAN: [[]], TRD: [[]] },
        {
          IDX: Object.assign(new Error('lost'), {
            code: 'PROTOCOL_CONNECTION_LOST',
          }),
        },
      ),
    );
    await service.readAll();
    expect(status.recordError).toHaveBeenCalledTimes(1);
    expect(status.recordError).toHaveBeenCalledWith(
      '/idx',
      'MySQL connection lost',
      'PROTOCOL_CONNECTION_LOST',
    );
    expect(status.recordSuccess).not.toHaveBeenCalledWith(
      '/idx',
      expect.anything(),
    );
  });

  it('a query error is reported as a query failure', async () => {
    const { service, status } = build();
    createConnection.mockResolvedValue(
      fakeConnection(
        { IDX: [[]], MAN: [[]], TRD: [[]] },
        {
          MKISTAT: Object.assign(new Error('bad'), {
            code: 'ER_BAD_FIELD_ERROR',
          }),
        },
      ),
    );
    await service.readAll();
    expect(status.recordError).toHaveBeenCalledWith(
      '/mkistat',
      'MySQL query failed',
      'ER_BAD_FIELD_ERROR',
    );
  });

  it('a failed connect marks all four endpoints', async () => {
    const { service, status } = build();
    createConnection.mockRejectedValue(
      Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }),
    );
    await service.readAll();
    expect(status.recordError.mock.calls.map((c) => c[0]).sort()).toEqual([
      '/idx',
      '/man',
      '/mkistat',
      '/trd',
    ]);
    expect(status.recordError).toHaveBeenCalledWith(
      expect.any(String),
      'MySQL connection lost',
      'ECONNREFUSED',
    );
  });

  it('initialises the day at the start of a poll inside the session window', async () => {
    const { service, status, hours } = build();
    createConnection.mockResolvedValue(fakeConnection({}));
    await service.readAll();
    expect(status.initDay).toHaveBeenCalledTimes(1);

    status.initDay.mockClear();
    hours.inReportingWindow.mockResolvedValue(false);
    await service.readAll();
    expect(status.initDay).not.toHaveBeenCalled();
  });
});
