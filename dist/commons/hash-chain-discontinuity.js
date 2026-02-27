/**
 * HashChainDiscontinuity — event schema for hash chain breaks.
 *
 * Emitted when verifyAuditTrailIntegrity() detects a content or chain
 * hash mismatch. Triggers the halt-and-reconcile protocol defined in ADR-006.
 *
 * @see SDD §4.8.1 — HashChainDiscontinuity Event (FR-3.1)
 * @since v8.0.0
 */
import { Type } from '@sinclair/typebox';
/**
 * Event recording a detected hash chain discontinuity.
 */
export const HashChainDiscontinuitySchema = Type.Object({
    discontinuity_id: Type.String({ format: 'uuid' }),
    resource_type: Type.String({
        minLength: 1,
        description: 'Schema $id of the affected resource.',
    }),
    resource_id: Type.String({ minLength: 1 }),
    detected_at: Type.String({ format: 'date-time' }),
    entry_index: Type.Integer({ minimum: 0 }),
    expected_hash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
    actual_hash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
    last_known_good_index: Type.Integer({ minimum: -1 }),
    affected_entries: Type.Integer({ minimum: 0 }),
    detector: Type.String({
        minLength: 1,
        description: 'Identifier of the service/component that detected the discontinuity.',
    }),
    failure_phase: Type.Union([Type.Literal('content'), Type.Literal('chain')], { description: 'Which verification phase detected the failure.' }),
}, {
    $id: 'HashChainDiscontinuity',
    additionalProperties: false,
    description: 'Event recording a detected hash chain discontinuity in an audit trail. '
        + 'Triggers halt-and-reconcile protocol (ADR-006).',
});
//# sourceMappingURL=hash-chain-discontinuity.js.map