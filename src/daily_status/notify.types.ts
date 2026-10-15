export interface NotifyResult {
  status: 'sent' | 'failed' | 'skipped'; // skipped = channel not configured
  error?: string;
}
