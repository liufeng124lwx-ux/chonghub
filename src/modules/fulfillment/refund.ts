import {
  assertNonNegativeSafeInteger,
  assertPositiveSafeInteger,
} from './guards';

/**
 * Calculates a proportional refund in cents, rounded to the nearest cent
 * with half-cent values rounded up. The caller is responsible for separately
 * checking the order's warranty eligibility and verified loss time.
 */
export function refundTargetCents(
  paid: number,
  remainingMs: number,
  warrantyMs: number,
): number {
  assertNonNegativeSafeInteger(paid, 'paid');
  assertPositiveSafeInteger(warrantyMs, 'warrantyMs');
  assertNonNegativeSafeInteger(Math.max(0, remainingMs), 'remainingMs');

  const boundedRemainingMs = Math.max(0, Math.min(remainingMs, warrantyMs));
  const numerator = BigInt(paid) * BigInt(boundedRemainingMs);
  const denominator = BigInt(warrantyMs);
  const rounded = (2n * numerator + denominator) / (2n * denominator);
  const result = Number(rounded);

  if (!Number.isSafeInteger(result) || result < 0 || result > paid) {
    throw new RangeError('refund result is outside the safe amount range');
  }
  return result;
}
