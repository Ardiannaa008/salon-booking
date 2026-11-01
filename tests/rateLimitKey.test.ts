import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Request } from 'express';
import { createRateLimitKey } from '../src/api/middleware/rateLimitKey.js';

function request(ip: string, headers: Record<string, string> = {}): Request {
  return { ip, get: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
}

describe('rate limit key', () => {
  const key = createRateLimitKey('cf-connecting-ip');

  test('uses the configured header, so a changing proxy address does not matter', () => {
    const first = key(request('10.0.0.1', { 'cf-connecting-ip': '203.0.113.5' }));
    const second = key(request('10.0.0.2', { 'cf-connecting-ip': '203.0.113.5' }));
    assert.equal(first, second);
  });

  test('keeps different visitors apart', () => {
    const first = key(request('10.0.0.1', { 'cf-connecting-ip': '203.0.113.5' }));
    const second = key(request('10.0.0.1', { 'cf-connecting-ip': '203.0.113.6' }));
    assert.notEqual(first, second);
  });

  test('falls back to the request IP when the header is missing or invalid', () => {
    assert.equal(key(request('10.0.0.1')), '10.0.0.1');
    assert.equal(key(request('10.0.0.1', { 'cf-connecting-ip': 'not-an-ip' })), '10.0.0.1');
  });

  test('ignores every header when none is configured', () => {
    const noHeader = createRateLimitKey('');
    assert.equal(noHeader(request('10.0.0.1', { 'cf-connecting-ip': '203.0.113.5' })), '10.0.0.1');
  });
});
