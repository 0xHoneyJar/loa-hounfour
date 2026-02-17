/**
 * InterAgentTransactionAudit schema — double-entry audit for agent-to-agent transfers.
 *
 * Every inter-agent economic transaction produces an audit entry. The schema
 * enforces conservation invariants: what the sender loses, the receiver gains.
 * Uses the epistemic tristate (conserved | violated | unverifiable) from
 * ConservationStatus to declare verification state.
 *
 * @see SDD §2.2 — InterAgentTransactionAudit (FR-2)
 * @see "Distributional AGI Safety" (arXiv:2512.16856)
 */
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';
import { ConservationStatusSchema } from '../vocabulary/conservation-status.js';

const TransactionPartySchema = Type.Object(
  {
    agent_id: Type.String({ minLength: 1 }),
    pre_balance_micro: MicroUSDUnsigned,
    post_balance_micro: MicroUSDUnsigned,
  },
  { additionalProperties: false }
);

export const InterAgentTransactionAuditSchema = Type.Object(
  {
    audit_id: Type.String({ format: 'uuid' }),
    transaction_type: Type.Union([
      Type.Literal('peer_transfer'),
      Type.Literal('delegation_budget'),
      Type.Literal('service_payment'),
      Type.Literal('governance_proposal_deposit'),
    ]),
    sender: TransactionPartySchema,
    receiver: TransactionPartySchema,
    amount_micro: MicroUSDUnsigned,
    conservation_check: ConservationStatusSchema,
    idempotency_key: Type.String({
      minLength: 1,
      description: 'FL-SDD-003: Prevents duplicate processing. Uniqueness scope is per-sender agent_id. Consumers MUST reject duplicate keys within retention window.',
    }),
    delegation_chain_id: Type.Optional(Type.String({
      format: 'uuid',
      'x-references': [{ target_schema: 'DelegationChain', target_field: 'chain_id', relationship: 'references' }],
    } as Record<string, unknown>)),
    governance_context: Type.Optional(Type.Object(
      {
        proposal_id: Type.Optional(Type.String({
          'x-references': [{ target_schema: 'ConstraintProposal', target_field: 'proposal_id', relationship: 'references' }],
        } as Record<string, unknown>)),
        governance_version: Type.Optional(Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' })),
      },
      { additionalProperties: false }
    )),
    sequence_number: Type.Optional(Type.Integer({
      minimum: 0,
      description: 'FL-SDD-001: Per-agent monotonic counter for ordering audit records during reconstruction',
    })),
    timestamp: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  {
    $id: 'InterAgentTransactionAudit',
    $comment: 'Financial amounts use string-encoded BigInt (MicroUSD). See vocabulary/currency.ts.',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Protocol-standard audit trail for agent-to-agent economic transactions.',
  }
);

export type InterAgentTransactionAudit = Static<typeof InterAgentTransactionAuditSchema>;
