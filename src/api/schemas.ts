import { z } from 'zod';
import { EMAIL_JOB_STATUSES } from '../models/emailJob.js';

const MAX_LIST_LIMIT = 200;

const limit = z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).default(50);

export const idParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const availabilityQuery = z.object({
  date: z.iso.date(),
});

export const createAppointmentBody = z.object({
  serviceId: z.number().int().positive(),
  // Names only, with no digits or symbols, so this field can't carry a link into the
  // email that goes to whatever address was entered.
  customerName: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[\p{L}\p{M} .'-]+$/u, 'may only contain letters, spaces, and . \' -'),
  customerEmail: z.email().max(254).toLowerCase(),
  date: z.iso.date(),
  startHour: z.number().int().min(0).max(23),
});

export const listAppointmentsQuery = z.object({ limit });

export const listEmailJobsQuery = z.object({
  status: z.enum(EMAIL_JOB_STATUSES).optional(),
  limit,
});
