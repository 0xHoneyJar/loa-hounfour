/**
 * `ChallengeSchema` — formal challenge envelope against an
 * `Assertion` (FR-A1, v8.6.0).
 *
 * A challenge is a signed, dated record contesting a specific
 * `Assertion`. It carries a `target_assertion_id` (lazy-link
 * string reference per [`sdd.md §1.5`](sdd.md), no shape
 * import), a typed classification of the dispute, the
 * disposition the challenger requests, narrative rationale, an
 * array of supporting evidence hashes, and an Ed25519 signature
 * over the canonical-JSON of the rest of the envelope.
 *
 * **Composition with v8.5.0 `Assertion`**: when a challenge is
 * raised, the dispositioning authority typically transitions
 * the target assertion to `status: 'challenged'` (the J3
 * variant of `AssertionSchema`). Both records validate
 * independently; the linkage is the string equality
 * `Challenge.target_assertion_id === Assertion.assertion_id`.
 * Hounfour does NOT emit a manifest entry for a missing target
 * assertion — the lookup is consumer-state per ADR-010.
 *
 * **Crypto-bearing**: `'x-crypto-bearing': true`.
 * `validate(ChallengeSchema, payload)` defaults to
 * `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }`;
 * consumers passing `{ acceptDeferred: true }` receive
 * `{ valid: true, unverified_obligations: [...] }` with the
 * obligation to verify the Ed25519 `signature` against the
 * challenger's public key (resolved via the consumer's keyring
 * by `challenger_id`). See CHL-1.
 *
 * **NOT chain-bearing**: a challenge is a fresh authorship event
 * against an existing assertion record; it does not carry a
 * `prev_envelope_hash` chain ref (`x-chain-bearing` is absent).
 * Audit-chain continuity for the assertion is the assertion's
 * own concern; challenge-to-assertion linkage is the
 * `target_assertion_id` lazy-link.
 *
 * @see AssertionSchema — `target_assertion_id` resolves to
 *      `Assertion.assertion_id`; `Assertion.status: 'challenged'`
 *      is the typical post-disposition state
 * @since v8.6.0 — FR-A1 (PR-A3.7)
 */
import { type Static } from '@sinclair/typebox';
export declare const ChallengeSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"challenge">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    challenge_id: import("@sinclair/typebox").TString;
    ts: import("@sinclair/typebox").TString;
    challenger_id: import("@sinclair/typebox").TString;
    target_assertion_id: import("@sinclair/typebox").TString;
    challenge_type: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"factual_dispute" | "policy_dispute" | "competence_dispute" | "procedural_dispute" | "drift_assertion" | "signature_replay" | "chain_corruption" | "class_violation" | "other">[]>;
    requested_effect: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"reverse" | "amend" | "void" | "escalate_panel" | "escalate_operator" | "annotate_only">[]>;
    rationale: import("@sinclair/typebox").TString;
    evidence_hashes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    signature: import("@sinclair/typebox").TString;
}>;
export type Challenge = Static<typeof ChallengeSchema>;
//# sourceMappingURL=challenge.d.ts.map