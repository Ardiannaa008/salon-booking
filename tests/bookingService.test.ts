import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { NewEmailJob } from '../src/models/emailJob.js';
import { BookingService } from '../src/services/bookingService.js';
import { BookingRuleError, NotFoundError, SlotTakenError } from '../src/services/errors.js';

// Wednesday 2 December 2026, 11:30 in UTC.
const NOW = new Date('2026-12-02T11:30:00Z');
const FUTURE_DATE = '2026-12-03';
const SUNDAY = '2026-12-06';

function createService(options: { taken?: number[]; slotIsFree?: boolean } = {}) {
  const queued: NewEmailJob[] = [];
  const service = new BookingService(
    {
      listTakenHours: async () => options.taken ?? [],
      list: async () => [],
      createWithEmailJob: async (_appointment, buildJob) => {
        if (options.slotIsFree === false) {
          return null;
        }
        queued.push(buildJob(1));
        return { appointmentId: 1, emailJob: { id: 7, status: 'pending' } };
      },
    },
    {
      findById: async (id) =>
        id === 1 ? { id: 1, name: 'Haircut', description: 'Cut', priceCents: 3000 } : null,
    },
    { salonName: 'Test Salon', timeZone: 'UTC', maxEmailAttempts: 4, now: () => NOW },
  );
  return { service, queued };
}

const request = {
  serviceId: 1,
  customerName: 'Ana Test',
  customerEmail: 'ana@example.com',
  date: FUTURE_DATE,
  startHour: 10,
};

describe('booking', () => {
  test('queues a pending confirmation email allowing 3 retries', async () => {
    const { service, queued } = createService();

    const result = await service.book(request);

    assert.equal(result.emailJob.status, 'pending');
    assert.equal(queued.length, 1);
    assert.equal(queued[0]!.to, 'ana@example.com');
    assert.equal(queued[0]!.maxAttempts, 4);
    assert.match(queued[0]!.bodyText, /Haircut/);
  });

  test('rejects a slot someone else already holds', async () => {
    const { service } = createService({ slotIsFree: false });
    await assert.rejects(service.book(request), SlotTakenError);
  });

  test('rejects an unknown service', async () => {
    const { service } = createService();
    await assert.rejects(service.book({ ...request, serviceId: 99 }), NotFoundError);
  });

  test('rejects Sundays, past times and times outside opening hours', async () => {
    const { service } = createService();
    await assert.rejects(service.book({ ...request, date: SUNDAY }), BookingRuleError);
    await assert.rejects(service.book({ ...request, date: '2026-12-02', startHour: 11 }), BookingRuleError);
    await assert.rejects(service.book({ ...request, startHour: 20 }), BookingRuleError);
  });
});

describe('availability', () => {
  test('marks taken and past slots as unavailable', async () => {
    const { service } = createService({ taken: [15] });

    const { open, slots } = await service.getAvailability('2026-12-02');

    assert.equal(open, true);
    const free = slots.filter((slot) => slot.available).map((slot) => slot.startHour);
    assert.deepEqual(free, [12, 13, 14, 16]);
  });

  test('is closed on Sundays', async () => {
    const { service } = createService();
    assert.deepEqual(await service.getAvailability(SUNDAY), { date: SUNDAY, open: false, slots: [] });
  });
});
