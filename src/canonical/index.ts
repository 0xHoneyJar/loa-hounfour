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
  type CanonicalRun,
  type RequiredPhase,
} from './canonical-run.js';
