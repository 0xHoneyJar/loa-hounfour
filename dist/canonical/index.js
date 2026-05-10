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
// v8.7.0 cluster-level coordination schemas — STUBs in PR-A4.0;
// full bodies land in PR-A4.1..A4.5. Each stub returns Type.Never()
// so any payload fails validation against it, signaling the schema
// is not yet ready for consumer use at the alpha tag.
export { ClusterRunSeriesSchema, } from './cluster-run-series.js';
export { InterSeriesScopingArtifactSchema, } from './inter-series-scoping-artifact.js';
export { SubscriptionPoolStateSchema, } from './subscription-pool-state.js';
export { RevocationListSchema, } from './revocation-list.js';
export { MergeArtifactSchema, } from './merge-artifact.js';
//# sourceMappingURL=index.js.map