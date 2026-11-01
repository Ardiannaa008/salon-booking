import type { EmailJob } from '../../models/emailJob.js';

export interface EmailSender {
  /** Sends the job's email and returns the provider's message id. Throws on failure. */
  send(job: EmailJob): Promise<{ id: string }>;
}
