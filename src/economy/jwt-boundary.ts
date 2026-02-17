/**
 * JWT Boundary Verification Spec — cross-system economic verification protocol.
 *
 * Defines the 6-step verification pipeline that runs at every service boundary
 * in the agent economy. This is the protocol's equivalent of the TLS handshake —
 * trust establishment before any economic data is exchanged.
 *
 * @see SDD §2.2 — JWT Boundary Verification (FR-2)
 * @see Issue #13 §2 — 6-step JWT boundary from arrakis
 */
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';

/**
 * A single step in the JWT boundary verification pipeline.
 */
export const JwtVerificationStepSchema = Type.Object(
  {
    step_number: Type.Integer({ minimum: 1, maximum: 6 }),
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    error_code: Type.String({
      pattern: '^JWT_[A-Z_]+$',
      description: 'Error code on step failure (JWT_ prefix convention).',
    }),
    is_blocking: Type.Boolean({
      description: 'Whether failure at this step halts the entire pipeline.',
    }),
  },
  { additionalProperties: false },
);

export type JwtVerificationStep = Static<typeof JwtVerificationStepSchema>;

/**
 * Cross-system JWT boundary verification protocol specification.
 */
export const JwtBoundarySpecSchema = Type.Object(
  {
    spec_id: Type.String({ format: 'uuid' }),
    boundary_name: Type.String({ minLength: 1, description: 'Human-readable boundary identifier.' }),
    steps: Type.Array(JwtVerificationStepSchema, {
      minItems: 6,
      maxItems: 6,
      description: 'Exactly 6 ordered verification steps.',
    }),
    algorithm_whitelist: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Permitted signing algorithms (e.g., EdDSA).',
    }),
    claims_schema_ref: Type.String({
      minLength: 1,
      description: 'Registry schema name resolvable via schemas/index.json. FL-PRD-002.',
    }),
    replay_window_seconds: Type.Integer({
      minimum: 1,
      maximum: 3600,
      description: 'JTI replay detection window in seconds.',
    }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'JwtBoundarySpec',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Cross-system JWT boundary verification protocol specification (6-step pipeline).',
  },
);

export type JwtBoundarySpec = Static<typeof JwtBoundarySpecSchema>;

/**
 * JWT claims for outbound economic requests (service → service).
 */
export const OutboundClaimsSchema = Type.Object(
  {
    sub: Type.String({ minLength: 1, description: 'Subject (agent ID).' }),
    iss: Type.String({ minLength: 1, description: 'Issuer (service ID).' }),
    aud: Type.String({ minLength: 1, description: 'Audience (target service).' }),
    jti: Type.String({ format: 'uuid', description: 'JWT ID for replay detection.' }),
    iat: Type.Integer({ minimum: 0, description: 'Issued at (Unix timestamp).' }),
    exp: Type.Integer({ minimum: 0, description: 'Expiration (Unix timestamp).' }),
    reservation_id: Type.String({ format: 'uuid', description: 'Linked capacity reservation.' }),
    budget_remaining_micro: MicroUSDUnsigned,
    authority_scope: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Delegated permissions for this boundary crossing.',
    }),
  },
  {
    $id: 'OutboundClaims',
    additionalProperties: false,
    description: 'JWT claims for outbound economic requests.',
  },
);

export type OutboundClaims = Static<typeof OutboundClaimsSchema>;

/**
 * JWT claims for inbound economic responses (service → service).
 */
export const InboundClaimsSchema = Type.Object(
  {
    sub: Type.String({ minLength: 1 }),
    iss: Type.String({ minLength: 1 }),
    aud: Type.String({ minLength: 1 }),
    jti: Type.String({ format: 'uuid' }),
    iat: Type.Integer({ minimum: 0 }),
    exp: Type.Integer({ minimum: 0 }),
    reservation_id: Type.String({ format: 'uuid' }),
    budget_remaining_micro: MicroUSDUnsigned,
    authority_scope: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    actual_cost_micro: MicroUSDUnsigned,
    model_used: Type.String({ minLength: 1, description: 'Which model fulfilled the request.' }),
    tokens_used: Type.Integer({ minimum: 0, description: 'Total tokens consumed.' }),
  },
  {
    $id: 'InboundClaims',
    additionalProperties: false,
    description: 'JWT claims for inbound economic responses with actual cost data.',
  },
);

export type InboundClaims = Static<typeof InboundClaimsSchema>;

/**
 * Canonical 6-step JWT boundary verification pipeline.
 *
 * @see Issue #13 §2 — original arrakis jwt-boundary.ts
 */
export const CANONICAL_JWT_BOUNDARY_STEPS: readonly JwtVerificationStep[] = [
  { step_number: 1, name: 'Signature verification', description: 'Verify EdDSA/Ed25519 signature', error_code: 'JWT_SIGNATURE_INVALID', is_blocking: true },
  { step_number: 2, name: 'Algorithm whitelist', description: 'Verify signing algorithm is permitted', error_code: 'JWT_ALGORITHM_REJECTED', is_blocking: true },
  { step_number: 3, name: 'Claims validation', description: 'Validate inbound claims against schema', error_code: 'JWT_CLAIMS_INVALID', is_blocking: true },
  { step_number: 4, name: 'Reservation existence', description: 'Verify referenced reservation exists and is active', error_code: 'JWT_RESERVATION_NOT_FOUND', is_blocking: true },
  { step_number: 5, name: 'Replay detection', description: 'Verify JTI not in idempotency store', error_code: 'JWT_REPLAY_DETECTED', is_blocking: true },
  { step_number: 6, name: 'Overspend guard', description: 'Verify actual_cost <= reserved_amount', error_code: 'JWT_OVERSPEND', is_blocking: true },
] as const;
