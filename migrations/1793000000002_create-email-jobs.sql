-- Up Migration
CREATE TABLE email_jobs (
  id                  SERIAL PRIMARY KEY,
  appointment_id      INTEGER REFERENCES appointments (id) ON DELETE SET NULL,
  to_email            TEXT NOT NULL,
  subject             TEXT NOT NULL,
  body_text           TEXT NOT NULL,
  body_html           TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sent', 'failed')),
  attempts            INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL,
  next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set while a worker holds the job, so a crashed worker's job can be picked up again.
  locked_at           TIMESTAMPTZ,
  last_error          TEXT,
  provider_message_id TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_jobs_due_idx ON email_jobs (next_attempt_at) WHERE status = 'pending';
CREATE INDEX email_jobs_status_idx ON email_jobs (status, created_at DESC);

-- Down Migration
DROP TABLE email_jobs;
