/**
 * Canonical list of v8.4.0 governance vector fixtures that pass TypeBox
 * structural check but target constraint-DSL rules (PDA-2/4/5, PV-1/3,
 * CSR-1, SP-1/2). The cross-field validators registered for v8.4.0
 * are presently the constraintFileOnlyValidator stub per
 * `src/validators/index.ts:870`; consumers evaluate the constraint
 * files via `evaluateConstraint(...)` to enforce these rules.
 *
 * Single source of truth for both `tests/vectors/v840-governance-vectors.test.ts`
 * and `scripts/cross-runner.ts` (was duplicated; resolves bridge iter-1 F8).
 *
 * @see SDD section 1.9 — Two-tier evaluator pattern
 */
export const CONSTRAINT_LEVEL_INVALIDS: ReadonlySet<string> = new Set([
  'PanelDecisionArtifact/invalid/pda-2-claim-dag-cycle.json',
  'PanelDecisionArtifact/invalid/pda-4-speculative-on-auto-honor.json',
  'PanelDecisionArtifact/invalid/pda-5-acknowledged-judgment-no-source.json',
  'PanelVerdict/invalid/pv-1-bucket-verdict-mismatch.json',
  'PanelVerdict/invalid/pv-3-asymmetric-blocker-inconsistent.json',
  'CrossScoreReport/invalid/csr-1-self-scoring.json',
  'SuccessionPolicy/invalid/sp-1-asymmetric-ladder-violation.json',
  'SuccessionPolicy/invalid/sp-2-cooldown-decreasing.json',
]);
