import { DateTime } from 'luxon';
import type { ServicePolicy } from '../orders/contracts';
import {
  assertValidServicePolicy,
  parseClockMinutes,
} from './guards';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

function assertValidStart(start: Date): void {
  if (!(start instanceof Date) || !Number.isFinite(start.getTime())) {
    throw new RangeError('start must be a valid Date');
  }
}

/**
 * Adds policy delivery minutes while counting only the configured daily
 * operating window. The returned Date is an instant; calculations are made
 * in Asia/Shanghai so callers do not depend on the server's local timezone.
 */
export function calculateDueAt(start: Date, policy: ServicePolicy): Date {
  assertValidStart(start);
  assertValidServicePolicy(policy);

  const zone = policy.zone;
  const opensAt = parseClockMinutes(policy.opensAt, 'policy.opensAt');
  const closesAt = parseClockMinutes(policy.closesAt, 'policy.closesAt');
  const dailyWindowMs = (closesAt - opensAt) * MINUTE_MS;
  let remainingMs = policy.deliveryMinutes * MINUTE_MS;
  let cursor = DateTime.fromJSDate(start, { zone });

  const localMinutes = cursor.hour * 60 + cursor.minute;
  const dayStart = cursor.startOf('day');
  if (localMinutes < opensAt) {
    cursor = dayStart.plus({ minutes: opensAt });
  } else if (localMinutes >= closesAt) {
    cursor = dayStart.plus({ days: 1, minutes: opensAt });
  }

  while (remainingMs > 0) {
    const currentDay = cursor.startOf('day');
    const closeAt = currentDay.plus({ minutes: closesAt });
    const availableMs = closeAt.toMillis() - cursor.toMillis();
    if (availableMs <= 0) {
      cursor = currentDay.plus({ days: 1, minutes: opensAt });
      continue;
    }

    if (remainingMs <= availableMs) {
      const due = DateTime.fromMillis(cursor.toMillis() + remainingMs, { zone });
      if (!due.isValid) throw new RangeError('calculated due time is outside Date range');
      return due.toJSDate();
    }

    remainingMs -= availableMs;
    cursor = currentDay.plus({ days: 1, minutes: opensAt });

    // Skip complete operating days arithmetically. This keeps malformed but
    // otherwise finite policies from turning into an unbounded loop.
    if (remainingMs > dailyWindowMs) {
      const skipDays = Math.floor((remainingMs - 1) / dailyWindowMs);
      if (skipDays > 0) {
        cursor = cursor.plus({ days: skipDays });
        remainingMs -= skipDays * dailyWindowMs;
      }
    }
    if (!cursor.isValid || !Number.isFinite(cursor.toMillis())) {
      throw new RangeError('calculated due time is outside Date range');
    }
  }

  // deliveryMinutes is positive and the loop returns when it is consumed.
  throw new RangeError('unable to calculate due time');
}

export { DAY_MS, MINUTE_MS };
