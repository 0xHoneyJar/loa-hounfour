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
import { type Static } from '@sinclair/typebox';
/**
 * Class of actor authorized to sign off on a plan.
 *
 * Three exhaustive members. **v1 acceptance accepts only
 * `single_operator`** is a consumer-side gate per
 * [`prd.md:269-271`] — the schema admits all three. Widening this
 * enum is strict-additive (existing values continue to validate).
 */
export declare const SignoffActorClassSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"single_operator">, import("@sinclair/typebox").TLiteral<"jury_panel">, import("@sinclair/typebox").TLiteral<"delegate">]>;
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
export declare const SignoffTierSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"T2">, import("@sinclair/typebox").TLiteral<"T3">]>;
export type SignoffTier = Static<typeof SignoffTierSchema>;
export declare const PlanSignoffEnvelopeSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"plan_signoff">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    plan_content_hash: import("@sinclair/typebox").TString;
    signoff_actor_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"single_operator">, import("@sinclair/typebox").TLiteral<"jury_panel">, import("@sinclair/typebox").TLiteral<"delegate">]>;
    signoff_actor_id: import("@sinclair/typebox").TString;
    tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"T2">, import("@sinclair/typebox").TLiteral<"T3">]>;
    reason: import("@sinclair/typebox").TString;
    ttl_seconds_at_emit: import("@sinclair/typebox").TString;
    chain_refs: import("@sinclair/typebox").TObject<{
        prev_envelope_hash: import("@sinclair/typebox").TString;
        parent_signoff_hash: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
    cumulative_drift_pct: import("@sinclair/typebox").TNumber;
    signature: import("@sinclair/typebox").TString;
}>;
export type PlanSignoffEnvelope = Static<typeof PlanSignoffEnvelopeSchema>;
//# sourceMappingURL=plan-signoff-envelope.d.ts.map