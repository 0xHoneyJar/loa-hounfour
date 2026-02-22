/**
 * Reputation Portability Protocol — cross-collection reputation transfer.
 *
 * Enables personalities to request portability of their reputation
 * between collections/pools. Supports full, score-only, and state-only
 * scopes with governance approval workflow.
 *
 * @see DR-S2 — Deep Bridgebuilder Review SPECULATION finding
 * @since v7.5.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Portability Scope
// ---------------------------------------------------------------------------

export const PortabilityScopeSchema = Type.Union(
  [
    Type.Literal('full'),
    Type.Literal('score_only'),
    Type.Literal('state_only'),
  ],
  {
    $id: 'PortabilityScope',
    description: 'Scope of reputation data to transfer: full (score + state + history), score_only, or state_only.',
  },
);

export type PortabilityScope = Static<typeof PortabilityScopeSchema>;

// ---------------------------------------------------------------------------
// Reputation Portability Request
// ---------------------------------------------------------------------------

export const ReputationPortabilityRequestSchema = Type.Object({
  request_id: Type.String({ format: 'uuid' }),
  personality_id: Type.String({ minLength: 1 }),
  source_collection_id: Type.String({ minLength: 1 }),
  source_pool_id: Type.String({ minLength: 1 }),
  target_collection_id: Type.String({ minLength: 1 }),
  target_pool_id: Type.String({ minLength: 1 }),
  scope: PortabilityScopeSchema,
  justification: Type.String({
    minLength: 1,
    description: 'Reason for requesting reputation portability.',
  }),
  requested_at: Type.String({ format: 'date-time' }),
  expires_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'ReputationPortabilityRequest',
  additionalProperties: false,
  description: 'A request to transfer reputation data between collections.',
});

export type ReputationPortabilityRequest = Static<typeof ReputationPortabilityRequestSchema>;

// ---------------------------------------------------------------------------
// Portability Response
// ---------------------------------------------------------------------------

export const PortabilityResponseSchema = Type.Object({
  response_id: Type.String({ format: 'uuid' }),
  request_id: Type.String({ format: 'uuid' }),
  responder_collection_id: Type.String({ minLength: 1 }),
  decision: Type.Union([
    Type.Literal('accepted'),
    Type.Literal('rejected'),
    Type.Literal('pending_governance'),
  ], {
    description: 'The decision on the portability request.',
  }),
  credential_id: Type.Optional(Type.String({
    format: 'uuid',
    description: 'Credential ID issued when accepted. Required when decision is accepted.',
  })),
  rejection_reason: Type.Optional(Type.String({
    minLength: 1,
    description: 'Reason for rejection. Required when decision is rejected.',
  })),
  governance_proposal_id: Type.Optional(Type.String({
    format: 'uuid',
    description: 'Governance proposal ID. Required when decision is pending_governance.',
  })),
  responded_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'PortabilityResponse',
  additionalProperties: false,
  description: 'Response to a reputation portability request.',
});

export type PortabilityResponse = Static<typeof PortabilityResponseSchema>;
