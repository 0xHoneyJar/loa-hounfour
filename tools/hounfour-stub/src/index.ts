/**
 * `@0xhoneyjar/loa-hounfour-stub` — RC-staging re-export surface.
 *
 * Consumers alias their dependency on `@0xhoneyjar/loa-hounfour` to
 * this package via `file:./tools/hounfour-stub` during the v8.6.0 RC
 * window. After GA, they switch the alias to the published version
 * (`@0xhoneyjar/loa-hounfour@8.6.0`). The differential test under
 * `tools/hounfour-stub/tests/diff-against-main.test.ts` verifies that
 * the surface this package exposes is byte-identical (canonical-JSON
 * sense) to the main package's v8.6.0 schema cluster — drift between
 * stub and main is a hard CI failure.
 *
 * **Scope (per sprint.md PR-A3.11):** v8.6.0 cycle-005 cluster
 * schemas + the 4 FR-C constraint builtins. NOT included: v8.7.0
 * schemas (those land in `tools/hounfour-stub/` after PR-B1.x); NOT
 * included: v8.4.0 / v8.5.0 substrate (consumers that already
 * integrated against those should pin to the GA published version
 * for the substrate, then alias only the cycle-005 deltas to the
 * stub if they need RC-window-fixed semantics).
 *
 * **Schema $id discipline (NA-2 fix per cycle-005 PRD):** every
 * re-exported schema's `$id` field retains the production namespace
 * (`@0xhoneyjar/loa-hounfour/...`). Consumers querying `Schema.$id`
 * see the production identifier even when resolving through the
 * stub — no surface drift between stub and post-publish.
 *
 * **Pollution-invariant note:** this package's name uses the
 * `@0xhoneyjar/loa-hounfour-stub` namespace per the PRD §9 NA-2
 * decision. The npm scope and package name are pollution-clean
 * (the `loa-` prefix is the lowercase npm scope and not a
 * proper-noun reference per the cycle-005 hook pattern).
 *
 * @since v8.6.0 — PR-A3.11 (FR-D1)
 */

// v8.6.0 cycle-005 cluster — schemas
export {
  PhaseCompletionEnvelopeTier1Schema,
  type PhaseCompletionEnvelopeTier1,
} from '../../../src/integrity/phase-completion-envelope-tier1.js';
export {
  PhaseCompletionEnvelopeSchema,
  type PhaseCompletionEnvelope,
} from '../../../src/integrity/phase-completion-envelope.js';
export {
  OracleDigestSchema,
  PulseKindSchema,
  type OracleDigest,
  type PulseKind,
} from '../../../src/operations/oracle-digest.js';
export {
  OracleHealthEnvelopeSchema,
  type OracleHealthEnvelope,
} from '../../../src/operations/oracle-health-envelope.js';
export {
  EscalationEnvelopeSchema,
  type EscalationEnvelope,
} from '../../../src/operations/escalation-envelope.js';
export {
  RollbackPlanSchema,
  type RollbackPlan,
} from '../../../src/operations/rollback-plan.js';
export {
  LatencyHistogramEnvelopeSchema,
  type LatencyHistogramEnvelope,
} from '../../../src/operations/latency-histogram-envelope.js';
export {
  EpicCheckpointSchema,
  type EpicCheckpoint,
} from '../../../src/operations/epic-checkpoint.js';
export {
  PlanSignoffEnvelopeSchema,
  SignoffActorClassSchema,
  SignoffTierSchema,
  type PlanSignoffEnvelope,
  type SignoffActorClass,
  type SignoffTier,
} from '../../../src/governance/plan-signoff-envelope.js';
export {
  PlanAmendmentRequestSchema,
  type PlanAmendmentRequest,
} from '../../../src/governance/plan-amendment-request.js';
export {
  ChallengeSchema,
  type Challenge,
} from '../../../src/governance/challenge.js';
export {
  ChallengeTypeSchema,
  ChallengeRequestedEffectSchema,
  CHALLENGE_TYPES,
  CHALLENGE_REQUESTED_EFFECTS,
  type ChallengeType,
  type ChallengeRequestedEffect,
} from '../../../src/governance/challenge-types.js';
export {
  CanonicalRunSchema,
  RequiredPhaseSchema,
  validateCanonicalRunCR1,
  type CanonicalRun,
  type RequiredPhase,
} from '../../../src/canonical/canonical-run.js';
export {
  PhaseKindSchema,
  PHASE_KINDS,
  type PhaseKind,
} from '../../../src/canonical/phase-kinds.js';

// v8.6.0 FR-C constraint builtins (4 standalone evaluators)
export { evaluateNonceUniquePerSignerWindow } from '../../../src/constraints/builtins/nonce-unique-per-signer-window.js';
export { evaluateSequenceMonotonicPerCluster } from '../../../src/constraints/builtins/sequence-monotonic-per-cluster.js';
export { evaluateChainValidatorPrevHash } from '../../../src/constraints/builtins/chain-validator-prev-hash.js';
export { evaluatePlanContentHashUnchangedSinceSignoff } from '../../../src/constraints/builtins/plan-content-hash-unchanged-since-signoff.js';

// Cross-cutting — version constants needed by consumers checking against the
// stub's contract version.
export {
  CONTRACT_VERSION,
  MIN_SUPPORTED_VERSION,
  SCHEMA_BASE_URL,
} from '../../../src/version.js';
