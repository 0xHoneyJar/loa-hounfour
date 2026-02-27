/**
 * QuarantineRecord — records quarantined audit trail entries.
 *
 * When a hash chain discontinuity is detected, affected entries after
 * the break are quarantined. The QuarantineRecord tracks the lifecycle:
 * active → reconciled → dismissed.
 *
 * @see SDD §4.8.2 — QuarantineRecord
 * @since v8.0.0
 */
import { Type } from '@sinclair/typebox';
/**
 * Quarantine lifecycle status.
 *
 * @governance protocol-fixed
 */
export const QuarantineStatusSchema = Type.Union([
    Type.Literal('active'),
    Type.Literal('reconciled'),
    Type.Literal('dismissed'),
], {
    $id: 'QuarantineStatus',
    description: 'active: entries under investigation. '
        + 'reconciled: entries verified and reintegrated. '
        + 'dismissed: entries permanently rejected.',
});
/**
 * Record of quarantined audit trail entries.
 */
export const QuarantineRecordSchema = Type.Object({
    quarantine_id: Type.String({ format: 'uuid' }),
    discontinuity_id: Type.String({ format: 'uuid' }),
    resource_type: Type.String({ minLength: 1 }),
    resource_id: Type.String({ minLength: 1 }),
    status: QuarantineStatusSchema,
    quarantined_at: Type.String({ format: 'date-time' }),
    resolved_at: Type.Optional(Type.String({ format: 'date-time' })),
    first_affected_index: Type.Integer({ minimum: 0 }),
    last_affected_index: Type.Integer({ minimum: 0 }),
    resolution_notes: Type.Optional(Type.String({ maxLength: 2000 })),
}, {
    $id: 'QuarantineRecord',
    additionalProperties: false,
    description: 'Record of quarantined audit trail entries after hash chain discontinuity.',
});
//# sourceMappingURL=quarantine.js.map