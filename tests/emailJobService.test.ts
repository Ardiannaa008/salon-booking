import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { EmailJob } from '../src/models/emailJob.js';
import { FakeEmailSender } from '../src/services/email/fakeEmailSender.js';
import { EmailJobService } from '../src/services/emailJobService.js';

function job(attempts: number): EmailJob {
  return {
    id: 1,
    appointmentId: 1,
    to: 'ana@example.com',
    subject: 'Subject',
    bodyText: 'Body',
    bodyHtml: '<p>Body</p>',
    status: 'pending',
    attempts,
    maxAttempts: 4,
    nextAttemptAt: new Date().toISOString(),
    lastError: null,
    providerMessageId: null,
    sentAt: null,
    createdAt: new Date().toISOString(),
  };
}

function run(attempts: number, failAttempts: number) {
  const events: string[] = [];
  const service = new EmailJobService(
    {
      claimDue: async () => [job(attempts)],
      markSent: async (_id, messageId) => void events.push(`sent:${messageId}`),
      scheduleRetry: async (_id, delay) => void events.push(`retry:${delay}`),
      markFailed: async () => void events.push('failed'),
      findById: async () => null,
      list: async () => [],
    },
    new FakeEmailSender(failAttempts),
    [60, 300, 900],
  );
  return service.processDueJobs(10).then(() => events);
}

describe('email job processing', () => {
  test('marks the job sent when sending works', async () => {
    assert.deepEqual(await run(1, 0), ['sent:fake-1']);
  });

  test('retries each failure with a longer delay', async () => {
    assert.deepEqual(await run(1, 99), ['retry:60']);
    assert.deepEqual(await run(2, 99), ['retry:300']);
    assert.deepEqual(await run(3, 99), ['retry:900']);
  });

  test('marks the job failed once the 3 retries are used up', async () => {
    assert.deepEqual(await run(4, 99), ['failed']);
  });

  test('succeeds on a retry after earlier failures', async () => {
    assert.deepEqual(await run(3, 2), ['sent:fake-1']);
  });

  test('marks the job failed when a crashed worker pushed it past the limit', async () => {
    assert.deepEqual(await run(5, 0), ['failed']);
  });
});
