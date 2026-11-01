// Runs a real PostgreSQL server for local development, with no Docker or install needed.
// Keep this running in its own terminal. Stop it with Ctrl+C.
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = path.resolve('.local-db');
const port = 5433;
const databaseName = 'salon';

const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
});

const isFirstRun = !existsSync(path.join(databaseDir, 'PG_VERSION'));
if (isFirstRun) {
  await postgres.initialise();
}
await postgres.start();
if (isFirstRun) {
  await postgres.createDatabase(databaseName);
}

console.log(`Local PostgreSQL is ready: postgres://postgres:postgres@localhost:${port}/${databaseName}`);

async function shutdown(): Promise<void> {
  await postgres.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
