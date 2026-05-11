/**
 * `SubscriptionPoolStateSchema` — pool-state snapshot for shared-
 * capacity audits (FR-G3, v8.7.0).
 *
 * Pool-state snapshots for consumers that pool capacity (e.g. shared
 * API budget across EPICs in a series). Pool-capacity audits become
 * deterministic across consumers via this shape rather than per-
 * consumer ad-hoc representations.
 *
 * **Crypto-bearing, NOT chain-bearing**: carries `signer_cluster_id` +
 * `signature` (ed25519 pattern); consumers chain via the
 * `pause_resume_pair_id` idempotency marker rather than a
 * `prev_envelope_hash` chain. Default validation mode is shape-only
 * (manifest emits
 * `SUBSCRIPTION_POOL_STATE_SIGNATURE_VERIFICATION_CONTEXT_DEFERRED`)
 * unless the consumer opts in via `validate(..., { failClosed: true })`
 * per cycle-005 FR-A4. Default-flip to fail-closed is v9.0.0 work.
 *
 * **Financial values**: `accounts[*].allocated_units` and
 * `consumed_units` are string-encoded micro-USD per `^[0-9]+$` per
 * CLAUDE.md financial-value convention. No floating point — bigint-
 * safe comparison via LOCAL helper `string_micro_usd_le`.
 *
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid payload `s` returns a string equal to `s` when `s` is
 * the canonical-shaped form. NOT a cross-runtime byte-identity claim;
 * cross-runtime byte-identity is FR-A2 cross-language harness's
 * domain via RFC 8785 JCS.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/SubscriptionPoolState.constraints.json` —
 * SPS-1..SPS-4):
 *   - SPS-1: `accounts[*].consumed_units ≤ accounts[*].allocated_units`
 *     (LOCAL `string_micro_usd_le`; bigint-safe per CLAUDE.md
 *     financial-value convention).
 *   - SPS-2: `accounts[*].account_id` distinct (LOCAL
 *     `array_field_distinct`; third use site after CRS-4 and ISSA-2).
 *   - SPS-3: `signature` matches `signer_cluster_id` derivation —
 *     consumer-state per ADR-010; manifest emits
 *     `SUBSCRIPTION_POOL_STATE_SIGNATURE_VERIFICATION_CONTEXT_DEFERRED`.
 *     Reuses the v8.6.0 `signer_key_id_matches_derivation` builtin
 *     pattern at the consumer-side verifier layer.
 *   - SPS-4: `accounts[*].stable_until ≥ ts` (LOCAL `iso8601_ge_field`
 *     with JCS-canonical-form precondition per SDD §2.0.1 — both
 *     fields MUST match `ISO8601_UTC_PATTERN` for the lexicographic
 *     comparison to be monotonic).
 *
 * **`$id` convention** (mirrors CanonicalRun / PhaseKind /
 * ClusterRunSeries / InterSeriesScopingArtifact precedent): the
 * TypeBox-internal `$id` values declared in this file
 * (`'SubscriptionPoolState'`, `'SubscriptionAccountState'`,
 * `'SubscriptionAccountEntry'`, `'RateEnvelope'`) are short tokens
 * used by the TypeBox type system for self-reference within the
 * runtime. They are **overridden at JSON Schema generation time** by
 * `scripts/generate-schemas.ts` (line ~607) to the canonical
 * versioned URI form:
 * `https://schemas.0xhoneyjar.com/loa-hounfour/<CONTRACT_VERSION>/<name>`.
 * Standalone JSON Schema consumers (Python `jsonschema`, Go
 * `gojsonschema`, Rust `jsonschema`) only ever see the URI form. The
 * nested-`$id` values on sub-schemas are stripped by
 * `scripts/schema-postprocess.ts#stripNestedIds` so the generated
 * artifact carries exactly one unambiguous identifier (the URI).
 *
 * **Carry-forward**: this schema was scheduled for v8.7.0 in
 * cycle-005's forward plan as FR-E3. User-confirmed inclusion in
 * cycle-007 scope on 2026-05-10.
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.3
 * @see ADR-010 — class-vs-policy boundary (consumer-side signature
 *      verification; hounfour ships shape + manifest reason code).
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { ED25519_SIGNATURE_PATTERN } from '../governance/signature-envelope.js';
import { arrayFieldDistinct } from '../constraints/builtins/cluster-run-series-local.js';
import {
  stringMicroUsdLe,
  iso8601GeField,
} from '../constraints/builtins/subscription-pool-state-local.js';

const MICRO_USD_PATTERN = '^[0-9]+$';

/**
 * `SubscriptionAccountStateSchema` — locked per-account health enum.
 *
 * Three locked members: `'healthy'`, `'rate_limited'`, `'exhausted'`.
 * Promotion to a discriminated union keyed on `state` is deferred to
 * v8.8.0+ pending consumer-corpus signal. v8.7.0 ships the union of
 * literals; pool-level aggregation (e.g. "if any account is exhausted,
 * the pool is degraded") is consumer-shaped.
 *
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */
export const SubscriptionAccountStateSchema = Type.Union(
  [
    Type.Literal('healthy'),
    Type.Literal('rate_limited'),
    Type.Literal('exhausted'),
  ],
  {
    $id: 'SubscriptionAccountState',
    description:
      'Per-account health state across a subscription pool. Locked ' +
      'three-member enum; promotion to a discriminated union keyed ' +
      'on state is deferred to v8.8.0+ pending consumer-corpus signal.',
  },
);
export type SubscriptionAccountState = Static<
  typeof SubscriptionAccountStateSchema
