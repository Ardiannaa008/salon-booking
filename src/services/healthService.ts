import type { EmailJobRepository } from '../data/emailJobRepository.js';
import type { HealthRepository } from '../data/healthRepository.js';
import type { EmailJobCounts } from '../models/emailJob.js';
import type { HealthReport } from '../models/health.js';

export class HealthService {
  constructor(
    private readonly health: Pick<HealthRepository, 'ping'>,
    private readonly jobs: Pick<EmailJobRepository, 'countByStatus'>,
  ) {}

  async check(): Promise<HealthReport> {
    const app = { status: 'ok' as const, uptimeSeconds: Math.round(process.uptime()) };

    try {
      await this.health.ping();
    } catch {
      return { status: 'error', app, database: { status: 'unreachable' }, emailQueue: null };
    }

    return { status: 'ok', app, database: { status: 'ok' }, emailQueue: await this.queueCounts() };
  }

  private async queueCounts(): Promise<EmailJobCounts | null> {
    try {
      return await this.jobs.countByStatus();
    } catch {
      return null;
    }
  }
}
