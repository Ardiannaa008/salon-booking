import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { BookingService } from '../../services/bookingService.js';
import type { RateLimitKey } from '../middleware/rateLimitKey.js';
import { createAppointmentBody, listAppointmentsQuery } from '../schemas.js';

export function appointmentRoutes(
  booking: BookingService,
  requireAdmin: RequestHandler,
  bookingRateLimitMax: number,
  rateLimitKey: RateLimitKey,
): Router {
  const router = Router();

  // The form is public and emails whatever address is entered, so limit how often it can be used.
  const limitBookings = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: bookingRateLimitMax,
    keyGenerator: rateLimitKey,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many bookings from this connection. Please try again later.' },
  });

  router.post('/appointments', limitBookings, async (req, res) => {
    const body = createAppointmentBody.parse(req.body);
    const result = await booking.book(body);
    // 201: the booking is saved. The email itself is still only queued at this point.
    res.status(201).json(result);
  });

  router.get('/appointments', requireAdmin, async (req, res) => {
    const { limit } = listAppointmentsQuery.parse(req.query);
    res.json({ appointments: await booking.listAppointments(limit) });
  });

  return router;
}
