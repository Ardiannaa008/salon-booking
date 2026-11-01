// Wires the layers together. This is the only file that knows about all of them.
import type { AppConfig } from './config.js';
import { AppointmentRepository } from './data/appointmentRepository.js';
import { EmailJobRepository } from './data/emailJobRepository.js';
import { HealthRepository } from './data/healthRepository.js';
import { createPool } from './data/pool.js';
import { SalonServiceRepository } from './data/salonServiceRepository.js';
import { BookingService } from './services/bookingService.js';
import { CatalogService } from './services/catalogService.js';
import type { EmailSender } from './services/email/emailSender.js';
import { FakeEmailSender } from './services/email/fakeEmailSender.js';
import { ResendEmailSender } from './services/email/resendEmailSender.js';
import { EmailJobService } from './services/emailJobService.js';
import { HealthService } from './services/healthService.js';

function createEmailSender(config: AppConfig): EmailSender {
  return config.email.provider === 'fake'
    ? new FakeEmailSender(config.email.fakeFailAttempts)
    : new ResendEmailSender(config.email.resendApiKey, config.email.from);
}

export function createContainer(config: AppConfig) {
  const pool = createPool(config.databaseUrl);

  const appointments = new AppointmentRepository(pool);
  const emailJobs = new EmailJobRepository(pool);
  const salonServices = new SalonServiceRepository(pool);

  return {
    services: {
      booking: new BookingService(appointments, salonServices, {
        salonName: config.salon.name,
        timeZone: config.salon.timeZone,
        maxEmailAttempts: 1 + config.email.maxRetries,
      }),
      catalog: new CatalogService(salonServices),
      emailJobs: new EmailJobService(emailJobs, createEmailSender(config), config.email.retryDelaysSeconds),
      health: new HealthService(new HealthRepository(pool), emailJobs),
    },
    close: () => pool.end(),
  };
}

export type AppServices = ReturnType<typeof createContainer>['services'];
