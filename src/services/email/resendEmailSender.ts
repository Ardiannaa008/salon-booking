import { Resend } from 'resend';
import type { EmailJob } from '../../models/emailJob.js';
import type { EmailSender } from './emailSender.js';

export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async send(job: EmailJob): Promise<{ id: string }> {
    const { data, error } = await this.resend.emails.send(
      {
        from: this.from,
        to: job.to,
        subject: job.subject,
        text: job.bodyText,
        html: job.bodyHtml,
      },
      // Stops a duplicate email if the worker crashes after sending but before saving "sent".
      { idempotencyKey: `email-job-${job.id}` },
    );

    if (error) {
      throw new Error(`Resend ${error.statusCode ?? 'error'} ${error.name}: ${error.message}`);
    }
    return { id: data.id };
  }
}
