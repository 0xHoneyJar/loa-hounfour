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
import { REPUTATION_STATE_ORDER, type ReputationStateName } from '../vocabulary/reputation.js';
import type {
  TrustLayerSnapshot,
  CapitalLayerSnapshot,
  QualificationCriteria,
  EconomicBoundaryEvaluationResult,
} from '../economy/economic-boundary.js';

// ---------------------------------------------------------------------------
// parseMicroUsd — strict micro-USD string parser
// ---------------------------------------------------------------------------

const MICRO_USD_PATTERN = /^[0-9]+$/;
const MAX_MICRO_USD_DIGITS = 30;

export type ParseMicroUsdResult =
  | { valid: true; amount: bigint }
  | { valid: false; reason: string };

/**
 * Parse a micro-USD string into a BigInt amount.
 *
 * Grammar: `^[0-9]+$`, no leading zeros (except "0"), max 30 digits.
 * Returns a discriminated union — never throws.
 */
export function parseMicroUsd(value: string): ParseMicroUsdResult {
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
 * 0. VALIDATE INPUTS — unknown reputation states or invalid budgets → denied
 * 1. EVALUATE TRUST LAYER — score >= comparison + ordinal state comparison
 * 2. EVALUATE CAPITAL LAYER — BigInt comparison via parseMicroUsd()
 * 3. COMPOSE DECISION — both must pass, structured denial_reason for failures
 * 4. RETURN with caller-provided evaluatedAt
 */
export function evaluateEconomicBoundary(
  trustSnapshot: TrustLayerSnapshot,
  capitalSnapshot: CapitalLayerSnapshot,
  criteria: QualificationCriteria,
  evaluatedAt: string,
): EconomicBoundaryEvaluationResult {
  // Step 0: Validate inputs — fail-closed for unknown states/invalid budgets
  const actualStateRank = REPUTATION_STATE_ORDER[trustSnapshot.reputation_state as ReputationStateName];
  const requiredStateRank = REPUTATION_STATE_ORDER[criteria.min_reputation_state as ReputationStateName];

  if (actualStateRank === undefined) {
    return makeDenied(
      trustSnapshot, capitalSnapshot, criteria, evaluatedAt,
      `unknown reputation state: ${trustSnapshot.reputation_state}`,
    );
  }

  if (requiredStateRank === undefined) {
    return makeDenied(
      trustSnapshot, capitalSnapshot, criteria, evaluatedAt,
      `unknown required reputation state: ${criteria.min_reputation_state}`,
    );
  }

  const actualBudget = parseMicroUsd(capitalSnapshot.budget_remaining);
  if (!actualBudget.valid) {
    return makeDenied(
      trustSnapshot, capitalSnapshot, criteria, evaluatedAt,
      `invalid budget format: ${actualBudget.reason}`,
    );
  }

  const requiredBudget = parseMicroUsd(criteria.min_available_budget);
  if (!requiredBudget.valid) {
    return makeDenied(
      trustSnapshot, capitalSnapshot, criteria, evaluatedAt,
      `invalid required budget format: ${requiredBudget.reason}`,
    );
  }

  // Step 1: Evaluate trust layer
  const scorePassed = trustSnapshot.blended_score >= criteria.min_trust_score;
  const statePassed = actualStateRank >= requiredStateRank;
  const trustPassed = scorePassed && statePassed;

  const trustEvaluation = {
    passed: trustPassed,
    actual_score: trustSnapshot.blended_score,
    required_score: criteria.min_trust_score,
    actual_state: trustSnapshot.reputation_state,
    required_state: criteria.min_reputation_state,
  };

  // Step 2: Evaluate capital layer
  const capitalPassed = actualBudget.amount >= requiredBudget.amount;

  const capitalEvaluation = {
    passed: capitalPassed,
    actual_budget: capitalSnapshot.budget_remaining,
    required_budget: criteria.min_available_budget,
  };

  // Step 3: Compose decision
  const granted = trustPassed && capitalPassed;

  let denialReason: string | undefined;
  if (!granted) {
    const reasons: string[] = [];
    if (!scorePassed) {
      reasons.push(`trust score ${trustSnapshot.blended_score} < required ${criteria.min_trust_score}`);
    }
    if (!statePassed) {
      reasons.push(`reputation state '${trustSnapshot.reputation_state}' below required '${criteria.min_reputation_state}'`);
    }
    if (!capitalPassed) {
      reasons.push(`budget ${capitalSnapshot.budget_remaining} < required ${criteria.min_available_budget}`);
    }
    denialReason = reasons.join('; ');
  }

  const accessDecision: { granted: boolean; denial_reason?: string } = { granted };
  if (denialReason !== undefined) {
    accessDecision.denial_reason = denialReason;
  }

  return {
    access_decision: accessDecision,
    trust_evaluation: trustEvaluation,
    capital_evaluation: capitalEvaluation,
    criteria_used: criteria,
    evaluated_at: evaluatedAt,
  };
}

// ---------------------------------------------------------------------------
// Internal helper — construct denied result for input validation failures
// ---------------------------------------------------------------------------

function makeDenied(
  trustSnapshot: TrustLayerSnapshot,
  capitalSnapshot: CapitalLayerSnapshot,
  criteria: QualificationCriteria,
  evaluatedAt: string,
  reason: string,
): EconomicBoundaryEvaluationResult {
  return {
    access_decision: {
      granted: false,
      denial_reason: reason,
    },
    trust_evaluation: {
      passed: false,
      actual_score: trustSnapshot.blended_score,
      required_score: criteria.min_trust_score,
      actual_state: trustSnapshot.reputation_state,
      required_state: criteria.min_reputation_state,
    },
    capital_evaluation: {
      passed: false,
      actual_budget: capitalSnapshot.budget_remaining,
      required_budget: criteria.min_available_budget,
    },
    criteria_used: criteria,
    evaluated_at: evaluatedAt,
  };
}
