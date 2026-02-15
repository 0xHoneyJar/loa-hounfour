export const SANCTION_SEVERITY_LEVELS = ['warning', 'rate_limited', 'pool_restricted', 'suspended', 'terminated'] as const;
export type SanctionSeverity = (typeof SANCTION_SEVERITY_LEVELS)[number];

export const SANCTION_SEVERITY_ORDER: Record<SanctionSeverity, number> = {
  warning: 1,
  rate_limited: 2,
  pool_restricted: 3,
  suspended: 4,
  terminated: 5,
};

export const VIOLATION_TYPES = ['content_policy', 'rate_abuse', 'billing_fraud', 'identity_spoofing', 'resource_exhaustion', 'community_guideline', 'safety_violation'] as const;
export type ViolationType = (typeof VIOLATION_TYPES)[number];

export const ESCALATION_RULES: Record<ViolationType, { thresholds: number[]; severity_progression: SanctionSeverity[] }> = {
  // Each threshold = occurrence count that triggers next severity
  content_policy: { thresholds: [1, 3, 5], severity_progression: ['warning', 'rate_limited', 'suspended'] },
  rate_abuse: { thresholds: [1, 2, 5, 10], severity_progression: ['warning', 'rate_limited', 'pool_restricted', 'suspended'] },
  billing_fraud: { thresholds: [1], severity_progression: ['terminated'] },
  identity_spoofing: { thresholds: [1], severity_progression: ['terminated'] },
  resource_exhaustion: { thresholds: [1, 3, 5], severity_progression: ['warning', 'rate_limited', 'pool_restricted'] },
  community_guideline: { thresholds: [1, 3, 7], severity_progression: ['warning', 'rate_limited', 'suspended'] },
  safety_violation: { thresholds: [1, 2], severity_progression: ['suspended', 'terminated'] },
};
