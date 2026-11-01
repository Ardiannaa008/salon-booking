import type { EmailJobRepository } from '../data/emailJobRepository.js';
import type { EmailJob, EmailJobStatus } from '../models/emailJob.js';
import type { EmailSender } from './email/emailSender.js';
import { NotFoundError } from './errors.js';

const MAX_ERROR_LENGTH = 500;

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

export class EmailJobService {
  constructor(
    private readonly jobs: Pick<
      EmailJobRepository,
      'claimDue' | 'markSent' | 'scheduleRetry' | 'markFailed' | 'findById' | 'list'
    >,
    private readonly sender: EmailSender,
    private readonly retryDelaysSeconds: number[],
  ) {}

  list(status: EmailJobStatus | undefined, limit: number): Promise<EmailJob[]> {
    return this.jobs.list(status, limit);
  }

  async get(id: number): Promise<EmailJob> {
    const job = await this.jobs.findById(id);
    if (!job) {
      throw new NotFoundError('That email job does not exist.');
    }
    return job;
  }

  /** Called by the worker. Returns how many jobs it picked up. */
  async processDueJobs(batchSize: number): Promise<number> {
    const jobs = await this.jobs.claimDue(batchSize);
    for (const job of jobs) {
      try {
        await this.processJob(job);
      } catch (error) {
        // The status update failed, for example because the database went away. The lock
        // expires and the job runs again, and the idempotency key stops a duplicate email.
        console.error(`Could not update email job ${job.id}:`, describeError(error));
      }
    }
    return jobs.length;
  }

  private async processJob(job: EmailJob): Promise<void> {
    // A worker crashed mid-send on the final attempt, so this claim went over the limit.
    if (job.attempts > job.maxAttempts) {
      await this.jobs.markFailed(job.id, job.lastError ?? 'Worker stopped during the final attempt');
      return;
    }

    let providerMessageId: string;
    try {
      ({ id: providerMessageId } = await this.sender.send(job));
    } catch (error) {
      await this.handleFailure(job, describeError(error));
      return;
    }

    await this.jobs.markSent(job.id, providerMessageId);
    console.log(`Email job ${job.id} sent on attempt ${job.attempts}`);
  }

  private async handleFailure(job: EmailJob, error: string): Promise<void> {
    if (job.attempts >= job.maxAttempts) {
      await this.jobs.markFailed(job.id, error);
      console.error(`Email job ${job.id} failed after ${job.attempts} attempts: ${error}`);
      return;
    }

    const delaySeconds = this.retryDelayFor(job.attempts);
    await this.jobs.scheduleRetry(job.id, delaySeconds, error);
    console.warn(`Email job ${job.id} attempt ${job.attempts} failed, retrying in ${delaySeconds}s: ${error}`);
  }

  private retryDelayFor(attempt: number): number {
    const delays = this.retryDelaysSeconds;
    return delays[Math.min(attempt - 1, delays.length - 1)] ?? 60;
  }
}
