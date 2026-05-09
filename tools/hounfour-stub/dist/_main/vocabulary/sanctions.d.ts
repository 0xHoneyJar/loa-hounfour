export declare const SANCTION_SEVERITY_LEVELS: readonly ["warning", "rate_limited", "pool_restricted", "suspended", "terminated"];
export type SanctionSeverity = (typeof SANCTION_SEVERITY_LEVELS)[number];
export declare const SANCTION_SEVERITY_ORDER: Record<SanctionSeverity, number>;
export declare const VIOLATION_TYPES: readonly ["content_policy", "rate_abuse", "billing_fraud", "identity_spoofing", "resource_exhaustion", "community_guideline", "safety_violation"];
export type ViolationType = (typeof VIOLATION_TYPES)[number];
export declare const ESCALATION_RULES: Record<ViolationType, {
    thresholds: number[];
    severity_progression: SanctionSeverity[];
}>;
//# sourceMappingURL=sanctions.d.ts.map