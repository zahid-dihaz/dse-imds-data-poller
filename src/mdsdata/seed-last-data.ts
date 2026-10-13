// Set before any date is formatted: marks must be Dhaka wall-clock strings,
// exactly as MdsdataService writes them.
process.env.TZ = 'Asia/Dhaka';

import { connectMongo } from '../daily_status/mongo';

// Seeds the `lastdatas` marks from data already stored in Mongo, so the first
// MySQL poll resumes where the previous one stopped instead of re-reading
// every table from '0'.
//
//   MONGO_URI=<target db> node dist/mdsdata/seed-last-data            # dry run
//   MONGO_URI=<target db> node dist/mdsdata/seed-last-data --write    # apply
//
// A mark is only ever moved forward; marks that are already ahead are kept.

const SOURCES = [
  { mark: 'IDXLastData', collection: 'idx_mds', field: 'IDX_DATE_TIME' },
  { mark: 'TRDLastData', collection: 'trd_mds', field: 'TRD_LM_DATE_TIME' },
  {
    mark: 'MANLastData',
    collection: 'man_mds',
    field: 'MAN_ANNOUNCEMENT_DATE_TIME',
  },
  {
    mark: 'MKISTATLastData',
    collection: 'mkistat_mds',
    field: 'MKISTAT_LM_DATE_TIME',
  },
];

const DEFAULT_MARKS = {
  companiesLastData: '0',
  circuit_breaksLastData: '0',
  IDXLastData: '0',
  MANLastData: '0',
  MKISTATLastData: '0',
  TRDLastData: '0',
  price_earningsLastData: '0',
};

/** Same format the poller stores and compares against ("sv-SE", Dhaka time). */
export const formatMark = (date: Date) => date.toLocaleString('sv-SE');

async function main() {
  const write = process.argv.includes('--write');
  const conn = await connectMongo();
  try {
    const db = conn.db;
    console.log(
      `Database: ${db.databaseName} (${write ? 'WRITE' : 'dry run'})`,
    );
    const lastdatas = db.collection<any>('lastdatas');
    const current: any = (await lastdatas.findOne({})) ?? {};

    const updates: Record<string, string> = {};
    for (const { mark, collection, field } of SOURCES) {
      const [top] = await db
        .collection(collection)
        .aggregate([
          { $match: { [field]: { $type: 'date' } } },
          { $group: { _id: null, max: { $max: `$${field}` }, n: { $sum: 1 } } },
        ])
        .toArray();
      const existing = current[mark] ?? '0';
      if (!top) {
        console.log(
          `${mark.padEnd(
            16,
          )} ${collection}: no dated documents; keeping ${existing}`,
        );
        continue;
      }
      const candidate = formatMark(top.max);
      // "YYYY-MM-DD HH:mm:ss" strings sort chronologically; '0' sorts lowest.
      const next = candidate > existing ? candidate : existing;
      console.log(
        `${mark.padEnd(16)} ${collection}: ${
          top.n
        } docs, newest ${candidate}; ` +
          `current ${existing} -> ${next}${
            next === existing ? ' (unchanged)' : ''
          }`,
      );
      if (next !== existing) updates[mark] = next;
    }

    if (!Object.keys(updates).length) return console.log('Nothing to change.');
    if (!write)
      return console.log('Dry run only. Re-run with --write to apply.');
    // Same upsert the poller uses; fields that are missing get the '0' default.
    const base = lastdatas ? { ...DEFAULT_MARKS, ...current } : DEFAULT_MARKS;
    delete base._id;
    await lastdatas.updateOne(
      {},
      { $set: { ...base, ...updates } },
      { upsert: true },
    );
    console.log('lastdatas updated.');
  } finally {
    await conn.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`seed-last-data failed: ${err}`);
    process.exit(1);
  });
}
