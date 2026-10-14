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
import { Type } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
import { ED25519_SIGNATURE_PATTERN } from './signature-envelope.js';
import { compareIso8601Utc, describeNonObject, isPlainRecord, } from './separation-of-duties-local.js';
/**
 * Signer key identifier: 64 lowercase hex characters, the bare
 * sha256-derived form used by `PhaseCompletionEnvelope.signer_key_id`.
 * Decision: lowercase only. `PhaseCompletionEnvelope` admits mixed
 * case, but IAA-2 compares identifiers by exact string equality, and a
 * mixed-case alphabet would let one key appear as two distinct
 * identifiers (`ab…` vs `AB…`) and slip past IAA-2. Every value this
 * pattern admits is also admitted by the `PhaseCompletionEnvelope`
 * pattern.
 */
const SIGNER_KEY_ID_PATTERN = '^[0-9a-f]{64}$';
/** PascalCase schema `$id` (IAA-4). */
const PASCAL_CASE_SCHEMA_ID_PATTERN = '^[A-Z][A-Za-z0-9]*$';
const ACTOR_ID = Type.String({
    minLength: 1,
    maxLength: 256,
    description: 'Consumer-shaped actor identifier. Compared by exact string ' +
        'equality (IAA-1); the library does not normalise identifiers ' +
        '(IAA-N3). The 256-character bound matches ' +
        'MergeArtifact.merger_actor_id so a merge actor can be carried ' +
        'unchanged.',
});
const SIGNER_KEY_ID = Type.String({
    pattern: SIGNER_KEY_ID_PATTERN,
    description: 'Signer key identifier, 64 lowercase hex characters (the bare ' +
        'sha256-derived form used by PhaseCompletionEnvelope). Compared ' +
        'by exact string equality (IAA-2).',
});
const OPTIONAL_SIGNATURE = Type.Optional(Type.String({
    pattern: ED25519_SIGNATURE_PATTERN,
    description: 'Optional ed25519 signature (unpadded base64url, 86 characters ' +
        'after the "ed25519:" prefix) over the signing input described ' +
        'in the schema JSDoc (IAA-5). Not verified by the library.',
}));
export const IrreversibleActionKindSchema = Type.Union([
    Type.Literal('merge'),
    Type.Literal('apply'),
    Type.Literal('destroy'),
    Type.Literal('forget'),
    Type.Literal('transfer'),
    Type.Literal('revoke'),
    Type.Literal('publish'),
    Type.Literal('other'),
], {
    description: 'Kind of irreversible action being attested. Which kinds are ' +
        'irreversible in a given system is consumer policy (IAA-N2).',
});
export const IrreversibleActionAttestationSchema = Type.Object({
    envelope_kind: Type.Literal('irreversible_action_attestation', {
        description: 'Discriminator pinning this envelope shape.',
    }),
    contract_version: Type.Literal('8.8.0', {
        description: 'Hounfour contract version. Pinned to "8.8.0", the line that ' +
            'introduced this envelope.',
    }),
    attestation_id: Type.String({
        format: 'uuid',
        description: 'Stable opaque identifier for this attestation (UUID).',
    }),
    action_kind: IrreversibleActionKindSchema,
    target: Type.Object({
        schema_id: Type.String({
            minLength: 1,
            maxLength: 128,
            pattern: PASCAL_CASE_SCHEMA_ID_PATTERN,
            description: 'PascalCase $id of the schema of the record the action ' +
                'applies to (for example "MergeArtifact" or ' +
                '"ForgetRecord"). IAA-4.',
        }),
        record_id: Type.String({
            minLength: 1,
            maxLength: 256,
            description: 'Identifier of the target record in the consumer system. ' +
                'Existence is not checked (IAA-N1).',
        }),
        content_hash: Type.Optional(Type.String({
            pattern: SHA256_HEX_PATTERN,
            description: 'Optional sha256 of the target record content at proposal ' +
                'time. Pattern only; the library does not recompute it ' +
                '(IAA-N1).',
        })),
    }, {
        additionalProperties: false,
        description: 'The record the irreversible action applies to.',
    }),
    proposal: Type.Object({
        actor_id: ACTOR_ID,
        signer_key_id: SIGNER_KEY_ID,
        proposed_at: Type.String({
            pattern: ISO8601_UTC_PATTERN,
            description: 'ISO 8601 UTC instant at which the action was proposed.',
        }),
        signature: OPTIONAL_SIGNATURE,
    }, {
        additionalProperties: false,
        description: 'The proposing duty: who asked for the action.',
    }),
    execution: Type.Object({
        actor_id: ACTOR_ID,
        signer_key_id: SIGNER_KEY_ID,
        executed_at: Type.String({
            pattern: ISO8601_UTC_PATTERN,
            description: 'ISO 8601 UTC instant at which the action was executed. ' +
                'MUST NOT be before proposal.proposed_at (IAA-3).',
        }),
        signature: OPTIONAL_SIGNATURE,
    }, {
        additionalProperties: false,
        description: 'The executing duty: who carried the action out.',
    }),
    separation_of_duties: Type.Object({
        policy: Type.Literal('proposer_is_not_executor', {
            description: 'The separation-of-duties policy this envelope attests.',
        }),
        waiver_reference: Type.Optional(Type.String({
            minLength: 1,
            maxLength: 1024,
            description: 'Informational pointer to a consumer-side waiver. Does ' +
                'NOT relax IAA-1 / IAA-2 inside validate(); a consumer ' +
                'that honours waivers does so outside validate() (IAA-N5).',
        })),
    }, {
        additionalProperties: false,
        description: 'Separation-of-duties policy declaration.',
    }),
}, {
    $id: 'IrreversibleActionAttestation',
    additionalProperties: false,
    'x-crypto-bearing': true,
    'x-cross-field-validated': true,
    description: 'Proposer-is-not-executor attestation for an irreversible action. ' +
        'Records a proposal duty and an execution duty over one target ' +
        'record; the library enforces distinct actors (IAA-1), distinct ' +
        'signer keys (IAA-2) and execution not before proposal (IAA-3). ' +
        'Crypto-bearing: signatures, when present, are verified by the ' +
        'consumer (IAA-5).',
});
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
export function validateIrreversibleActionAttestation(data) {
    if (!isPlainRecord(data)) {
        return {
            valid: false,
            errors: [
                `IAA: structural shape precondition failed — input must be a non-null object (IrreversibleActionAttestation record); got ${describeNonObject(data)}.`,
            ],
            warnings: [],
        };
    }
    const proposal = data.proposal;
    const execution = data.execution;
    if (!isPlainRecord(proposal) || !isPlainRecord(execution)) {
        return {
            valid: false,
            errors: [
                'IAA: structural shape precondition failed — proposal and execution must both be non-null objects; the cross-field validator requires the structural tier (Value.Check) to have passed first.',
            ],
            warnings: [],
        };
    }
    const errors = [];
    const waiver = isPlainRecord(data.separation_of_duties)
        ? data.separation_of_duties.waiver_reference
        : undefined;
    const waiverNote = typeof waiver === 'string'
        ? ' A waiver_reference is present; it is informational and does not relax this rule inside validate().'
        : '';
    // IAA-1: distinct actors.
    if (typeof proposal.actor_id === 'string' &&
        proposal.actor_id === execution.actor_id) {
        errors.push(`IAA-1: proposal.actor_id and execution.actor_id are both "${proposal.actor_id}" — the actor that proposes an irreversible action MUST NOT be the actor that executes it (proposer_is_not_executor).${waiverNote}`);
    }
    // IAA-2: distinct signer keys.
    if (typeof proposal.signer_key_id === 'string' &&
        proposal.signer_key_id === execution.signer_key_id) {
        errors.push(`IAA-2: proposal.signer_key_id and execution.signer_key_id are both "${proposal.signer_key_id}" — proposal and execution MUST be made under different signer keys.${waiverNote}`);
    }
    // IAA-3: execution not before proposal.
    const order = compareIso8601Utc(execution.executed_at, proposal.proposed_at);
    if (order === null) {
        errors.push('IAA-3: structural shape precondition failed — proposal.proposed_at and execution.executed_at must both match ISO8601_UTC_PATTERN.');
    }
    else if (order < 0) {
        errors.push(`IAA-3: execution.executed_at "${String(execution.executed_at)}" is before proposal.proposed_at "${String(proposal.proposed_at)}" — an action cannot be executed before it was proposed.`);
    }
    return { valid: errors.length === 0, errors, warnings: [] };
}
//# sourceMappingURL=irreversible-action-attestation.js.map