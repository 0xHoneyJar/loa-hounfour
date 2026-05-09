/**
 * Economic Boundary evaluation utility — the decision engine.
 *
 * Total pure function: never throws for valid TypeBox inputs, never reads
 * wall-clock, uses caller-provided `evaluatedAt`. Fail-closed semantics:
 * unknown reputation states and invalid micro-USD strings produce denied.
 *
 * @see FR-1 v7.9.0 — evaluateEconomicBoundary()
 * @see FR-3a v7.9.0 — parseMicroUsd()
 * @since v7.9.0
 */
import { REPUTATION_STATE_ORDER, isKnownReputationState } from '../vocabulary/reputation.js';
// ---------------------------------------------------------------------------
// parseMicroUsd — strict micro-USD string parser
// ---------------------------------------------------------------------------
const MICRO_USD_PATTERN = /^[0-9]+$/;
const MAX_MICRO_USD_DIGITS = 30;
/**
 * Parse a micro-USD string into a BigInt amount.
 *
 * Grammar: `^[0-9]+$`, no leading zeros (except "0"), max 30 digits.
 * Returns a discriminated union — never throws.
 */
export function parseMicroUsd(value) {
    if (value === '') {
        return { valid: false, reason: 'empty string' };
    }
    if (!MICRO_USD_PATTERN.test(value)) {
        return { valid: false, reason: `invalid characters in "${value}"` };
    }
    if (value.length > MAX_MICRO_USD_DIGITS) {
        return { valid: false, reason: `exceeds ${MAX_MICRO_USD_DIGITS} digit limit` };
    }
    // Reject leading zeros (except "0" itself)
    if (value.length > 1 && value[0] === '0') {
        return { valid: false, reason: `leading zeros in "${value}"` };
    }
    return { valid: true, amount: BigInt(value) };
}
/**
 * Attempt to evaluate the trust layer. Returns null if inputs are invalid.
 */
function tryEvaluateTrust(trustSnapshot, criteria) {
    if (!isKnownReputationState(trustSnapshot.reputation_state))
        return null;
    if (!isKnownReputationState(criteria.min_reputation_state))
        return null;
    const actualStateRank = REPUTATION_STATE_ORDER[trustSnapshot.reputation_state];
    const requiredStateRank = REPUTATION_STATE_ORDER[criteria.min_reputation_state];
    const scorePassed = trustSnapshot.blended_score >= criteria.min_trust_score;
    const statePassed = actualStateRank >= requiredStateRank;
    return {
        passed: scorePassed && statePassed,
        actual_score: trustSnapshot.blended_score,
        required_score: criteria.min_trust_score,
        actual_state: trustSnapshot.reputation_state,
        required_state: criteria.min_reputation_state,
    };
}
/**
 * Attempt to evaluate the capital layer. Returns null if inputs are invalid.
 */
function tryEvaluateCapital(capitalSnapshot, criteria) {
    const actualBudget = parseMicroUsd(capitalSnapshot.budget_remaining);
    if (!actualBudget.valid)
        return null;
    const requiredBudget = parseMicroUsd(criteria.min_available_budget);
    if (!requiredBudget.valid)
        return null;
    return {
        passed: actualBudget.amount >= requiredBudget.amount,
        actual_budget: capitalSnapshot.budget_remaining,
        required_budget: criteria.min_available_budget,
    };
}
// ---------------------------------------------------------------------------
// evaluateEconomicBoundary — the decision engine
// ---------------------------------------------------------------------------
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
export function evaluateEconomicBoundary(trustSnapshot, capitalSnapshot, criteria, evaluatedAt, boundaryId) {
    // Step 0: Attempt independent layer evaluations
    const trustResult = tryEvaluateTrust(trustSnapshot, criteria);
    const capitalResult = tryEvaluateCapital(capitalSnapshot, criteria);
    // Step 1: Handle validation failures with partial evaluation
    // Each layer gets its accurate result; only the invalid layer is marked failed.
    if (trustResult === null || capitalResult === null) {
        return buildValidationDenial(trustSnapshot, capitalSnapshot, criteria, evaluatedAt, boundaryId, trustResult, capitalResult);
    }
    // Step 2: Both layers valid — compose decision
    const granted = trustResult.passed && capitalResult.passed;
    let denialReason;
    const denialCodes = [];
    let evaluationGap;
    if (!granted) {
        const reasons = [];
        const gap = {};
        if (!trustResult.passed) {
            const scorePassed = trustSnapshot.blended_score >= criteria.min_trust_score;
            const actualStateRank = REPUTATION_STATE_ORDER[trustSnapshot.reputation_state];
            const requiredStateRank = REPUTATION_STATE_ORDER[criteria.min_reputation_state];
            const statePassed = actualStateRank >= requiredStateRank;
            if (!scorePassed) {
                reasons.push(`trust score ${trustSnapshot.blended_score} < required ${criteria.min_trust_score}`);
                denialCodes.push('TRUST_SCORE_BELOW_THRESHOLD');
                gap.trust_score_gap = Math.max(0, criteria.min_trust_score - trustSnapshot.blended_score);
            }
            if (!statePassed) {
                reasons.push(`reputation state '${trustSnapshot.reputation_state}' below required '${criteria.min_reputation_state}'`);
                denialCodes.push('TRUST_STATE_BELOW_THRESHOLD');
                gap.reputation_state_gap = Math.max(0, requiredStateRank - actualStateRank);
            }
        }
        if (!capitalResult.passed) {
            reasons.push(`budget ${capitalSnapshot.budget_remaining} < required ${criteria.min_available_budget}`);
            denialCodes.push('CAPITAL_BELOW_THRESHOLD');
            const actualBudget = parseMicroUsd(capitalSnapshot.budget_remaining);
            const requiredBudget = parseMicroUsd(criteria.min_available_budget);
            if (actualBudget.valid && requiredBudget.valid) {
                const budgetShortfall = requiredBudget.amount - actualBudget.amount;
                gap.budget_gap = (budgetShortfall > 0n ? budgetShortfall : 0n).toString();
            }
        }
        denialReason = reasons.join('; ');
        evaluationGap = gap;
    }
    const accessDecision = { granted };
    if (denialReason !== undefined) {
        accessDecision.denial_reason = denialReason;
    }
    const result = {
        access_decision: accessDecision,
        trust_evaluation: trustResult,
        capital_evaluation: capitalResult,
        criteria_used: criteria,
        evaluated_at: evaluatedAt,
    };
    if (boundaryId !== undefined) {
        result.boundary_id = boundaryId;
    }
    if (denialCodes.length > 0) {
        result.denial_codes = denialCodes;
    }
    if (evaluationGap !== undefined) {
        result.evaluation_gap = evaluationGap;
    }
    return result;
}
// ---------------------------------------------------------------------------
// Validation denial builder — partial evaluation with accurate layer results
// ---------------------------------------------------------------------------
/**
 * Build a denied result for input validation failures. Unlike the old makeDenied(),
 * this performs partial evaluation: if one layer is valid, its `passed` boolean
 * reflects the actual evaluation result rather than blindly being `false`.
 *
 * @since v7.9.1 — Part 9.2 symmetry fix
 */
