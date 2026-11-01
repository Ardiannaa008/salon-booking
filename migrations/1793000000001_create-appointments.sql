-- Up Migration
CREATE TABLE appointments (
  id               SERIAL PRIMARY KEY,
  service_id       INTEGER NOT NULL REFERENCES salon_services (id),
  customer_name    TEXT NOT NULL,
  customer_email   TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  start_hour       SMALLINT NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The salon has one chair, so the database itself blocks double bookings.
  CONSTRAINT appointments_one_per_slot UNIQUE (appointment_date, start_hour)
);

-- Down Migration
DROP TABLE appointments;
