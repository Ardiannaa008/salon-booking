// Enforces the layer rules: api -> services -> data -> models.
// Run with `npm run check:layers`. Any violation fails the command.
module.exports = {
  forbidden: [
    {
      name: 'api-only-calls-services',
      severity: 'error',
      comment: 'The api layer must go through services, never straight to data.',
      from: { path: '^src/api' },
      to: { path: '^src/(data|worker)' },
    },
    {
      name: 'services-do-not-call-up',
      severity: 'error',
      from: { path: '^src/services' },
      to: { path: '^src/(api|worker)' },
    },
    {
      name: 'data-do-not-call-up',
      severity: 'error',
      from: { path: '^src/data' },
      to: { path: '^src/(api|services|worker)' },
    },
    {
      name: 'models-depend-on-nothing',
      severity: 'error',
      from: { path: '^src/models' },
      to: { path: '^src/(api|services|data|worker|config|container)' },
    },
    {
      name: 'worker-only-calls-services',
      severity: 'error',
      comment: 'The worker is an entry point like the api, so it also goes through services.',
      from: { path: '^src/worker/emailWorker' },
      to: { path: '^src/(api|data)' },
    },
    {
      name: 'no-http-outside-api',
      severity: 'error',
      comment: 'Express and other HTTP concerns stay in the api layer.',
      from: { path: '^src/(services|data|models|worker)' },
      to: { path: 'node_modules/(express|helmet|express-rate-limit)/' },
    },
    {
      name: 'no-db-driver-outside-data',
      severity: 'error',
      comment: 'Only the data layer may talk to PostgreSQL.',
      from: { path: '^src/(api|services|models|worker)' },
      to: { path: 'node_modules/pg/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
