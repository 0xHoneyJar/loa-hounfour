/**
 * OrgRepresentativeDelegation — append-only delegation log binding org public
 * key → representative AgentIdentity, optionally chained through prior
 * delegations to a genesis sentinel.
 *
 * Each record is Ed25519-signed and bears a `signing_context` envelope
 * (audience = org_id, scope = `'org-delegation/grant'` | `'org-delegation/revoke'`,
 * contract_version) to prevent cross-org and cross-lifecycle replay.
 *
 * The chain is rooted at the literal genesis sentinel string
 * `"genesis:org-public-key"` (SDD section 3.6 ORD-3): the first delegation in
 * a chain has `granted_by == "genesis:org-public-key"`; subsequent records
 * have `granted_by == <prior-delegation-id>`. Maximum chain depth is 20.
 *
 * Cross-field rules ORD-1..3 (constraints/OrgRepresentativeDelegation.constraints.json):
 *   - ORD-1: Ed25519 signature verification — *runtime-deferred* per NF-1
 *   - ORD-2: revocation lifecycle append-only — *runtime-deferred* (single-record stateless)
 *   - ORD-3: chain validity + depth bound — *library*, via `is_valid_dag` (PR-A1.3)
 *
 * **ORD-3 chain-context obligation (consumer-supplied).** ORD-3 references
 * `granted_by_chain_records` — a name that is NOT a field on this schema.
 * The library evaluator picks up this name only when the consumer constructs
 * a validation-context object of the form
 * `{ ...orgRepresentativeDelegationFields, granted_by_chain_records: [...] }`
 * and passes it to the validator. The chain array MUST contain the record
 * under validation plus all ancestors back to (and including) the genesis-
 * rooted record, AND a synthetic terminator entry of the form
 * `{ delegation_id: 'genesis:org-public-key' }` so that `is_valid_dag` can
 * resolve the genesis-rooted record's `granted_by` reference against its
 * id-index (without the synthetic terminator the dangling-ref check would
 * misclassify the sentinel pointer). When `granted_by_chain_records` is
 * omitted, ORD-3 evaluates to vacuous-true; consumers SHOULD treat absence-
 * of-context as a configuration error in their integration suite, not
 * permission to skip enforcement. Reference walk-through and worked example
 * land in `docs/architecture/org-overseer.md` (PR-A1.6).
 *
 * @see SDD section 3.4.2 — OrgRepresentativeDelegation required fields, signing_context binding
 * @see SDD section 3.6 — ORD-3 genesis sentinel encoding
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-B2)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AgentIdentitySchema } from '../schemas/agent-identity.js';
import { SigningContextSchema } from './signing-context.js';

/**
 * Genesis sentinel literal string. The first delegation in a chain (granted
 * directly by the cold-storage `org_public_key`) records `granted_by` as
 * this exact value. Stable cross-runner per SDD section 3.6.
 */
export const ORG_DELEGATION_GENESIS_SENTINEL = 'genesis:org-public-key' as const;

