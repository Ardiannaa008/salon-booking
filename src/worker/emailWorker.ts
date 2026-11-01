import type { EmailJobService } from '../services/emailJobService.js';

const BATCH_SIZE = 10;

/** Polls the database for due email jobs and hands them to the service layer. */
export class EmailWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private currentRun: Promise<void> = Promise.resolve();

  constructor(
    private readonly emailJobs: Pick<EmailJobService, 'processDueJobs'>,
    private readonly pollIntervalMs: number,
  ) {}

  start(): void {
    this.running = true;
    console.log(`Email worker started, polling every ${this.pollIntervalMs}ms`);
    this.schedule(0);
  }

  /** Stops polling and waits for the batch in progress to finish. */
  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    await this.currentRun;
  }

  private schedule(delayMs: number): void {
    this.timer = setTimeout(() => {
      this.currentRun = this.tick();
    }, delayMs);
  }

  private async tick(): Promise<void> {
    let processed = 0;
    try {
      processed = await this.emailJobs.processDueJobs(BATCH_SIZE);
    } catch (error) {
      // Usually the database being down. Keep polling so the worker recovers by itself.
      console.error('Email worker could not fetch jobs:', error instanceof Error ? error.message : error);
    }

    if (this.running) {
      // A full batch means more jobs are probably waiting, so go again straight away.
      this.schedule(processed === BATCH_SIZE ? 0 : this.pollIntervalMs);
    }
  }
}
