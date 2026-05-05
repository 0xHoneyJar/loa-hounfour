/**
 * OrgIdentity — cold-storage org public key + current representatives + constitutional hash.
 *
 * Carries the long-lived cryptographic root of an organization (`org_public_key`),
 * the snapshot of currently-active representative `AgentIdentity` records, and a
 * `constitutional_hash` binding the org to its founding constraint set.
 *
 * The minimum-representative invariant (`current_representatives.length >= 1`,
 * SP-007) is enforced both as a TypeBox `minItems: 1` field constraint and as
 * the OI-1 rule in `constraints/OrgIdentity.constraints.json`. The constraint
 * file binds cross-runner conformance; this schema enforces it at the
 * library/structural level.
 *
 * @see SDD section 3.4.1 — OrgIdentity required fields
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-B1)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AgentIdentitySchema } from '../schemas/agent-identity.js';

export const OrgIdentitySchema = Type.Object(
  {
    org_id: Type.String({
      format: 'uuid',
      description: 'UUID v4 identifying the organization.',
    }),
    org_public_key: Type.String({
      pattern: '^ed25519-pub:[A-Za-z0-9_-]{43,44}$',
      description: 'Cold-storage Ed25519 public key bound to the org root of trust.',
    }),
    current_representatives: Type.Array(AgentIdentitySchema, {
      minItems: 1,
      description:
        'Snapshot of currently-active representative AgentIdentity records. '
        + 'SP-007 invariant: MUST contain at least one entry; consumer-side '
        + 'state-store rejects writes that would drain this array.',
    }),
    constitutional_hash: Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description: 'SHA-256 digest of the org\'s founding constraint set.',
    }),
    created_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the org was registered.',
    }),
    updated_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp of the most recent representative or hash update.',
    }),
  },
  {
    $id: 'OrgIdentity',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description:
      'Org root identity: org_id + cold-storage public key + active representatives + '
      + 'constitutional hash. Cross-field rule OI-1 in constraints/OrgIdentity.constraints.json.',
  },
);
export type OrgIdentity = Static<typeof OrgIdentitySchema>;
