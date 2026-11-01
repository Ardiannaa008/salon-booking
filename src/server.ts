import { createApp } from './api/app.js';
import { loadConfig } from './config.js';
import { createContainer } from './container.js';
import { EmailWorker } from './worker/emailWorker.js';

const config = loadConfig();
const container = createContainer(config);

const app = createApp(container.services, {
  adminPassword: config.adminPassword,
  bookingRateLimitMax: config.bookingRateLimitMax,
});

const server = app.listen(config.port, () => {
  console.log(`Salon booking app listening on port ${config.port}`);
});

// On by default so one deployment runs everything, which also suits hosts with one free service.
const worker = config.worker.startWithServer
  ? new EmailWorker(container.services.emailJobs, config.worker.pollIntervalMs)
  : null;
worker?.start();

async function shutdown(): Promise<void> {
  server.close();
  await worker?.stop();
  await container.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