export const OrgRepresentativeDelegationSchema = Type.Object(
  {
    delegation_id: Type.String({
      format: 'uuid',
      description: 'UUID v4 identifying this delegation record.',
    }),
    org_id: Type.String({
      format: 'uuid',
      description: 'UUID v4 of the org this delegation is scoped to.',
    }),
    representative: AgentIdentitySchema,
    capability_scope: Type.Record(Type.String(), Type.Unknown(), {
      description:
        'Domain-specific capability scope. Keys are consumer-defined. '
        + 'Library does not interpret the contents; consumer-side authorization '
        + 'evaluates against this object. JSON Schema emits `patternProperties` '
        + 'for this field by design — consumers MUST NOT add '
        + '`additionalProperties: false` here, which would over-constrain '
        + 'otherwise-valid records. This is the only field in the schema '
        + 'that is intentionally open at the wire level; tightening will '
        + 'come (if needed) via a future MINOR addition.',
    }),
    expiry: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp after which this delegation is no longer effective.',
    }),
    revocation: Type.Optional(
      Type.Object(
        {
          revoked: Type.Literal(true, {
            description:
              'Pinned to literal `true`. The presence of the revocation envelope is the '
              + 'semantic signal of revocation; the boolean is retained as an explicit '
              + 'sentinel so consumers do not need to reason about envelope presence. '
              + 'Setting `revoked: false` is structurally unrepresentable, which subsumes '
              + 'the ORD-2 append-only-revoked invariant at the schema layer (ORD-2 '
              + 'remains runtime-deferred for the cross-record "no later record may '
              + 'reset to absent-envelope" obligation).',
          }),
          revoked_at: Type.String({
            format: 'date-time',
            description: 'ISO 8601 timestamp at which this delegation was revoked.',
          }),
          revoked_by: Type.String({
            pattern: '^[a-z][a-z0-9_-]{2,63}$',
            description:
              'Pattern matches `AgentIdentity.agent_id` (`^[a-z][a-z0-9_-]{2,63}$`) — '
              + 'this field references an agent in the consumer-side agent registry. '
              + 'Cross-record existence is consumer-enforced per NF-1.',
          }),
          reason: Type.Optional(
            Type.String({
              minLength: 1,
              maxLength: 1024,
              description: 'Optional human-readable revocation reason.',
            }),
          ),
        },
        {
          additionalProperties: false,
          description:
            'Revocation envelope. When present, this record revokes the delegation. The '
            + '`revoked` field is pinned to `true` so envelope-presence and boolean-value '
            + 'cannot disagree.',
        },
      ),
    ),
    granted_by: Type.Union(
      [
        Type.String({
          format: 'uuid',
          description: 'delegation_id reference to the prior link in the chain.',
        }),
        Type.Literal(ORG_DELEGATION_GENESIS_SENTINEL, {
          description: 'Genesis sentinel — chain rooted directly at org_public_key.',
        }),
      ],
      {
        description:
          'Either the prior delegation_id (UUID v4) in the chain, or the literal genesis '
          + 'sentinel "genesis:org-public-key" indicating direct grant by the cold-storage '
          + 'org_public_key. ORD-3 verifies chain reachability via the is_valid_dag builtin.',
      },
    ),
    chain_depth: Type.Integer({
      minimum: 0,
      maximum: 20,
      description:
        'Asserted depth of this delegation in the chain (0 for genesis-granted). '
        + 'Hard cap of 20; ORD-3 cross-checks against actual chain reachability.',
    }),
    signature: Type.String({
      pattern: '^ed25519:[A-Za-z0-9_-]{86}$',
      description:
        'Ed25519 signature over RFC 8785 canonical JSON of all-other-fields. '
        + 'Unpadded base64url per RFC 4648 §5: exactly 86 characters. '
        + 'Verification is consumer-side per NF-1 (ORD-1, runtime-deferred).',
    }),
    signed_by: Type.String({
      pattern: '^ed25519-pub:[A-Za-z0-9_-]{43,44}$',
      description: 'Ed25519 public key identifier of the signer.',
    }),
    signing_key_id: Type.String({
      minLength: 1,
      description: 'Stable key identifier for rotation tracking on the consumer side.',
    }),
    signing_algorithm: Type.Literal('ed25519', {
      description: 'Pinned to ed25519 for v8.4.0; future versions MAY widen this union additively.',
    }),
    signed_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which this delegation was signed.',
    }),
    signing_context: SigningContextSchema,
  },
  {
    $id: 'OrgRepresentativeDelegation',
    additionalProperties: false,
    'x-cross-field-validated': true,
    'x-chain-bearing': true,
    description:
      'Append-only delegation record binding org → representative, signed under '
      + 'a signing_context envelope. Cross-field rules in '
      + 'constraints/OrgRepresentativeDelegation.constraints.json (ORD-1..3). '
      + 'Carries `x-chain-bearing: true` — see TypeScript JSDoc on the export '
      + 'and MIGRATION.md v8.5.x → v8.6.0 §FR-A4 for the failClosed opt-in '
      + 'contract.',
  },
);
export type OrgRepresentativeDelegation = Static<typeof OrgRepresentativeDelegationSchema>;
