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
import { Type } from '@sinclair/typebox';
import { ChallengeTypeSchema, ChallengeRequestedEffectSchema, } from './challenge-types.js';
import { ED25519_SIGNATURE_PATTERN } from './signature-envelope.js';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
export const ChallengeSchema = Type.Object({
    envelope_kind: Type.Literal('challenge', {
        description: 'Discriminator literal pinning the challenge shape. ' +
            'Distinguishes from plan_signoff / plan_amendment_request / ' +
            'phase_completion and other envelope kinds in the ' +
            'cycle-005 surface.',
    }),
    contract_version: Type.Literal('8.6.0', {
        description: 'Hounfour contract version. Pinned to "8.6.0" for the ' +
            'cycle-005 ship line.',
    }),
    challenge_id: Type.String({
        minLength: 1,
        description: 'Stable opaque identifier for this challenge (consumer- ' +
            'shaped — hounfour does not freeze the namespace). ' +
            'Identifies the challenge record across the audit trail.',
    }),
    ts: Type.String({
        pattern: ISO8601_UTC_PATTERN,
        description: 'ISO 8601 UTC timestamp at challenge emission (Z suffix). ' +
            'The challenge MUST predate any disposition record that ' +
            'cites it.',
    }),
    challenger_id: Type.String({
        minLength: 1,
        description: 'Stable identifier for the challenging actor (consumer- ' +
            'shaped). Public-key resolution for signature verification ' +
            'goes through the consumer\'s keyring.',
    }),
    target_assertion_id: Type.String({
        minLength: 1,
        description: 'String reference to the Assertion being challenged. ' +
            'Lazy-link per SDD §1.5 — no shape import. Equality ' +
            'against Assertion.assertion_id is the consumer-side ' +
            'reconciliation join; missing-target lookup is consumer ' +
            'state per ADR-010 and is NOT manifested by hounfour.',
    }),
    challenge_type: ChallengeTypeSchema,
    requested_effect: ChallengeRequestedEffectSchema,
    rationale: Type.String({
        minLength: 1,
        maxLength: 8192,
        description: 'Narrative rationale for the challenge. minLength: 1 ' +
            'rejects empty rationale; maxLength: 8192 caps prose so ' +
            'the canonical-JSON over which the signature is computed ' +
            'has a bounded size envelope.',
    }),
    evidence_hashes: Type.Array(Type.String({
        pattern: SHA256_HEX_PATTERN,
        description: 'sha256:<64-hex> content hash of a supporting evidence ' +
            'artifact. Mixed-case hex per SHA256_HEX_PATTERN; ' +
            'consumer-side comparison should lowercase-normalize ' +
            'per FR-C4 / PSE-2 precedent if cross-checking against ' +
            'a content-addressed store.',
    }), {
        description: 'Array of supporting evidence hashes. Empty array is ' +
            'admissible (a `signature_replay` challenge may need no ' +
            'evidence beyond the duplicate signature itself); ' +
            'consumer-side acceptance-gate policy decides whether ' +
            'an empty array is accepted for a given challenge_type.',
    }),
    signature: Type.String({
        pattern: ED25519_SIGNATURE_PATTERN,
        description: 'Ed25519 signature over the RFC 8785 canonical JSON of ' +
            'all-other-fields (the entire envelope minus this ' +
            '`signature` field). Wire format: `ed25519:` prefix followed ' +
            'by exactly 86 unpadded base64url characters (the ' +
            '64-byte signature encoded with the URL-and-filename-safe ' +
            'alphabet `[A-Za-z0-9_-]`, no `+/=` padding). Producers ' +
            'using the standard base64 alphabet or trailing `=` padding ' +
            'will fail the schema regex; encode with the unpadded ' +
            'base64url variant (RFC 4648 §5). Verification is ' +
            'consumer-side per CHL-1; the challenger\'s public key ' +
            'resolves through the consumer\'s keyring keyed by ' +
            '`challenger_id`.',
    }),
}, {
    $id: 'Challenge',
    additionalProperties: false,
    'x-crypto-bearing': true,
    description: 'Formal challenge envelope against an Assertion (FR-A1). ' +
        'Crypto-bearing — validate() defaults to CRYPTO_DEFERRED; ' +
        'consumers opting in via { acceptDeferred: true } receive ' +
        'the unverified-obligations manifest entry for the Ed25519 ' +
        'signature verification. Composes with v8.5.0 Assertion ' +
        'via target_assertion_id lazy-link string reference.',
});
//# sourceMappingURL=challenge.js.map