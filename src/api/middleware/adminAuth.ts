import { createHash, timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { RateLimitKey } from './rateLimitKey.js';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Protects customer data. Expects the header `Authorization: Bearer <ADMIN_PASSWORD>`. */
export function createAdminAuth(adminPassword: string, rateLimitKey: RateLimitKey): RequestHandler {
  const expected = digest(adminPassword);

  const limitFailedAttempts = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    keyGenerator: rateLimitKey,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many failed attempts. Try again later.' },
  });

  const checkPassword = (req: Request, res: Response, next: NextFunction): void => {
    const [scheme, password] = (req.headers.authorization ?? '').split(' ');
    if (scheme === 'Bearer' && password && timingSafeEqual(digest(password), expected)) {
      next();
      return;
    }
    res.status(401).json({ error: 'Admin password required.' });
  };

  return Router().use(limitFailedAttempts, checkPassword);
}
