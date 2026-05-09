/**
 * AuditTrailEntry schema — bidirectional provenance linking completions to billing.
 *
 * Every AI inference completion produces a billing entry. The AuditTrailEntry
 * provides the bidirectional link: given a completion you can find the bill,
 * and given a bill you can find the completion. This is the "receipt" that
 * proves conservation of value across the inference pipeline.
 *
 * @see SDD §3.7 — AuditTrailEntry
 */
import { Type } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';
import { ConservationStatusSchema } from '../vocabulary/conservation-status.js';
/**
 * Bidirectional provenance entry linking completion → billing → conservation.
 */
export const AuditTrailEntrySchema = Type.Object({
    entry_id: Type.String({ format: 'uuid', description: 'Unique identifier for this audit trail entry' }),
    completion_id: Type.String({
        format: 'uuid',
        description: 'The completion that generated cost',
        'x-references': [{ target_schema: 'InvokeResponse', target_field: 'id', relationship: 'references' }],
    }),
    billing_entry_id: Type.String({
        format: 'uuid',
        description: 'The billing entry that recorded cost',
        'x-references': [{ target_schema: 'BillingEntry', target_field: 'entry_id', relationship: 'references' }],
    }),
    agent_id: Type.String({ minLength: 1, description: 'Agent that requested the completion' }),
    provider: Type.String({ minLength: 1, description: 'Model provider identifier (e.g. "openai", "anthropic")' }),
    model_id: Type.String({ minLength: 1, description: 'Model identifier used for the completion' }),
    cost_micro: MicroUSD,
    timestamp: Type.String({ format: 'date-time', description: 'When the audit entry was created' }),
    conservation_status: ConservationStatusSchema,
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version at the time of the entry',
    }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
        description: 'Optional metadata for extensions (10KB limit)',
    })),
}, {
    $id: 'AuditTrailEntry',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Bidirectional provenance entry linking completion → billing → conservation status.',
});
//# sourceMappingURL=audit-trail-entry.js.map