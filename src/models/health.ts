import type { EmailJobCounts } from './emailJob.js';

export interface HealthReport {
  status: 'ok' | 'error';
  app: { status: 'ok'; uptimeSeconds: number };
  database: { status: 'ok' | 'unreachable' };
  /** Extra information only. It never changes the health status. */
  emailQueue: EmailJobCounts | null;
}
