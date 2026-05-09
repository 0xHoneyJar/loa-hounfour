import type { TrustLayerSnapshot, CapitalLayerSnapshot, QualificationCriteria, EconomicBoundaryEvaluationResult, EconomicBoundary } from '../economy/economic-boundary.js';
export type ParseMicroUsdResult = {
    valid: true;
    amount: bigint;
} | {
    valid: false;
    reason: string;
};
/**
 * Parse a micro-USD string into a BigInt amount.
 *
 * Grammar: `^[0-9]+$`, no leading zeros (except "0"), max 30 digits.
 * Returns a discriminated union — never throws.
 */
export declare function parseMicroUsd(value: string): ParseMicroUsdResult;
/**
 * Evaluate whether an agent qualifies for access at the economic boundary.
 *
 * This function is total (never throws for valid TypeBox inputs), deterministic
 * (no wall-clock reads), and fail-closed (unknown states → denied).
 *
 * Algorithm:
 * 0. ATTEMPT LAYER EVALUATIONS — each layer evaluated independently
 * 1. HANDLE VALIDATION FAILURES — partial evaluation: valid layers get accurate results
 * 2. COMPOSE DECISION — both must pass, structured denial_reason + denial_codes for failures
 * 3. RETURN with caller-provided evaluatedAt
 */
export declare function evaluateEconomicBoundary(trustSnapshot: TrustLayerSnapshot, capitalSnapshot: CapitalLayerSnapshot, criteria: QualificationCriteria, evaluatedAt: string, boundaryId?: string): EconomicBoundaryEvaluationResult;
/**
 * Evaluate an economic boundary using criteria stored ON the boundary itself.
 *
 * Convenience overload that extracts qualification_criteria from the boundary,
 * preventing the Confused Deputy Problem where caller-provided criteria
 * could diverge from boundary-stored criteria.
 *
 * @since v7.9.1 — F2 deep review improvement
 */
export declare function evaluateFromBoundary(boundary: EconomicBoundary, evaluatedAt: string): EconomicBoundaryEvaluationResult;
//# sourceMappingURL=economic-boundary.d.ts.map