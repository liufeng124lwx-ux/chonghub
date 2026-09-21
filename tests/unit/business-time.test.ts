import { describe, expect, test } from 'vitest';
import { calculateDueAt } from '../../src/modules/fulfillment/business-time';
import type { ServicePolicy } from '../../src/modules/orders/contracts';

const policy: ServicePolicy = {
  version: 1,
  zone: 'Asia/Shanghai',
  opensAt: '09:30',
  closesAt: '23:00',
  deliveryMinutes: 120,
  warrantyDays: 30,
  termsVersion: 'v1',
};

describe('calculateDueAt', () => {
  test('counts only operating time', () => {
    expect(calculateDueAt(new Date('2026-09-20T22:30:00+08:00'), policy).toISOString()).toBe(
      '2026-09-21T03:00:00.000Z',
    );
    expect(calculateDueAt(new Date('2026-09-20T23:30:00+08:00'), policy).toISOString()).toBe(
      '2026-09-21T03:30:00.000Z',
    );
  });

  test('handles opening, closing, month boundaries and fractional instants', () => {
    expect(calculateDueAt(new Date('2026-09-20T01:30:00Z'), policy).toISOString()).toBe(
      '2026-09-20T03:30:00.000Z',
    );
    expect(calculateDueAt(new Date('2026-09-20T15:00:00Z'), policy).toISOString()).toBe(
      '2026-09-21T03:30:00.000Z',
    );
    expect(
      calculateDueAt(new Date('2026-09-30T22:30:00+08:00'), { ...policy, deliveryMinutes: 120 }).toISOString(),
    ).toBe('2026-10-01T03:00:00.000Z');
  });

  test('rejects invalid policy and invalid dates', () => {
    expect(() => calculateDueAt(new Date('invalid'), policy)).toThrow(RangeError);
    expect(() => calculateDueAt(new Date(), { ...policy, opensAt: '23:00', closesAt: '09:30' })).toThrow(
      RangeError,
    );
    expect(() => calculateDueAt(new Date(), { ...policy, deliveryMinutes: 0 })).toThrow(RangeError);
  });
});