>;

/**
 * `RateEnvelopeSchema` — per-account rate-limit envelope. Hoisted so
 * cross-runner conformance suites can validate per-element shape
 * independently of the parent envelope.
 *
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */
export const RateEnvelopeSchema = Type.Object(
  {
    req_per_min: Type.Integer({
      minimum: 0,
      maximum: 1_000_000,
      description:
        'Per-minute request allowance for the account. Integer with ' +
        'closed upper bound 1,000,000 — the consumer-side practical ' +
        'ceiling for per-minute rates across known providers.',
    }),
    req_per_hour: Type.Integer({
      minimum: 0,
      maximum: 60_000_000,
      description:
        'Per-hour request allowance for the account. Integer with ' +
        'closed upper bound 60,000,000 — matches the per-minute ' +
        'ceiling scaled to a one-hour window. Pool-level aggregation ' +
        'across accounts is consumer-shaped.',
    }),
  },
  {
    $id: 'RateEnvelope',
    additionalProperties: false,
    description:
      'Per-account rate-limit envelope. Library-clamped integer ' +
      'bounds; cross-account aggregation is consumer-side.',
  },
);
export type RateEnvelope = Static<typeof RateEnvelopeSchema>;

/**
 * `SubscriptionAccountEntrySchema` — one entry in
 * `SubscriptionPoolStateSchema.accounts`. Hoisted so cross-runner
 * conformance suites can validate per-element shape independently of
 * the parent envelope.
 *
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */
export const SubscriptionAccountEntrySchema = Type.Object(
  {
    account_id: Type.String({
      minLength: 1,
      description:
        'Stable opaque account identifier within the pool. Per-array ' +
        'distinctness is SPS-2; consumers select accounts by ' +
        'account_id from the pool-scoped namespace.',
    }),
    provider: Type.String({
      minLength: 1,
      maxLength: 64,
      description:
        'Free-form provider classifier (e.g. "anthropic", "openai"). ' +
        'Consumer-shaped namespace; hounfour does not freeze the ' +
        'provider registry. 64-char upper bound matches the ' +
        'consumer-side display surface.',
    }),
    state: SubscriptionAccountStateSchema,
    stable_until: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp after which the account state may ' +
        'change. SPS-4 enforces stable_until at-or-after envelope.ts ' +
        'per element; both fields share the ISO8601_UTC_PATTERN so ' +
        'the lexicographic comparison is monotonic.',
    }),
    rate_envelope: RateEnvelopeSchema,
    thrash_count_24h: Type.Integer({
      minimum: 0,
      maximum: 100_000,
      description:
        '24-hour rolling count of state-thrash events. Closed upper ' +
        'bound 100,000 — saturation indicates a misconfigured ' +
        'consumer-side rate limiter.',
    }),
    allocated_units: Type.String({
      pattern: MICRO_USD_PATTERN,
      description:
        'String-encoded micro-USD per CLAUDE.md financial-value ' +
        'convention. No floating point; bigint-safe arbitrary-' +
        'precision values admissible. Pool-level aggregation is ' +
        'consumer-shaped.',
    }),
    consumed_units: Type.String({
      pattern: MICRO_USD_PATTERN,
      description:
        'String-encoded micro-USD. MUST be at-or-below allocated_units ' +
        'per SPS-1 — enforced at the cross-field tier via the LOCAL ' +
        'bigint-safe string_micro_usd_le helper.',
    }),
  },
  {
    $id: 'SubscriptionAccountEntry',
    additionalProperties: false,
    description:
      'One per-account entry within a SubscriptionPoolState. Cross-' +
      'element invariants — account_id distinctness per SPS-2 and ' +
      'consumed_units at-or-below allocated_units per SPS-1 — live ' +
      'in the cross-field tier.',
  },
);
export type SubscriptionAccountEntry = Static<
  typeof SubscriptionAccountEntrySchema
