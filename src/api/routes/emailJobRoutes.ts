import { Router, type RequestHandler } from 'express';
import type { EmailJob } from '../../models/emailJob.js';
import type { EmailJobService } from '../../services/emailJobService.js';
import { idParams, listEmailJobsQuery } from '../schemas.js';

/** Leaves out the email bodies, which the admin page has no need for. */
function toResponse(job: EmailJob) {
  const { bodyText: _bodyText, bodyHtml: _bodyHtml, ...summary } = job;
  return summary;
}

export function emailJobRoutes(emailJobs: EmailJobService, requireAdmin: RequestHandler): Router {
  const router = Router();

  router.get('/email-jobs', requireAdmin, async (req, res) => {
    const { status, limit } = listEmailJobsQuery.parse(req.query);
    const jobs = await emailJobs.list(status, limit);
    res.json({ emailJobs: jobs.map(toResponse) });
  });

  router.get('/email-jobs/:id', requireAdmin, async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json(toResponse(await emailJobs.get(id)));
  });

  return router;
}
