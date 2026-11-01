import { Router } from 'express';
import type { BookingService } from '../../services/bookingService.js';
import type { CatalogService } from '../../services/catalogService.js';
import { availabilityQuery } from '../schemas.js';

export function catalogRoutes(catalog: CatalogService, booking: BookingService): Router {
  const router = Router();

  router.get('/services', async (_req, res) => {
    res.json({ services: await catalog.listServices() });
  });

  router.get('/availability', async (req, res) => {
    const { date } = availabilityQuery.parse(req.query);
    res.json(await booking.getAvailability(date));
  });

  return router;
}
