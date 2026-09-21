import { describe, expect, test } from 'vitest';
import { classifySession } from '../../src/modules/screening/classify.client';

const NOW = Date.parse('2026-09-20T00:00:00.000Z');

function session(planType: string, expires = '2030-01-01T00:00:00Z'): string {
  return JSON.stringify({
    user: { id: 'fake-user' },
    account: { id: 'fake-account', planType },
    accessToken: 'SYNTHETIC-ONLY',
    expires,
  });
}

describe('classifySession', () => {
  test('free is preliminary only; unknown does not pass', () => {
    expect(classifySession(session('free'), NOW)).toMatchObject({
      status: 'passed',
      planType: 'free',
      reason: 'free',
      ruleVersion: 1,
    });
    expect(classifySession(session('unrecognized'), NOW).status).toBe('unknown');
    expect(classifySession('{"WARNING_BANNER":"notice"}', 0)).toMatchObject({
      status: 'invalid',
      reason: 'missing_login',
    });
  });

  test('recognizes subscribed prolite sessions without returning input fields', () => {
    const report = classifySession(session('prolite'), NOW);
    expect(report).toEqual({
      status: 'subscribed',
      planType: 'prolite',
      reason: 'subscribed',
      ruleVersion: 1,
    });
    expect(JSON.stringify(report)).not.toContain('SYNTHETIC');
  });

  test('rejects expired sessions, missing fields and malformed input', () => {
    expect(classifySession(session('free', '2026-09-20T00:00:00.000Z'), NOW)).toMatchObject({
      status: 'invalid',
      reason: 'expired',
    });
    expect(classifySession(session('free').replace(/,"expires":"[^"]+"/, ''), NOW)).toMatchObject({
      status: 'unknown',
      reason: 'missing_fields',
    });
    expect(classifySession('', NOW).reason).toBe('format');
    expect(classifySession('[]', NOW).reason).toBe('format');
  });

  test('rejects input over 64 KiB and does not expose the token', () => {
    const oversized = `${session('free')}${'x'.repeat(64 * 1024)}`;
    const report = classifySession(oversized, NOW);
    expect(report).toEqual({
      status: 'invalid',
      planType: 'unknown',
      reason: 'format',
      ruleVersion: 1,
    });
    expect(JSON.stringify(report)).not.toContain('SYNTHETIC');
  });
});
