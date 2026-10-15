import { Connection } from 'mongoose';
import { notifyEmail } from './email';
import { notifyTelegram } from './telegram';
import { NotifyResult } from './notify.types';

export const NOTIFICATION_COLLECTION = 'notification_log';

/**
 * Sends `text` on every configured channel (one failing never blocks another)
 * and records each attempt in notification_log. Channels that are not
 * configured are not recorded. Never throws.
 */
export async function notifyAll(
  text: string,
  conn?: Connection,
  now: () => Date = () => new Date(),
): Promise<void> {
  const channels: [string, Promise<NotifyResult>][] = [
    ['telegram', notifyTelegram(text)],
    ['email', notifyEmail(text)],
  ];
  const results = await Promise.all(
    channels.map(async ([channel, p]) => {
      const r = await p.catch(
        (err): NotifyResult => ({ status: 'failed', error: String(err) }),
      );
      return { channel, r };
    }),
  );
  if (!conn || conn.readyState !== 1 || !conn.db) return;
  const docs = results
    .filter(({ r }) => r.status !== 'skipped')
    .map(({ channel, r }) => ({
      channel,
      status: r.status,
      ...(r.error ? { error: r.error } : {}),
      message: text,
      sent_at: now(),
    }));
  if (!docs.length) return;
  try {
    await conn.db.collection(NOTIFICATION_COLLECTION).insertMany(docs);
  } catch (err) {
    console.error(`[notify] could not record notification_log: ${err}`);
  }
}
