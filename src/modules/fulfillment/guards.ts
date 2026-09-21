import type { ServicePolicy } from '../orders/contracts';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_SAFE_DURATION_MINUTES = Math.floor(Number.MAX_SAFE_INTEGER / 60_000);

export function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function assertNonNegativeSafeInteger(value: number, fieldName: string): void {
  if (!isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative safe integer`);
  }
}

export function assertPositiveSafeInteger(value: number, fieldName: string): void {
  if (!isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a positive safe integer`);
  }
}

export function parseClockMinutes(value: string, fieldName: string): number {
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    throw new RangeError(`${fieldName} must be an HH:mm time`);
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function assertValidServicePolicy(policy: ServicePolicy): void {
  if (!policy || typeof policy !== 'object') {
    throw new TypeError('policy must be an object');
  }
  assertPositiveSafeInteger(policy.version, 'policy.version');
  if (policy.zone !== 'Asia/Shanghai') {
    throw new RangeError('policy.zone must be Asia/Shanghai');
  }

  const opensAt = parseClockMinutes(policy.opensAt, 'policy.opensAt');
  const closesAt = parseClockMinutes(policy.closesAt, 'policy.closesAt');
  if (opensAt >= closesAt) {
    throw new RangeError('policy opening and closing times must be same-day and ordered');
  }
  assertPositiveSafeInteger(policy.deliveryMinutes, 'policy.deliveryMinutes');
  if (policy.deliveryMinutes > MAX_SAFE_DURATION_MINUTES) {
    throw new RangeError('policy.deliveryMinutes produces an unsafe duration');
  }
  assertPositiveSafeInteger(policy.warrantyDays, 'policy.warrantyDays');
  if (typeof policy.termsVersion !== 'string' || policy.termsVersion.trim().length === 0) {
    throw new TypeError('policy.termsVersion must be non-empty');
  }
}

export function isValidServicePolicy(value: unknown): value is ServicePolicy {
  try {
    assertValidServicePolicy(value as ServicePolicy);
    return true;
  } catch {
    return false;
  }
}

export { MAX_SAFE_DURATION_MINUTES };
