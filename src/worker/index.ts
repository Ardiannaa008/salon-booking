// Runs the worker as its own process. Set START_WORKER=false on the server when using this.
import { loadConfig } from '../config.js';
import { createContainer } from '../container.js';
import { EmailWorker } from './emailWorker.js';

const config = loadConfig();
const container = createContainer(config);
const worker = new EmailWorker(container.services.emailJobs, config.worker.pollIntervalMs);

worker.start();

async function shutdown(): Promise<void> {
  await worker.stop();
  await container.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
