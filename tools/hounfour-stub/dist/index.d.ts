/**
 * `@0xhoneyjar/loa-hounfour-stub` — RC-staging re-export surface.
 *
 * Consumers alias their dependency on `@0xhoneyjar/loa-hounfour` to
 * this package via `file:./tools/hounfour-stub` during the v8.6.0 RC
 * window. After GA, they switch the alias to the published version
 * (`@0xhoneyjar/loa-hounfour@8.6.0`). The differential test under
 * `tests/stub/diff-against-main.test.ts` verifies that the surface
 * this package exposes is byte-identical (canonical-JSON sense) to
 * the main package's v8.6.0 schema cluster — drift between stub and
 * main is a hard CI failure.
 *
 * **Architecture (iter-2 F1 mitigation):** the stub re-exports from
 * the main package's COMPILED `dist/` (not from `src/`). Its source
 * file paths reach into `../../../dist/...` (relative to this src
 * file) which resolve at runtime to the main package's emitted
 * JavaScript + TypeScript declarations. `tsc` compiling the stub
 * emits `tools/hounfour-stub/dist/index.js` + `index.d.ts` carrying
 * the same `../../../dist/...` paths — Node consumers resolve them
 * via standard module resolution without needing TS-aware tooling.
 *
 * **Schema $id discipline (NA-2 fix per cycle-005 PRD):** every
 * re-exported schema's `$id` field retains the production short-form
 * (PascalCase, e.g., `'CanonicalRun'`) consistent with the main
 * package's emitted JSON Schema artifacts. Consumers querying
 * `Schema.$id` see the same identifier whether they resolved through
 * the stub or the published package.
 *
 * **Pollution-invariant note:** this package's name uses the
 * `@0xhoneyjar/loa-hounfour-stub` namespace per the PRD §9 NA-2
 * decision. The npm scope is pollution-clean (lowercase scope name,
 * not a proper-noun reference per the cycle-005 hook pattern).
 *
 * @since v8.6.0 — PR-A3.11 (FR-D1)
 */
export { PhaseCompletionEnvelopeTier1Schema, type PhaseCompletionEnvelopeTier1, } from '../../../dist/integrity/phase-completion-envelope-tier1.js';
export { PhaseCompletionEnvelopeSchema, type PhaseCompletionEnvelope, } from '../../../dist/integrity/phase-completion-envelope.js';
export { OracleDigestSchema, PulseKindSchema, type OracleDigest, type PulseKind, } from '../../../dist/operations/oracle-digest.js';
export { OracleHealthEnvelopeSchema, type OracleHealthEnvelope, } from '../../../dist/operations/oracle-health-envelope.js';
export { EscalationEnvelopeSchema, type EscalationEnvelope, } from '../../../dist/operations/escalation-envelope.js';
export { RollbackPlanSchema, type RollbackPlan, } from '../../../dist/operations/rollback-plan.js';
export { LatencyHistogramEnvelopeSchema, type LatencyHistogramEnvelope, } from '../../../dist/operations/latency-histogram-envelope.js';
export { EpicCheckpointSchema, type EpicCheckpoint, } from '../../../dist/operations/epic-checkpoint.js';
export { PlanSignoffEnvelopeSchema, SignoffActorClassSchema, SignoffTierSchema, type PlanSignoffEnvelope, type SignoffActorClass, type SignoffTier, } from '../../../dist/governance/plan-signoff-envelope.js';
export { PlanAmendmentRequestSchema, type PlanAmendmentRequest, } from '../../../dist/governance/plan-amendment-request.js';
export { ChallengeSchema, type Challenge, } from '../../../dist/governance/challenge.js';
export { ChallengeTypeSchema, ChallengeRequestedEffectSchema, CHALLENGE_TYPES, CHALLENGE_REQUESTED_EFFECTS, type ChallengeType, type ChallengeRequestedEffect, } from '../../../dist/governance/challenge-types.js';
export { CanonicalRunSchema, RequiredPhaseSchema, validateCanonicalRunCR1, type CanonicalRun, type RequiredPhase, } from '../../../dist/canonical/canonical-run.js';
export { PhaseKindSchema, PHASE_KINDS, type PhaseKind, } from '../../../dist/canonical/phase-kinds.js';
export { evaluateNonceUniquePerSignerWindow } from '../../../dist/constraints/builtins/nonce-unique-per-signer-window.js';
export { evaluateSequenceMonotonicPerCluster } from '../../../dist/constraints/builtins/sequence-monotonic-per-cluster.js';
export { evaluateChainValidatorPrevHash } from '../../../dist/constraints/builtins/chain-validator-prev-hash.js';
export { evaluatePlanContentHashUnchangedSinceSignoff } from '../../../dist/constraints/builtins/plan-content-hash-unchanged-since-signoff.js';
export { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, SCHEMA_BASE_URL, } from '../../../dist/version.js';
//# sourceMappingURL=index.d.ts.map