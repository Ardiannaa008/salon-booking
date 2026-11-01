export const EMAIL_JOB_STATUSES = ['pending', 'sent', 'failed'] as const;

export type EmailJobStatus = (typeof EMAIL_JOB_STATUSES)[number];

export interface EmailJob {
  id: number;
  appointmentId: number | null;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  providerMessageId: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NewEmailJob {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  maxAttempts: number;
}

export type EmailJobCounts = Record<EmailJobStatus, number>;