>;

export const SubscriptionPoolStateSchema = Type.Object(
  {
    envelope_kind: Type.Literal('subscription_pool_state', {
      description: 'Discriminator pinning this envelope shape.',
    }),
    contract_version: Type.Literal('8.7.0', {
      description:
        'Hounfour contract version. Pinned to "8.7.0" for the cycle-007 ship line.',
    }),
    ts: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at which this pool-state snapshot was ' +
        'taken. SPS-4 enforces accounts[*].stable_until at-or-after ' +
        'ts via the LOCAL iso8601_ge_field helper.',
    }),
    cluster_id: Type.String({
      minLength: 1,
      description: 'Consumer-shaped cluster identifier.',
    }),
    pool_health_id: Type.Union(
      [Type.String({ minLength: 1 }), Type.Null()],
      {
        description:
          'Optional lazy-link to an OracleHealthEnvelopeSchema record ' +
          '(FR-B4, v8.6.0) for monitoring tie-in. Null when no health ' +
          'envelope has been emitted; resolution is consumer-state ' +
          'per ADR-010.',
      },
    ),
    accounts: Type.Array(SubscriptionAccountEntrySchema, {
      minItems: 1,
      maxItems: 256,
      description:
        'Non-empty array of per-account state entries. Per-array ' +
        'account_id distinctness is SPS-2; per-element consumed_units ' +
        'at-or-below allocated_units is SPS-1. Upper bound 256 ' +
        'matches the consumer-side practical ceiling for per-pool ' +
        'account counts.',
    }),
    pause_resume_pair_id: Type.String({
      minLength: 1,
      description:
        'Idempotency marker pairing each pause with its corresponding ' +
        'resume. Consumer-side state — hounfour does not enforce ' +
        'pause-resume ordering across snapshots; the marker is the ' +
        'consumer-side chain primitive replacing the ' +
        'prev_envelope_hash pattern from chain-bearing schemas.',
    }),
    signer_cluster_id: Type.String({
      minLength: 1,
      description:
        'Consumer-shaped identifier for the signing cluster. SPS-3 ' +
        'derivation matching is consumer-state per ADR-010 with ' +
        'manifest reason ' +
        'SUBSCRIPTION_POOL_STATE_SIGNATURE_VERIFICATION_CONTEXT_DEFERRED.',
    }),
    signature: Type.String({
      pattern: ED25519_SIGNATURE_PATTERN,
      description:
        'Ed25519 signature over the canonicalized payload (consumer-' +
        'side verifier). Pattern-locked; semantic verification is ' +
        'consumer-state per ADR-010.',
    }),
  },
  {
    $id: 'SubscriptionPoolState',
    additionalProperties: false,
    'x-crypto-bearing': true,
    description:
      'Pool-state snapshot for shared-capacity audits. Crypto-bearing ' +
      'because the envelope carries an Ed25519 signature field. NOT ' +
      'chain-bearing — consumers chain via pause_resume_pair_id ' +
      'idempotency rather than a prev_envelope_hash chain. Round-' +
      'trip parse and re-serialize bit-identical: every well-formed ' +
      'payload satisfies JSON.stringify(JSON.parse(s)) equals s when ' +
      's is itself the JSON-stringified canonical form.',
  },
);
export type SubscriptionPoolState = Static<typeof SubscriptionPoolStateSchema>;

