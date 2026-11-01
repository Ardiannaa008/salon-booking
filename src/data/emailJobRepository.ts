import type pg from 'pg';
import type { EmailJob, EmailJobCounts, EmailJobStatus, NewEmailJob } from '../models/emailJob.js';

/** How long a worker may hold a job before another worker can take it over. */
const LOCK_TIMEOUT = '5 minutes';

interface EmailJobRow {
  id: number;
  appointment_id: number | null;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  status: EmailJobStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: Date;
  last_error: string | null;
  provider_message_id: string | null;
  sent_at: Date | null;
  created_at: Date;
}

function toEmailJob(row: EmailJobRow): EmailJob {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    to: row.to_email,
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at.toISOString(),
    lastError: row.last_error,
    providerMessageId: row.provider_message_id,
    sentAt: row.sent_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export interface InsertedEmailJob {
  id: number;
  status: EmailJobStatus;
}

/** Takes a client so it can join the caller's transaction. */
export async function insertEmailJob(
  client: pg.ClientBase,
  job: NewEmailJob,
  appointmentId: number | null,
): Promise<InsertedEmailJob> {
  const { rows } = await client.query<InsertedEmailJob>(
    `INSERT INTO email_jobs (appointment_id, to_email, subject, body_text, body_html, max_attempts)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, status`,
    [appointmentId, job.to, job.subject, job.bodyText, job.bodyHtml, job.maxAttempts],
  );
  return rows[0]!;
}

export class EmailJobRepository {
  constructor(private readonly pool: pg.Pool) {}

  /**
   * Claims due jobs and counts the attempt. SKIP LOCKED means two workers running
   * at once can never claim the same job.
   */
  async claimDue(limit: number): Promise<EmailJob[]> {
    const { rows } = await this.pool.query<EmailJobRow>(
      `UPDATE email_jobs
       SET locked_at = now(), attempts = attempts + 1, updated_at = now()
       WHERE id IN (
         SELECT id FROM email_jobs
         WHERE status = 'pending'
           AND next_attempt_at <= now()
           AND (locked_at IS NULL OR locked_at < now() - $2::interval)
         ORDER BY next_attempt_at
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       RETURNING *`,
      [limit, LOCK_TIMEOUT],
    );
    return rows.map(toEmailJob);
  }

  async markSent(id: number, providerMessageId: string): Promise<void> {
    await this.pool.query(
      `UPDATE email_jobs
       SET status = 'sent', provider_message_id = $2, sent_at = now(), locked_at = NULL,
           last_error = NULL, updated_at = now()
       WHERE id = $1`,
      [id, providerMessageId],
    );
  }

  async scheduleRetry(id: number, delaySeconds: number, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE email_jobs
       SET next_attempt_at = now() + make_interval(secs => $2), locked_at = NULL,
           last_error = $3, updated_at = now()
       WHERE id = $1`,
      [id, delaySeconds, error],
    );
  }

  async markFailed(id: number, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE email_jobs
       SET status = 'failed', locked_at = NULL, last_error = $2, updated_at = now()
       WHERE id = $1`,
      [id, error],
    );
  }

  async findById(id: number): Promise<EmailJob | null> {
    const { rows } = await this.pool.query<EmailJobRow>('SELECT * FROM email_jobs WHERE id = $1', [id]);
    return rows[0] ? toEmailJob(rows[0]) : null;
  }

  async list(status: EmailJobStatus | undefined, limit: number): Promise<EmailJob[]> {
    const { rows } = await this.pool.query<EmailJobRow>(
      `SELECT * FROM email_jobs
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [status ?? null, limit],
    );
    return rows.map(toEmailJob);
  }

  async countByStatus(): Promise<EmailJobCounts> {
    const { rows } = await this.pool.query<{ status: EmailJobStatus; count: number }>(
      'SELECT status, COUNT(*)::int AS count FROM email_jobs GROUP BY status',
    );
    const counts: EmailJobCounts = { pending: 0, sent: 0, failed: 0 };
    for (const row of rows) {
      counts[row.status] = row.count;
    }
    return counts;
  }
}
