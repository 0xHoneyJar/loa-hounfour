/**
 * `PlanSignoffEnvelopeSchema` — Tier-2/Tier-3 plan signoff envelope
 * (FR-B9, v8.6.0).
 *
 * The signoff envelope binds a plan (identified by
 * `plan_content_hash`) to a signing actor at a specific tier. The
 * envelope is `x-crypto-bearing` (carries an Ed25519 signature over
 * the canonical-JSON form) and `x-chain-bearing` (carries
 * `prev_envelope_hash` + `parent_signoff_hash` for ledger
 * continuity), so by default `validate(...)` returns
 * `CRYPTO_DEFERRED` until consumers opt in via `acceptDeferred`.
 *
 * **Schema-level invariants**:
 *   - `tier` enum stays at `{T2, T3}`. T0/T1 cannot signoff —
 *     non-T2/T3 values are rejected by the schema, NOT by consumer
 *     policy. Future widening (e.g. `T1_with_conditions`) is
 *     strict-additive on the `tier` enum.
 *   - `signoff_actor_class` enum is exhaustive at three members:
 *     `single_operator`, `jury_panel`, `delegate`. **v1 acceptance
 *     accepts only `single_operator`** is a CONSUMER-SIDE gate per
 *     [`prd.md:269-271`] — the schema admits all three.
 *   - `cumulative_drift_pct ≥ 0`. The auto-revoke THRESHOLD is
 *     consumer policy per ADR-010 / R7 — the schema does not
 *     specify a threshold value.
 *   - `ttl_seconds_at_emit` is **string-encoded** (CT-03; pattern
 *     `^[1-9][0-9]*$`). "0" is reserved as the expired-on-emit
 *     sentinel and is rejected at the schema layer. The upper
 *     bound `2^53-1` is enforced consumer-side per AT-8 (JSON
 *     Schema's numeric `maximum` cannot apply to a string-encoded
 *     field). Consumers parse to BigInt after schema validation;
 *     the regex guarantees the parse without try/catch.
 *   - `chain_refs.parent_signoff_hash` is nullable. `null` =
 *     first signoff in the chain.
 *
 * **FR-C4 binding** — the LOCAL builtin
 * `plan_content_hash_unchanged_since_signoff` cross-checks
 * `plan_content_hash` against the consumer's signoff ledger and
 * surfaces `SIGNOFF_TTL_OBSERVED` on the pass path so consumers
 * cannot accidentally validate plan-hash without seeing TTL inputs
 * (NA-3 / SDD §4.5).
 *
 * @see SDD §3.11 — FR-B9 schema spec
 * @see SDD §4.5 — FR-C4 builtin spec
 * @since v8.6.0 — FR-B9 (PR-A3.6)
 */
import { Type, type Static } from '@sinclair/typebox';
import { ED25519_SIGNATURE_PATTERN } from './signature-envelope.js';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';

/**
 * Class of actor authorized to sign off on a plan.
 *
 * Three exhaustive members. **v1 acceptance accepts only
 * `single_operator`** is a consumer-side gate per
 * [`prd.md:269-271`] — the schema admits all three. Widening this
 * enum is strict-additive (existing values continue to validate).
 */
export const SignoffActorClassSchema = Type.Union(
  [
    Type.Literal('single_operator'),
    Type.Literal('jury_panel'),
    Type.Literal('delegate'),
  ],
  {
    $id: 'SignoffActorClass',
    description:
      'Exhaustive 3-member enum for the actor class authorizing a ' +
      'plan signoff. Schema admits all three; v1 acceptance accepts ' +
      'only `single_operator` is a consumer-side gate per ' +
      'prd.md:269-271 / ADR-010, NOT a schema-level constraint.',
  },
);
export type SignoffActorClass = Static<typeof SignoffActorClassSchema>;

/**
 * Plan-execution tier authorized to issue a signoff. T0/T1 are
 * EXCLUDED — only T2 and T3 may signoff. The exclusion is
 * enforced at the schema layer; non-T2/T3 values fail validation.
 *
 * Future widening (e.g. `T1_with_conditions`, `T0_emergency`) is
 * strict-additive on the enum and requires no migration on the
 * existing two literals.
 */
export const SignoffTierSchema = Type.Union(
  [Type.Literal('T2'), Type.Literal('T3')],
  {
    $id: 'SignoffTier',
    description:
      'Schema-restricted signoff tier. T0/T1 are explicitly excluded ' +
      '(rejected at validate() time). Widening to T0/T1/etc. is ' +
      'strict-additive; consumers built against the v8.6.0 enum ' +
      'continue to validate T2/T3 unchanged.',
  },
);
export type SignoffTier = Static<typeof SignoffTierSchema>;

