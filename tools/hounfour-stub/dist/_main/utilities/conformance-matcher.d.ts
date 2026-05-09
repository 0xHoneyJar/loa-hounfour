import type { MatchingRules } from '../schemas/model/conformance-vector.js';
export interface MatchResult {
    matched: boolean;
    reason?: string;
    mismatches?: Array<{
        path: string;
        expected: unknown;
        actual: unknown;
    }>;
}
/**
 * Match conformance output against expected output using matching rules.
 *
 * Implements SDD §5.3 — field selection, deep equality, volatile fields,
 * numeric tolerance, canonicalization, null-vs-absent handling.
 *
 * Error contracts (IMP-004): Returns { matched: false, reason } for
 * unsupported JSON types. Never throws.
 */
export declare function matchConformanceOutput(expected: Record<string, unknown>, actual: Record<string, unknown>, rules?: MatchingRules): MatchResult;
//# sourceMappingURL=conformance-matcher.d.ts.map