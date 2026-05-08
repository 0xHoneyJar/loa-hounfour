/**
 * Operations module — cycle-005 oracle envelope cluster (FR-B3..B8)
 * + future cycle-005 schemas authored under `src/operations/`.
 *
 * Surface:
 *   - FR-B3 OracleDigestSchema + PulseKindSchema
 *   - FR-B4 OracleHealthEnvelopeSchema + ModelCallCircuitBreakerStateSchema
 *   - FR-B5 EscalationEnvelopeSchema + EscalationSeveritySchema
 *   - FR-B6 RollbackPlanSchema
 *   - FR-B7 LatencyHistogramEnvelopeSchema
 *   - FR-B8 EpicCheckpointSchema
 *
 * @since v8.6.0 — PR-A3.5 (FR-B3..B8)
 */

export {
  OracleDigestSchema,
  PulseKindSchema,
  type OracleDigest,
  type PulseKind,
} from './oracle-digest.js';

export {
  OracleHealthEnvelopeSchema,
  ModelCallCircuitBreakerStateSchema,
  type OracleHealthEnvelope,
  type ModelCallCircuitBreakerState,
} from './oracle-health-envelope.js';

export {
  EscalationEnvelopeSchema,
  EscalationSeveritySchema,
  type EscalationEnvelope,
  type EscalationSeverity,
} from './escalation-envelope.js';

export {
  RollbackPlanSchema,
  type RollbackPlan,
} from './rollback-plan.js';

export {
  LatencyHistogramEnvelopeSchema,
  type LatencyHistogramEnvelope,
} from './latency-histogram-envelope.js';

export {
  EpicCheckpointSchema,
  type EpicCheckpoint,
} from './epic-checkpoint.js';
