import {
  SCREENING_RULE_VERSION,
  screeningReport,
  type ScreeningPlanType,
  type ScreeningReport,
} from './report-schema';

const MAX_INPUT_BYTES = 64 * 1024;

type SessionRecord = Record<string, unknown>;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isRecord(value: unknown): value is SessionRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function nestedRecord(value: SessionRecord, key: string): SessionRecord | null {
  const nested = value[key];
  return isRecord(nested) ? nested : null;
}

/**
 * Classifies the user supplied session snapshot locally in the browser.
 *
 * This function intentionally returns only a small, versioned report. It
 * never returns or logs the parsed session object, token, user id, or account
 * id. A free account is only a preliminary result; it is not a fulfillment
 * authorization.
 */
export function classifySession(raw: string, nowMs: number): ScreeningReport {
  if (typeof raw !== 'string' || raw.length === 0 || byteLength(raw) > MAX_INPUT_BYTES) {
    return screeningReport('invalid', 'unknown', 'format');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return screeningReport('invalid', 'unknown', 'format');
  }

  if (!isRecord(parsed)) {
    return screeningReport('invalid', 'unknown', 'format');
  }

  const user = nestedRecord(parsed, 'user');
  const account = nestedRecord(parsed, 'account');
  if (
    !user ||
    !account ||
    !nonEmptyString(user.id) ||
    !nonEmptyString(account.id) ||
    !nonEmptyString(parsed.accessToken)
  ) {
    return screeningReport('invalid', 'unknown', 'missing_login');
  }

  const expires = parsed.expires;
  if (!nonEmptyString(expires)) {
    return screeningReport('unknown', 'unknown', 'missing_fields');
  }

  const expiresMs = Date.parse(expires);
  if (!Number.isFinite(expiresMs)) {
    return screeningReport('unknown', 'unknown', 'missing_fields');
  }
  if (!Number.isFinite(nowMs) || expiresMs <= nowMs) {
    return screeningReport('invalid', 'unknown', 'expired');
  }

  const planType = account.planType;
  if (planType === 'free') {
    return screeningReport('passed', 'free', 'free');
  }
  if (planType === 'prolite') {
    return screeningReport('subscribed', 'prolite', 'subscribed');
  }
  if (typeof planType !== 'string' || planType.trim().length === 0) {
    return screeningReport('unknown', 'unknown', 'missing_fields');
  }
  return screeningReport('unknown', 'unknown', 'unknown_plan');
}

export { MAX_INPUT_BYTES, SCREENING_RULE_VERSION };
export type { ScreeningPlanType };
