/**
 * `@0xhoneyjar/loa-hounfour/canonical` — canonical-run definitions.
 *
 * Source-of-truth shapes for cross-language conformance evaluation
 * against required-phases-per-EPIC (FR-B1 / PR-A3.8 / v8.6.0).
 * Hounfour ships only the shape; consumers compute conformance %
 * per ADR-010.
 */
export { PHASE_KINDS, PhaseKindSchema, } from './phase-kinds.js';
export { CanonicalRunSchema, RequiredPhaseSchema, validateCanonicalRunCR1, } from './canonical-run.js';
// v8.7.0 cluster-level coordination schemas. ClusterRunSeries body
// lands in PR-A4.1; remaining four schemas are STUBs (Type.Never())
// until their respective PRs ship in PR-A4.2..A4.5.
export { ClusterRunSeriesSchema, ClusterRunRepoStatusSchema, ClusterRunSeriesRepoEntrySchema, validateClusterRunSeries, } from './cluster-run-series.js';
export { InterSeriesScopingArtifactSchema, MerkleProofStepSchema, ProposedSeriesGoalSchema, validateInterSeriesScopingArtifact, } from './inter-series-scoping-artifact.js';
export { SubscriptionPoolStateSchema, } from './subscription-pool-state.js';
export { RevocationListSchema, } from './revocation-list.js';
export { MergeArtifactSchema, } from './merge-artifact.js';
//# sourceMappingURL=index.js.map