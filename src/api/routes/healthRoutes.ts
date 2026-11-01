import { Router } from 'express';
import type { HealthService } from '../../services/healthService.js';

export function healthRoutes(health: HealthService): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    const report = await health.check();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  });

  return router;
}
