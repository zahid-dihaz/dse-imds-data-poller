import 'dotenv/config';
import { createTransport } from 'nodemailer';

import { NotifyResult } from './notify.types';

const TIMEOUT_MS = 10000;

/**
 * Emails `text` to ALERT_EMAIL_TO (comma-separated list allowed) over SMTP.
 * Optional and best-effort: a no-op unless every SMTP_* / ALERT_EMAIL_* var is
 * set, and it never throws, so an alert failure cannot break the watchdog.
 */
export async function notifyEmail(text: string): Promise<NotifyResult> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const from = process.env.ALERT_EMAIL_FROM;
  const to = process.env.ALERT_EMAIL_TO;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !from || !to) {
    return { status: 'skipped' };
  }
  try {
    const port = Number(SMTP_PORT);
    const transport = createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
    await transport.sendMail({
      from,
      to,
      subject: text.split('\n')[0],
      text,
    });
    return { status: 'sent' };
  } catch (err: any) {
    // Keep the error name/code only: the message may echo credentials.
    const error = String(err?.code ?? err?.name ?? err);
    console.error(`[email] sendMail failed: ${error}`);
    return { status: 'failed', error };
  }
}
