/**
 * `IrreversibleActionAttestationSchema` — proposer-is-not-executor
 * attestation for an irreversible action (FR-C3, SDD §2, v8.8.0).
 *
 * One envelope records two distinct duties over one target record:
 * the **proposal** (who asked for the action, under which key, when)
 * and the **execution** (who carried it out, under which key, when).
 * The schema's one policy, `separation_of_duties.policy =
 * 'proposer_is_not_executor'`, is the classic two-person rule: the
 * actor and key that propose an irreversible action MUST NOT be the
 * actor and key that execute it. See
 * `docs/patterns/proposer-is-not-executor.md` for the pattern and for
 * how to wrap `MergeArtifact` and `ForgetRecord` with it.
 *
 * **Crypto-bearing** (`'x-crypto-bearing': true`): both signatures are
 * optional, but when present they are cryptographic claims, so
 * `validate()` fails closed with `CRYPTO_DEFERRED` unless the caller
 * passes `{ acceptDeferred: true }`. Hounfour does not verify
 * signatures (ADR-010 RULE-2); signature verification is IAA-5,
 * runtime-deferred.
 *
 * **Signing input** (IAA-5; decision recorded here because SDD §2
 * leaves the binding of the sub-object signatures implicit): each
 * signature is ed25519 over the RFC 8785 JCS bytes of the attestation
 * with the signer's own `signature` field removed, so that it binds
 * the target and the action kind, not only the signer's own
 * sub-object. Concretely:
 *   - `proposal.signature` covers the attestation with `execution`
 *     removed and `proposal.signature` removed (the proposer signs
 *     before the execution exists);
 *   - `execution.signature` covers the attestation with only
 *     `execution.signature` removed (the executor's signature
 *     therefore also covers the proposal, including the proposal
 *     signature when present).
 * A sub-object-only signing input would let a proposal signature be
 * replayed onto a different target; binding the whole envelope
 * closes that.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/IrreversibleActionAttestation.constraints.json`):
 *   - IAA-1 (library): `proposal.actor_id != execution.actor_id`.
 *   - IAA-2 (library): `proposal.signer_key_id !=
 *     execution.signer_key_id`.
 *   - IAA-3 (library): execution is not before proposal —
 *     `executed_at >= proposed_at`. Equal instants are admitted.
 *   - IAA-4 (library): `target.schema_id` is a PascalCase identifier.
 *     Enforced by the TypeBox pattern; the constraint restates it for
 *     cross-runner parity.
 *   - IAA-5 (runtime-deferred, reason `crypto_deferred`): present
 *     signatures verify under the consumer's keyring over the signing
 *     input above.
 *
 * **Explicit non-constraints** (ADR-010; rules a reviewer might expect
 * that the library deliberately leaves to consumers):
 *   - IAA-N1: the library does NOT check that `target.record_id`
 *     exists or that `target.content_hash` matches the record. Record
 *     resolution is consumer state.
 *   - IAA-N2: the library does NOT decide which `action_kind` values
 *     are irreversible for a given consumer. Emitting an attestation
 *     for an action is the consumer's declaration that it is
 *     irreversible in their system; `'other'` exists for kinds the
 *     vocabulary does not name.
 *   - IAA-N3: `actor_id` comparison in IAA-1 is exact string
 *     equality. The library does NOT normalise actor identifiers
 *     (case folding, alias resolution, "two accounts, one human").
 *     Consumers that map several identifiers to one principal resolve
 *     that BEFORE emitting the attestation; IAA-1 only proves the
 *     two identifiers differ.
 *   - IAA-N4: IAA-2 proves the two key identifiers differ; it does
 *     NOT prove the two keys are held by different principals. That
 *     binding lives in the consumer keyring.
 *   - IAA-N5: `separation_of_duties.waiver_reference` is
 *     informational. `validate()` still fails IAA-1 / IAA-2 when a
 *     waiver is present. A consumer that honours waivers does so
 *     outside `validate()`: it checks the waiver against its own
 *     policy and then decides what to do with the `IAA-1:` / `IAA-2:`
 *     errors, so that waiving the two-person rule is always an
 *     explicit consumer act. IAA-3 has no waiver path.
 *   - IAA-N6: the library does NOT bound the gap between proposal and
 *     execution (no maximum age, no expiry). Freshness is consumer
 *     policy.
 *   - IAA-N7: the library does NOT check that `actor_id` is the
 *     holder of `signer_key_id`. Key-to-actor binding is consumer
 *     keyring state.
 *
 * **`contract_version` pin**: the literal `'8.8.0'` pins the envelope
 * shape to the line that introduced it, mirroring `MergeArtifact`'s
 * `'8.7.0'` pin.
 *
 * @see docs/patterns/proposer-is-not-executor.md
 * @see ADR-010 — class-vs-policy boundary.
 * @since v8.8.0 — FR-C3 (PR-C3).
 */
import { type Static } from '@sinclair/typebox';
export declare const IrreversibleActionKindSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"merge">, import("@sinclair/typebox").TLiteral<"apply">, import("@sinclair/typebox").TLiteral<"destroy">, import("@sinclair/typebox").TLiteral<"forget">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"revoke">, import("@sinclair/typebox").TLiteral<"publish">, import("@sinclair/typebox").TLiteral<"other">]>;
export type IrreversibleActionKind = Static<typeof IrreversibleActionKindSchema>;
export declare const IrreversibleActionAttestationSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"irreversible_action_attestation">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.8.0">;
    attestation_id: import("@sinclair/typebox").TString;
    action_kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"merge">, import("@sinclair/typebox").TLiteral<"apply">, import("@sinclair/typebox").TLiteral<"destroy">, import("@sinclair/typebox").TLiteral<"forget">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"revoke">, import("@sinclair/typebox").TLiteral<"publish">, import("@sinclair/typebox").TLiteral<"other">]>;
    target: import("@sinclair/typebox").TObject<{
        schema_id: import("@sinclair/typebox").TString;
        record_id: import("@sinclair/typebox").TString;
        content_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    proposal: import("@sinclair/typebox").TObject<{
        actor_id: import("@sinclair/typebox").TString;
        signer_key_id: import("@sinclair/typebox").TString;
        proposed_at: import("@sinclair/typebox").TString;
        signature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    execution: import("@sinclair/typebox").TObject<{
        actor_id: import("@sinclair/typebox").TString;
        signer_key_id: import("@sinclair/typebox").TString;
        executed_at: import("@sinclair/typebox").TString;
        signature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    separation_of_duties: import("@sinclair/typebox").TObject<{
        policy: import("@sinclair/typebox").TLiteral<"proposer_is_not_executor">;
        waiver_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
}>;
export type IrreversibleActionAttestation = Static<typeof IrreversibleActionAttestationSchema>;
/**
 * `validateIrreversibleActionAttestation` — cross-field validator for
 * IAA-1, IAA-2 and IAA-3.
 *
 * Callers normally reach this through `validate(...)`, which runs the
 * structural tier (`Value.Check`) first. Direct callers get defensive
 * behaviour: the function never throws; a non-object input, or a
 * missing `proposal` / `execution` object, returns a tagged
 * structural-precondition error.
 *
 * All violated rules are reported (the validator does not stop at the
 * first). The waiver reference never suppresses an error (IAA-N5).
 *
 * @since v8.8.0 — FR-C3 (PR-C3).
 */
export declare function validateIrreversibleActionAttestation(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=irreversible-action-attestation.d.ts.map