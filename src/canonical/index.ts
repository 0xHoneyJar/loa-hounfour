/**
 * `@0xhoneyjar/loa-hounfour/canonical` — canonical-run definitions.
 *
 * Source-of-truth shapes for cross-language conformance evaluation
 * against required-phases-per-EPIC (FR-B1 / PR-A3.8 / v8.6.0).
 * Hounfour ships only the shape; consumers compute conformance %
 * per ADR-010.
 */
export {
  PHASE_KINDS,
  PhaseKindSchema,
  type PhaseKind,
} from './phase-kinds.js';
export {
  CanonicalRunSchema,
  RequiredPhaseSchema,
  validateCanonicalRunCR1,
  type CanonicalRun,
  type RequiredPhase,
} from './canonical-run.js';

// v8.7.0 cluster-level coordination schemas. ClusterRunSeries body
// lands in PR-A4.1; remaining four schemas are STUBs (Type.Never())
// until their respective PRs ship in PR-A4.2..A4.5.
export {
  ClusterRunSeriesSchema,
  ClusterRunRepoStatusSchema,
  ClusterRunSeriesRepoEntrySchema,
  validateClusterRunSeries,
  type ClusterRunSeries,
  type ClusterRunRepoStatus,
  type ClusterRunSeriesRepoEntry,
} from './cluster-run-series.js';
export {
  InterSeriesScopingArtifactSchema,
  MerkleProofStepSchema,
  ProposedSeriesGoalSchema,
  validateInterSeriesScopingArtifact,
  type InterSeriesScopingArtifact,
  type MerkleProofStep,
  type ProposedSeriesGoal,
} from './inter-series-scoping-artifact.js';
export {
  SubscriptionPoolStateSchema,
  SubscriptionAccountStateSchema,
  SubscriptionAccountEntrySchema,
  RateEnvelopeSchema,
  validateSubscriptionPoolState,
  type SubscriptionPoolState,
  type SubscriptionAccountState,
  type SubscriptionAccountEntry,
  type RateEnvelope,
} from './subscription-pool-state.js';
export {
  RevocationListSchema,
  type RevocationList,
} from './revocation-list.js';
export {
  MergeArtifactSchema,
  type MergeArtifact,
} from './merge-artifact.js';
