import { Connection } from 'mongoose';

export const ERROR_COLLECTION = 'poll_error_log';

export interface PollErrorEntry {
  table: string;
  stage: string; // e.g. 'query', 'write-row', 'write-bulk', 'migrate'
  error: unknown;
  context?: Record<string, unknown>;
}

/**
 * Prints the error and records it in poll_error_log. Never throws, so a
 * logging failure cannot break (or hide) the poll that is reporting it.
 */
export async function recordPollError(
  entry: PollErrorEntry,
  conn?: Connection,
  now: () => Date = () => new Date(),
): Promise<void> {
  const e = entry.error as
    | { message?: string; code?: unknown; name?: string; stack?: string }
    | undefined;
  console.error(
    `[poll-error] ${entry.table}/${entry.stage}:`,
    entry.context ?? '',
    entry.error,
  );
  if (!conn || conn.readyState !== 1 || !conn.db) return;
  try {
    await conn.db.collection(ERROR_COLLECTION).insertOne({
      table: entry.table,
      stage: entry.stage,
      message: e?.message ?? String(entry.error),
      name: e?.name,
      code: e?.code !== undefined ? String(e.code) : undefined,
      stack: e?.stack,
      context: entry.context,
      occurred_at: now(),
    });
  } catch (err) {
    console.error(`[poll-error] could not record ${ERROR_COLLECTION}: ${err}`);
  }
}
