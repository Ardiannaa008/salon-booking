import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import type { BookingService } from '../services/bookingService.js';
import type { CatalogService } from '../services/catalogService.js';
import type { EmailJobService } from '../services/emailJobService.js';
import type { HealthService } from '../services/healthService.js';
import { createAdminAuth } from './middleware/adminAuth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { appointmentRoutes } from './routes/appointmentRoutes.js';
import { catalogRoutes } from './routes/catalogRoutes.js';
import { emailJobRoutes } from './routes/emailJobRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';

export interface ApiServices {
  booking: BookingService;
  catalog: CatalogService;
  emailJobs: EmailJobService;
  health: HealthService;
}

export interface ApiOptions {
  adminPassword: string;
  bookingRateLimitMax: number;
}

export function createApp(services: ApiServices, options: ApiOptions): express.Express {
  const app = express();
  const requireAdmin = createAdminAuth(options.adminPassword);

  // The app runs behind one proxy in production, and rate limits need the real visitor IP.
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.resolve('public')));

  app.use(healthRoutes(services.health));
  app.use(catalogRoutes(services.catalog, services.booking));
  app.use(appointmentRoutes(services.booking, requireAdmin, options.bookingRateLimitMax));
  app.use(emailJobRoutes(services.emailJobs, requireAdmin));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
