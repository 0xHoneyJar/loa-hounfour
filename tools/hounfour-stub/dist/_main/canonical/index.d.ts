/**
 * `@0xhoneyjar/loa-hounfour/canonical` — canonical-run definitions.
 *
 * Source-of-truth shapes for cross-language conformance evaluation
 * against required-phases-per-EPIC (FR-B1 / PR-A3.8 / v8.6.0).
 * Hounfour ships only the shape; consumers compute conformance %
 * per ADR-010.
 */
export { PHASE_KINDS, PhaseKindSchema, type PhaseKind, } from './phase-kinds.js';
export { CanonicalRunSchema, RequiredPhaseSchema, validateCanonicalRunCR1, type CanonicalRun, type RequiredPhase, } from './canonical-run.js';
export { ClusterRunSeriesSchema, ClusterRunRepoStatusSchema, ClusterRunSeriesRepoEntrySchema, validateClusterRunSeries, type ClusterRunSeries, type ClusterRunRepoStatus, type ClusterRunSeriesRepoEntry, } from './cluster-run-series.js';
export { InterSeriesScopingArtifactSchema, type InterSeriesScopingArtifact, } from './inter-series-scoping-artifact.js';
export { SubscriptionPoolStateSchema, type SubscriptionPoolState, } from './subscription-pool-state.js';
export { RevocationListSchema, type RevocationList, } from './revocation-list.js';
export { MergeArtifactSchema, type MergeArtifact, } from './merge-artifact.js';
//# sourceMappingURL=index.d.ts.map