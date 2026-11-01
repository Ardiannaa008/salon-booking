import type { AppointmentRepository } from '../data/appointmentRepository.js';
import type { SalonServiceRepository } from '../data/salonServiceRepository.js';
import type { Appointment, Availability, NewAppointment } from '../models/appointment.js';
import type { EmailJobStatus } from '../models/emailJob.js';
import { buildConfirmationEmail } from './email/confirmationEmail.js';
import { BookingRuleError, NotFoundError, SlotTakenError } from './errors.js';
import {
  MAX_DAYS_AHEAD,
  formatHour,
  isOpenOn,
  isSlotInPast,
  isTooFarAhead,
  salonNow,
  slotHours,
} from './salonCalendar.js';

export interface BookingResult {
  appointmentId: number;
  emailJob: { id: number; status: EmailJobStatus };
}

export interface BookingOptions {
  salonName: string;
  timeZone: string;
  /** One first attempt plus the retries. */
  maxEmailAttempts: number;
  now?: () => Date;
}

export class BookingService {
  private readonly now: () => Date;

  constructor(
    private readonly appointments: Pick<AppointmentRepository, 'listTakenHours' | 'list' | 'createWithEmailJob'>,
    private readonly salonServices: Pick<SalonServiceRepository, 'findById'>,
    private readonly options: BookingOptions,
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async getAvailability(date: string): Promise<Availability> {
    const now = salonNow(this.now(), this.options.timeZone);
    if (!isOpenOn(date) || isTooFarAhead(date, now)) {
      return { date, open: false, slots: [] };
    }

    const taken = new Set(await this.appointments.listTakenHours(date));
    return {
      date,
      open: true,
      slots: slotHours().map((hour) => ({
        startHour: hour,
        label: formatHour(hour),
        available: !taken.has(hour) && !isSlotInPast(date, hour, now),
      })),
    };
  }

  /** Saves the booking and queues its confirmation. It never sends the email itself. */
  async book(request: NewAppointment): Promise<BookingResult> {
    this.assertSlotIsBookable(request.date, request.startHour);

    const service = await this.salonServices.findById(request.serviceId);
    if (!service) {
      throw new NotFoundError('That service does not exist.');
    }

    const created = await this.appointments.createWithEmailJob(request, () => ({
      ...buildConfirmationEmail({
        salonName: this.options.salonName,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        serviceName: service.name,
        date: request.date,
        startHour: request.startHour,
      }),
      maxAttempts: this.options.maxEmailAttempts,
    }));

    if (!created) {
      throw new SlotTakenError('That time was just booked. Please choose another one.');
    }
    return created;
  }

  listAppointments(limit: number): Promise<Appointment[]> {
    return this.appointments.list(limit);
  }

  private assertSlotIsBookable(date: string, startHour: number): void {
    const now = salonNow(this.now(), this.options.timeZone);
    if (!isOpenOn(date)) {
      throw new BookingRuleError('The salon is closed on Sundays.');
    }
    if (!slotHours().includes(startHour)) {
      throw new BookingRuleError('That time is outside opening hours.');
    }
    if (isSlotInPast(date, startHour, now)) {
      throw new BookingRuleError('That time has already passed.');
    }
    if (isTooFarAhead(date, now)) {
      throw new BookingRuleError(`Bookings open ${MAX_DAYS_AHEAD} days in advance.`);
    }
  }
}
