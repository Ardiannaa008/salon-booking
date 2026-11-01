import type pg from 'pg';
import type { Appointment, NewAppointment } from '../models/appointment.js';
import type { NewEmailJob } from '../models/emailJob.js';
import { insertEmailJob, type InsertedEmailJob } from './emailJobRepository.js';

const UNIQUE_VIOLATION = '23505';

interface AppointmentRow {
  id: number;
  service_id: number;
  service_name: string;
  customer_name: string;
  customer_email: string;
  appointment_date: string;
  start_hour: number;
  created_at: Date;
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    date: row.appointment_date,
    startHour: row.start_hour,
    createdAt: row.created_at.toISOString(),
  };
}

export class AppointmentRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listTakenHours(date: string): Promise<number[]> {
    const { rows } = await this.pool.query<{ start_hour: number }>(
      'SELECT start_hour FROM appointments WHERE appointment_date = $1',
      [date],
    );
    return rows.map((row) => row.start_hour);
  }

  async list(limit: number): Promise<Appointment[]> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT a.id, a.service_id, s.name AS service_name, a.customer_name, a.customer_email,
              a.appointment_date::text AS appointment_date, a.start_hour, a.created_at
       FROM appointments a
       JOIN salon_services s ON s.id = a.service_id
       ORDER BY a.appointment_date DESC, a.start_hour DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map(toAppointment);
  }

  /**
   * Saves the appointment and its email job in one transaction, so a booking can
   * never exist without its email, or the other way round.
   * Returns null when the slot is already taken.
   */
  async createWithEmailJob(
    appointment: NewAppointment,
    buildJob: (appointmentId: number) => NewEmailJob,
  ): Promise<{ appointmentId: number; emailJob: InsertedEmailJob } | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO appointments (service_id, customer_name, customer_email, appointment_date, start_hour)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          appointment.serviceId,
          appointment.customerName,
          appointment.customerEmail,
          appointment.date,
          appointment.startHour,
        ],
      );
      const appointmentId = rows[0]!.id;
      const emailJob = await insertEmailJob(client, buildJob(appointmentId), appointmentId);
      await client.query('COMMIT');
      return { appointmentId, emailJob };
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        return null;
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
