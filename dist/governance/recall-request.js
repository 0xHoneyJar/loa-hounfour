/**
 * `RecallRequest` — input record for the recall machinery.
 *
 * Carries the subject agent, the surface context the recall is
 * scoped to, and the receipt detail level the requester wants on
 * the matching `RecallReceipt`. Crypto is consumer-side: an
 * `Optional` `requestor_signer_id` lets the consumer sign the
 * request via their own envelope; the request itself is shape-only.
 *
 * Per ADR-010 hounfour ships the shape (request envelope + scoping
 * fields) and consumers ship the policy (which agents are
 * recall-eligible, which signers may issue requests, what
 * `surface_context` namespace expansions are accepted).
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see SurfaceContextSchema
 * @see ReceiptDetailLevelSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { Type } from '@sinclair/typebox';
import { ReceiptDetailLevelSchema } from './receipt-detail-level.js';
import { SurfaceContextSchema } from './surface-context.js';
export const RecallRequestSchema = Type.Object({
    request_id: Type.String({
        format: 'uuid',
        description: 'Stable opaque identifier for this request (UUID v4).',
    }),
    subject_agent_id: Type.String({
        pattern: '^[a-z][a-z0-9_-]{2,63}$',
        description: 'The agent whose data is being recalled (consumer-coordinated id space).',
    }),
    surface_context: SurfaceContextSchema,
    detail_level: ReceiptDetailLevelSchema,
    requested_at: Type.String({
        format: 'date-time',
        description: 'ISO 8601 timestamp at which the request was minted.',
    }),
    requestor_signer_id: Type.Optional(Type.String({
        pattern: '^[a-z][a-z0-9_-]{2,63}$',
        description: 'Optional consumer-side signer-id reference. Hounfour ships shape only; consumer dereferences against its Keyring + verifies any wrapping signature envelope.',
    })),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Hounfour contract version this request was authored against.',
    }),
}, {
    $id: 'RecallRequest',
    additionalProperties: false,
    description: 'Input record for recall machinery. Carries subject_agent_id, surface_context (env scope), detail_level (verbosity selector for the matching RecallReceipt), and an Optional requestor_signer_id for consumer-side signing.',
});
//# sourceMappingURL=recall-request.js.map