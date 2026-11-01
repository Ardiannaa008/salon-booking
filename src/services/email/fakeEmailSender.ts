import type { EmailJob } from '../../models/emailJob.js';
import type { EmailSender } from './emailSender.js';

/**
 * Sends nothing. Fails each job's first `failAttempts` attempts, so retries can be
 * shown on demand. Use a large number to see a job end up as failed.
 */
export class FakeEmailSender implements EmailSender {
  constructor(private readonly failAttempts: number) {}

  async send(job: EmailJob): Promise<{ id: string }> {
    if (job.attempts <= this.failAttempts) {
      throw new Error(`Simulated failure on attempt ${job.attempts}`);
    }
    return { id: `fake-${job.id}` };
  }
}
