import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { BookingRuleError, NotFoundError, SlotTakenError } from '../../services/errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found.' });
}

// Express recognises error handlers by their four arguments, so `_next` has to stay.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request.',
      details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof SlotTakenError) {
    res.status(409).json({ error: error.message });
    return;
  }
  if (error instanceof BookingRuleError) {
    res.status(422).json({ error: error.message });
    return;
  }

  // Errors from body parsing, such as malformed JSON, carry their own 4xx status.
  const status = (error as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Invalid request.' });
    return;
  }

  console.error('Unexpected error:', error);
  res.status(500).json({ error: 'Something went wrong.' });
}
