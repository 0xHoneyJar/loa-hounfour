/**
 * SanctionSeverity graduated vocabulary (v5.1.0).
 *
 * Extends the existing severity vocabulary with a structured severity ladder
 * that includes numeric levels, default durations, and effect descriptions.
 *
 * Precedence rule: when both `severity` (legacy) and `severity_level` (v5.1.0)
 * are present on a Sanction, `severity_level` takes precedence for enforcement.
 * The legacy `severity` field is retained for backward compatibility.
 *
 * @see SDD §5.1 — Graduated Sanctions
 */
import { Type } from '@sinclair/typebox';
/**
 * Schema for the graduated severity level (v5.1.0).
 * Maps 1:1 to existing SANCTION_SEVERITY_LEVELS but adds structure.
 */
export const SanctionSeveritySchema = Type.Union([
    Type.Literal('warning'),
    Type.Literal('rate_limited'),
    Type.Literal('pool_restricted'),
    Type.Literal('suspended'),
], {
    $id: 'SanctionSeverity',
    description: 'Graduated sanction severity level (v5.1.0). Does not include "terminated" — termination is a separate permanent action, not a graduated severity.',
});
export const SANCTION_SEVERITY_LADDER = [
    {
        severity: 'warning',
        level: 1,
        default_duration_seconds: 86400, // 24 hours
        effect: 'Notification only — no capability restriction',
    },
    {
        severity: 'rate_limited',
        level: 2,
        default_duration_seconds: 259200, // 72 hours
        effect: 'Request rate reduced to 10% of normal quota',
    },
    {
        severity: 'pool_restricted',
        level: 3,
        default_duration_seconds: 604800, // 7 days
        effect: 'Access limited to basic pool only — premium and priority pools revoked',
    },
    {
        severity: 'suspended',
        level: 4,
        default_duration_seconds: 0, // indefinite until review
        effect: 'All access suspended pending governance review',
    },
];
/**
 * Lookup a severity ladder entry by severity name.
 */
export function getSeverityEntry(severity) {
    const entry = SANCTION_SEVERITY_LADDER.find(e => e.severity === severity);
    if (!entry)
        throw new Error(`Unknown severity level: ${severity}`);
    return entry;
}
/**
 * Compare two severity levels. Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareSeverity(a, b) {
    return getSeverityEntry(a).level - getSeverityEntry(b).level;
}
//# sourceMappingURL=sanction-severity.js.map