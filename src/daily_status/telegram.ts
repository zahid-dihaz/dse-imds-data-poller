import 'dotenv/config';

import { NotifyResult } from './notify.types';

const TIMEOUT_MS = 5000;

/**
 * Sends `text` to the configured Telegram chat. Optional and best-effort: a
 * no-op without TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID, and it never throws, so
 * an alert failure cannot break the watchdog or finalizer.
 */
export async function notifyTelegram(text: string): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { status: 'skipped' };
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      // Log the status only: the URL contains the bot token.
      console.error(`[telegram] sendMessage failed: HTTP ${res.status}`);
      return { status: 'failed', error: `HTTP ${res.status}` };
    }
    return { status: 'sent' };
  } catch (err: any) {
    const error = String(err?.name ?? err);
    console.error(`[telegram] sendMessage failed: ${error}`);
    return { status: 'failed', error };
  }
}
