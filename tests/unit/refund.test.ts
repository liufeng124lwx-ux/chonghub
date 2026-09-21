import { describe, expect, test } from 'vitest';
import { refundTargetCents } from '../../src/modules/fulfillment/refund';

const DAY_MS = 86_400_000;

describe('refundTargetCents', () => {
  test('uses paid cents and natural duration', () => {
    expect(refundTargetCents(14_500, 15 * DAY_MS, 30 * DAY_MS)).toBe(7_250);
    expect(refundTargetCents(14_500, -1, 30 * DAY_MS)).toBe(0);
    expect(refundTargetCents(14_500, 31 * DAY_MS, 30 * DAY_MS)).toBe(14_500);
  });

  test('rounds half cents up without floating point arithmetic', () => {
    expect(refundTargetCents(1, 1, 2)).toBe(1);
    expect(refundTargetCents(1, 1, 3)).toBe(0);
    expect(refundTargetCents(2, 2, 3)).toBe(1);
  });

  test('rejects invalid integer inputs', () => {
    expect(() => refundTargetCents(-1, 1, 2)).toThrow(RangeError);
    expect(() => refundTargetCents(1.5, 1, 2)).toThrow(RangeError);
    expect(() => refundTargetCents(1, 1.5, 2)).toThrow(RangeError);
    expect(() => refundTargetCents(1, 1, 0)).toThrow(RangeError);
  });
});