export const PlanSignoffEnvelopeSchema = Type.Object(
  {
    envelope_kind: Type.Literal('plan_signoff', {
      description:
        'Discriminator literal pinning the plan-signoff shape. ' +
        'Distinguishes from `plan_amendment_request` (FR-B10) and ' +
        'other envelope kinds in the cycle-005 surface.',
    }),
    contract_version: Type.Literal('8.6.0', {
      description:
        'Hounfour contract version. Pinned to "8.6.0" for the ' +
        'cycle-005 ship line.',
    }),
    ts: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at signoff emission (Z suffix). ' +
        'Date.parse(ts) yields the absolute emit-time epoch ' +
        'milliseconds; `ts + ttl_seconds_at_emit * 1000` is the ' +
        'absolute expiry epoch.',
    }),
    cluster_id: Type.String({
      minLength: 1,
      description:
        'Stable cluster identifier (consumer-shaped — hounfour does ' +
        'not freeze the namespace). Identifies the cluster the ' +
        'signoff is scoped to.',
    }),
    plan_content_hash: Type.String({
      pattern: SHA256_HEX_PATTERN,
      description:
        'sha256:<64-hex> content hash of the plan being signed off. ' +
        'FR-C4 `plan_content_hash_unchanged_since_signoff` cross- ' +
        'checks this against the consumer\'s signoff ledger; on ' +
        'match, the manifest emits `SIGNOFF_TTL_OBSERVED` carrying ' +
        '`ts_emit + ttl_until_ms` (NA-3).',
    }),
    signoff_actor_class: SignoffActorClassSchema,
    signoff_actor_id: Type.String({
      minLength: 1,
      description:
        'Stable identifier for the signing actor (consumer-shaped). ' +
        'Resolution of the actor\'s public key is consumer-side via ' +
        'their Keyring (NF-1 boundary).',
    }),
    tier: SignoffTierSchema,
    reason: Type.String({
      minLength: 1,
      maxLength: 8192,
      description:
        'Free-text rationale for the signoff. Capped at 8 KB code ' +
        'points (JSON Schema 2020-12 §6.3.1); the canonical-JSON ' +
        'byte length is bounded by the cluster\'s envelope-cap ' +
        'policy (consumer-side).',
    }),
    ttl_seconds_at_emit: Type.String({
      pattern: '^[1-9][0-9]*$',
      maxLength: 19,
      description:
        'String-encoded positive integer TTL in seconds at emission ' +
        'time (CT-03). Pattern `^[1-9][0-9]*$` rejects "0" (reserved ' +
        'as expired-on-emit sentinel) and any leading-zero form. ' +
        'The upper bound `2^53-1` is enforced consumer-side per ' +
        'AT-8: JSON Schema\'s numeric `maximum` cannot apply to a ' +
        'string-encoded field. **`maxLength: 19` (iter-2 F5 ' +
        'mitigation):** caps the digit count at 19 — the ' +
        'representation length of `2^63-1`, the Int64 ceiling — to ' +
        'prevent unbounded BigInt-parse DoS on attacker-controlled ' +
        'payloads. The 2^53-1 (Number.MAX_SAFE_INTEGER, 16 digits) ' +
        'consumer ceiling per AT-8 is well within this cap; the ' +
        '19-digit cap is a defense-in-depth structural guard, not ' +
        'the semantic ceiling. Consumers parse via ' +
        '`BigInt(envelope.ttl_seconds_at_emit)` after validation; ' +
        'the regex + cap guarantee a bounded-cost successful parse ' +
        'without try/catch.',
    }),
    chain_refs: Type.Object(
      {
        prev_envelope_hash: Type.String({
          pattern: SHA256_HEX_PATTERN,
          description:
            'sha256:<64-hex> hash of the previous envelope\'s ' +
            'canonical-JSON form. The genesis-position envelope ' +
            'uses ' +
            '"sha256:0000000000000000000000000000000000000000000000000000000000000000" ' +
            'as the chain anchor.',
        }),
        parent_signoff_hash: Type.Union(
          [Type.String({ pattern: SHA256_HEX_PATTERN }), Type.Null()],
          {
            description:
              'sha256:<64-hex> hash of the parent signoff envelope, ' +
              'or `null` for the first signoff in the chain. ' +
              'Distinct from `prev_envelope_hash`: the latter is ' +
              'envelope-chain continuity, the former is signoff- ' +
              'lineage continuity (one signoff supersedes another).',
          },
        ),
      },
      {
        additionalProperties: false,
        description:
          'Chain references: envelope-level continuity ' +
          '(prev_envelope_hash) plus signoff-lineage continuity ' +
          '(parent_signoff_hash, nullable).',
      },
    ),
    cumulative_drift_pct: Type.Number({
      minimum: 0,
      description:
        'Cumulative plan-execution drift as a non-negative percent. ' +
        'The auto-revoke THRESHOLD is consumer policy per ADR-010 / ' +
        'R7; the schema only enforces non-negativity. Consumer ' +
        'configures the threshold per their tolerance.',
    }),
    signature: Type.String({
      pattern: ED25519_SIGNATURE_PATTERN,
      description:
        'Ed25519 signature value (unpadded base64url, 86 chars after ' +
        'the "ed25519:" prefix) over the RFC 8785 canonical-JSON ' +
        'of all-other-fields. Hounfour does NOT verify; ' +
        'consumer-side verification per NF-1.',
    }),
  },
  {
    $id: 'PlanSignoffEnvelope',
    additionalProperties: false,
    'x-crypto-bearing': true,
    'x-chain-bearing': true,
    description:
      'Plan-signoff envelope binding a plan (plan_content_hash) to a ' +
      'signing actor at a specific tier. Crypto-bearing ' +
      '(Ed25519 signature) + chain-bearing (prev_envelope_hash + ' +
      'parent_signoff_hash). FR-C4 cross-checks plan_content_hash ' +
      'against the consumer\'s signoff ledger and surfaces the ' +
      'SIGNOFF_TTL_OBSERVED manifest entry on hash-match (NA-3).',
  },
);

export type PlanSignoffEnvelope = Static<typeof PlanSignoffEnvelopeSchema>;