/**
 * `validateSubscriptionPoolState` — pure-function evaluator for the
 * cross-field invariants SPS-1 (consumed at-or-below allocated),
 * SPS-2 (account_id distinct), and SPS-4 (stable_until at-or-after ts).
 *
 * **Source of truth** for SPS-1, SPS-2, and SPS-4. Registered into the
 * global cross-field validator registry by `src/validators/index.ts`;
 * exported here so:
 *
 *   - tests can exercise the cross-field tier in isolation without
 *     bypassing the structural Value.Check tier;
 *   - cross-language reference implementations (FR-A2 / TS-as-golden-
 *     corpus per AT-1) have a single TS function to mirror.
 *
 * **Defensive contract** (mirrors the CanonicalRun CR-1 +
 * ClusterRunSeries + InterSeriesScopingArtifact precedent): the
 * function MUST NOT throw on malformed input. Under the standard
 * `validate(...)` pipeline this defensive path is unreachable —
 * Value.Check rejects non-object envelopes, missing fields, and
 * malformed micro-USD strings first.
 *
 * **SPS-3 is NOT enforced here** — signature/derivation matching is
 * consumer-state per ADR-010. Manifest emits
 * `SUBSCRIPTION_POOL_STATE_SIGNATURE_VERIFICATION_CONTEXT_DEFERRED`.
 *
 * **Bigint-safe SPS-1 comparison**: `string_micro_usd_le` uses
 * `BigInt` to avoid floating-point rounding on values larger than
 * `Number.MAX_SAFE_INTEGER` (e.g. 10^50-digit fixtures). The
 * `^[0-9]+$` structural-tier pattern is the precondition.
 *
 * **JCS-canonical-form precondition on SPS-4**: `iso8601_ge_field`
 * validates that both `stable_until` and `ts` match the shared
 * `ISO8601_UTC_PATTERN` before lexicographic comparison.
 * Lexicographic comparison on ISO 8601 strings is monotonic ONLY
 * when both operands are in JCS-canonical form (UTC, Z-suffix, fixed
 * precision, NFC-normalized) per SDD §2.0.1. If the precondition
 * fails, the helper returns a tagged violation rather than a silent
 * miscompare.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input without throwing.
 * @returns `{ valid, errors, warnings }` — errors carries SPS-1 /
 *   SPS-2 / SPS-4-tagged strings naming the offending account index
 *   for actionability.
 *
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */
export function validateSubscriptionPoolState(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        `SPS: structural shape precondition failed — input must be a non-null object (SubscriptionPoolState record); got ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}.`,
      ],
      warnings: [],
    };
  }

  const envelopeTs = (data as { ts?: unknown }).ts;
  const accounts = (data as { accounts?: unknown }).accounts;

  if (!Array.isArray(accounts)) {
    return {
      valid: false,
      errors: [
        'SPS: structural shape precondition failed — accounts must be a non-null array; the cross-field validator requires the structural tier (Value.Check) to have passed first.',
      ],
      warnings: [],
    };
  }

  // SPS-1 + SPS-4: per-element predicates.
  for (let i = 0; i < accounts.length; i += 1) {
    const entry = accounts[i];
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(
        `SPS: accounts[${i}] is ${entry === null ? 'null' : Array.isArray(entry) ? 'array' : typeof entry}, not an object — cross-field validator requires the structural tier to have rejected this element first.`,
      );
      continue;
    }
    const consumed = (entry as { consumed_units?: unknown }).consumed_units;
    const allocated = (entry as { allocated_units?: unknown }).allocated_units;
    const sps1 = stringMicroUsdLe(consumed, allocated);
    if (!sps1.valid) {
      errors.push(`SPS-1: accounts[${i}] ${sps1.reason}`);
    }
    const stableUntil = (entry as { stable_until?: unknown }).stable_until;
    const sps4 = iso8601GeField(stableUntil, envelopeTs);
    if (!sps4.valid) {
      errors.push(`SPS-4: accounts[${i}] ${sps4.reason}`);
    }
  }

  // SPS-2: account_id distinctness.
  const distinct = arrayFieldDistinct(accounts, 'account_id');
  if (!distinct.valid) {
    for (const dup of distinct.duplicates) {
      errors.push(
        `SPS-2: accounts[*].account_id "${dup.value}" appears at indices ${dup.indices.join(', ')} — account_id MUST be distinct within a pool.`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
