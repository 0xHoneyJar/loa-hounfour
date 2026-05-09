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
import { type Static } from '@sinclair/typebox';
/**
 * Schema for the graduated severity level (v5.1.0).
 * Maps 1:1 to existing SANCTION_SEVERITY_LEVELS but adds structure.
 */
export declare const SanctionSeveritySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"rate_limited">, import("@sinclair/typebox").TLiteral<"pool_restricted">, import("@sinclair/typebox").TLiteral<"suspended">]>;
export type SanctionSeverityLevel = Static<typeof SanctionSeveritySchema>;
/**
 * Structured severity ladder with level, default duration, and effect.
 *
 * - `level`: numeric severity (higher = more severe)
 * - `default_duration_seconds`: suggested duration (0 = indefinite until review)
 * - `effect`: human-readable description of what happens at this level
 */
export interface SeverityLadderEntry {
    readonly severity: SanctionSeverityLevel;
    readonly level: number;
    readonly default_duration_seconds: number;
    readonly effect: string;
}
export declare const SANCTION_SEVERITY_LADDER: readonly SeverityLadderEntry[];
/**
 * Lookup a severity ladder entry by severity name.
 */
export declare function getSeverityEntry(severity: SanctionSeverityLevel): SeverityLadderEntry;
/**
 * Compare two severity levels. Returns negative if a < b, 0 if equal, positive if a > b.
 */
export declare function compareSeverity(a: SanctionSeverityLevel, b: SanctionSeverityLevel): number;
//# sourceMappingURL=sanction-severity.d.ts.map