function buildValidationDenial(trustSnapshot, capitalSnapshot, criteria, evaluatedAt, boundaryId, trustResult, capitalResult) {
    const reasons = [];
    const codes = [];
    // Determine trust evaluation — use actual result if available, else failed
    const trustEvaluation = trustResult ?? {
        passed: false,
        actual_score: trustSnapshot.blended_score,
        required_score: criteria.min_trust_score,
        actual_state: trustSnapshot.reputation_state,
        required_state: criteria.min_reputation_state,
    };
    // Determine capital evaluation — use actual result if available, else failed
    const capitalEvaluation = capitalResult ?? {
        passed: false,
        actual_budget: capitalSnapshot.budget_remaining,
        required_budget: criteria.min_available_budget,
    };
    // Collect validation error reasons and codes
    if (trustResult === null) {
        if (!isKnownReputationState(trustSnapshot.reputation_state)) {
            reasons.push(`unknown reputation state: ${trustSnapshot.reputation_state}`);
            codes.push('UNKNOWN_REPUTATION_STATE');
        }
        else if (!isKnownReputationState(criteria.min_reputation_state)) {
            reasons.push(`unknown required reputation state: ${criteria.min_reputation_state}`);
            codes.push('UNKNOWN_REPUTATION_STATE');
        }
    }
    if (capitalResult === null) {
        const actualBudget = parseMicroUsd(capitalSnapshot.budget_remaining);
        if (!actualBudget.valid) {
            reasons.push(`invalid budget format: ${actualBudget.reason}`);
            codes.push('INVALID_BUDGET_FORMAT');
        }
        else {
            const requiredBudget = parseMicroUsd(criteria.min_available_budget);
            if (!requiredBudget.valid) {
                reasons.push(`invalid required budget format: ${requiredBudget.reason}`);
                codes.push('INVALID_BUDGET_FORMAT');
            }
        }
    }
    const result = {
        access_decision: {
            granted: false,
            denial_reason: reasons.join('; '),
        },
        trust_evaluation: trustEvaluation,
        capital_evaluation: capitalEvaluation,
        criteria_used: criteria,
        evaluated_at: evaluatedAt,
    };
    if (boundaryId !== undefined) {
        result.boundary_id = boundaryId;
    }
    if (codes.length > 0) {
        result.denial_codes = codes;
    }
    return result;
}
// ---------------------------------------------------------------------------
// evaluateFromBoundary — convenience overload (v7.9.1, F2)
// ---------------------------------------------------------------------------
/**
 * Evaluate an economic boundary using criteria stored ON the boundary itself.
 *
 * Convenience overload that extracts qualification_criteria from the boundary,
 * preventing the Confused Deputy Problem where caller-provided criteria
 * could diverge from boundary-stored criteria.
 *
 * @since v7.9.1 — F2 deep review improvement
 */
export function evaluateFromBoundary(boundary, evaluatedAt) {
    if (!boundary.qualification_criteria) {
        const dummyCriteria = {
            min_trust_score: 0,
            min_reputation_state: 'cold',
            min_available_budget: '0',
        };
        const result = {
            access_decision: {
                granted: false,
                denial_reason: 'no qualification criteria on boundary',
            },
            trust_evaluation: {
                passed: false,
                actual_score: boundary.trust_layer.blended_score,
                required_score: 0,
                actual_state: boundary.trust_layer.reputation_state,
                required_state: 'cold',
            },
            capital_evaluation: {
                passed: false,
                actual_budget: boundary.capital_layer.budget_remaining,
                required_budget: '0',
            },
            criteria_used: dummyCriteria,
            evaluated_at: evaluatedAt,
            denial_codes: ['MISSING_QUALIFICATION_CRITERIA'],
        };
        if (boundary.boundary_id) {
            result.boundary_id = boundary.boundary_id;
        }
        return result;
    }
    return evaluateEconomicBoundary(boundary.trust_layer, boundary.capital_layer, boundary.qualification_criteria, evaluatedAt, boundary.boundary_id);
}
//# sourceMappingURL=economic-boundary.js.map