// Adds sample data. Safe to run more than once: services are upserted, and sample
// appointments are only added to an empty table.
// Seeded email jobs are already sent or failed, so the worker never emails these fake addresses.
import { createPool } from './pool.js';

const SERVICES = [
  { name: 'Haircut', description: 'Wash, cut and blow-dry', priceCents: 3000 },
  { name: 'Blow-dry & Styling', description: 'Wash and a styled finish', priceCents: 2500 },
  { name: 'Hair Colouring', description: 'Full colour with a gloss treatment', priceCents: 7000 },
  { name: 'Keratin Treatment', description: 'Smoothing treatment for frizz-free hair', priceCents: 9000 },
];

/** Returns the next dates (YYYY-MM-DD) that are not a Sunday, when the salon is closed. */
function nextOpenDates(count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  while (dates.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor.getUTCDay() !== 0) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
  }
  return dates;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const pool = createPool(databaseUrl);

try {
  for (const service of SERVICES) {
    await pool.query(
      `INSERT INTO salon_services (name, description, price_cents)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE
       SET description = EXCLUDED.description, price_cents = EXCLUDED.price_cents`,
      [service.name, service.description, service.priceCents],
    );
  }
  console.log(`Seeded ${SERVICES.length} services`);

  const { rows } = await pool.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM appointments');
  if (rows[0]!.count > 0) {
    console.log('Appointments already exist, skipping sample appointments');
  } else {
    const [firstDate, secondDate] = nextOpenDates(2);
    const samples = [
      { name: 'Sample Customer', email: 'sample.customer@example.com', date: firstDate, hour: 10, status: 'sent', error: null },
      { name: 'Another Customer', email: 'another.customer@example.com', date: secondDate, hour: 14, status: 'failed', error: 'Sample failure: provider unavailable' },
    ];

    for (const sample of samples) {
      const inserted = await pool.query<{ id: number }>(
        `INSERT INTO appointments (service_id, customer_name, customer_email, appointment_date, start_hour)
         VALUES ((SELECT id FROM salon_services WHERE name = 'Haircut'), $1, $2, $3, $4)
         RETURNING id`,
        [sample.name, sample.email, sample.date, sample.hour],
      );
      await pool.query(
        `INSERT INTO email_jobs (appointment_id, to_email, subject, body_text, body_html, status, attempts, max_attempts, last_error, sent_at)
         VALUES ($1, $2, 'Your appointment is confirmed', 'Sample email', '<p>Sample email</p>', $3, $4, 4, $5, $6)`,
        [
          inserted.rows[0]!.id,
          sample.email,
          sample.status,
          sample.status === 'sent' ? 1 : 4,
          sample.error,
          sample.status === 'sent' ? new Date() : null,
        ],
      );
    }
    console.log(`Seeded ${samples.length} sample appointments with email jobs`);
  }
} finally {
  await pool.end();
}
