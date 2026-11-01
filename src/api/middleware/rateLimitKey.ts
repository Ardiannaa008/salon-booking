import { isIP } from 'node:net';
import type { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

export type RateLimitKey = (req: Request) => string;

/**
 * Decides which visitor a request counts against. Behind a CDN, `req.ip` can be one of
 * the CDN's changing addresses, so the CDN's own client IP header is used when configured.
 * Only configure a header that the proxy in front of the app always overwrites, or
 * visitors could fake it.
 */
export function createRateLimitKey(clientIpHeader: string): RateLimitKey {
  return (req) => {
    const fromHeader = clientIpHeader ? req.get(clientIpHeader) : undefined;
    const ip = fromHeader && isIP(fromHeader) ? fromHeader : (req.ip ?? '');
    return ipKeyGenerator(ip);
  };
}
