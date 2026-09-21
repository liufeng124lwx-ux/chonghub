export const SCREENING_RULE_VERSION = 1 as const;

export type ScreeningStatus = 'passed' | 'subscribed' | 'invalid' | 'unknown';
export type ScreeningPlanType = 'free' | 'prolite' | 'unknown';
export type ScreeningReason =
  | 'format'
  | 'missing_login'
  | 'expired'
  | 'missing_fields'
  | 'unknown_plan'
  | 'free'
  | 'subscribed';

export interface ScreeningReport {
  status: ScreeningStatus;
  planType: ScreeningPlanType;
  reason: ScreeningReason;
  ruleVersion: typeof SCREENING_RULE_VERSION;
}

export function screeningReport(
  status: ScreeningStatus,
  planType: ScreeningPlanType,
  reason: ScreeningReason,
): ScreeningReport {
  return { status, planType, reason, ruleVersion: SCREENING_RULE_VERSION };
}

export function isScreeningReport(value: unknown): value is ScreeningReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const report = value as Record<string, unknown>;
  if (Object.keys(report).length !== 4) return false;
  return (
    (report.status === 'passed' ||
      report.status === 'subscribed' ||
      report.status === 'invalid' ||
      report.status === 'unknown') &&
    (report.planType === 'free' ||
      report.planType === 'prolite' ||
      report.planType === 'unknown') &&
    (report.reason === 'format' ||
      report.reason === 'missing_login' ||
      report.reason === 'expired' ||
      report.reason === 'missing_fields' ||
      report.reason === 'unknown_plan' ||
      report.reason === 'free' ||
      report.reason === 'subscribed') &&
    report.ruleVersion === SCREENING_RULE_VERSION &&
    ((report.status === 'passed' && report.planType === 'free' && report.reason === 'free') ||
      (report.status === 'subscribed' && report.planType === 'prolite' && report.reason === 'subscribed') ||
      (report.status === 'invalid' && report.planType === 'unknown' &&
        (report.reason === 'format' || report.reason === 'missing_login' || report.reason === 'expired')) ||
      (report.status === 'unknown' && report.planType === 'unknown' &&
        (report.reason === 'missing_fields' || report.reason === 'unknown_plan')))
  );
}
