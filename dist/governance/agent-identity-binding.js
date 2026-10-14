/**
 * AgentIdentityBinding — binds a hounfour `AgentIdentity.agent_id` to an
 * external identity surface under exactly one named profile.
 *
 * Three profiles are defined (SDD §4, FR-C5):
 *
 *   - `a2a-agent-card`: the agent is described by a published A2A Agent
 *     Card. The `a2a` block carries the card URL, an optional content
 *     hash of the JCS-canonical card, an optional compact-JWS card
 *     signature, and the declared A2A protocol version.
 *     See docs/profiles/agent-identity-a2a-card.md.
 *   - `directory-identity`: the agent is an object in an organizational
 *     identity directory. The `directory` block carries the directory
 *     kind, tenant, object id, the accountable human ROLE, and the
 *     lifecycle state. See docs/profiles/agent-identity-directory.md.
 *   - `verifiable-credential`: the agent is described by a verifiable
 *     credential. The `vc` block carries the issuer, credential type,
 *     a content hash of the credential, and an optional expiry.
 *
 * ## Profile discriminator (AIB-1 / AIB-2 / AIB-3)
 *
 * `profile` names exactly one block. That block MUST be present and the
 * other two MUST be absent. The rule is enforced at `validate()` time by
 * the registered cross-field validator {@link validateAgentIdentityBinding}
 * and restated in `constraints/AgentIdentityBinding.constraints.json` as
 * library-evaluable DSL expressions so cross-language runners replicate it.
 *
 * **Decision (SDD §4 shape).** The SDD specifies one object with three
 * optional blocks plus a cross-field rule, not a TypeBox discriminated
 * union. The single-object shape is kept so the generated JSON Schema stays
 * a flat object for non-TypeScript consumers; the cross-field validator
 * carries the exclusivity rule.
 *
 * ## Deferred obligations (consumer-side per ADR-010)
 *
 *   - AIB-4: `signature` and `a2a.card_signature_jws` are carried, not
 *     verified. The schema is deliberately NOT marked `x-crypto-bearing`
 *     because `signature` is optional and the flag cannot be conditional
 *     on field presence; the obligation is recorded as a runtime-deferred
 *     constraint (reason `crypto_deferred`) instead.
 *   - AIB-5: `agent_id` resolving to an `AgentIdentity` that
 *     `bound_by_signer_id` is authorized to bind is consumer authority.
 *
 * ## Explicit non-constraints
 *
 *   - AIB-N1: the library does NOT fetch `a2a.card_url`. It is NOT a
 *     constraint that the URL resolves, that the fetched card hashes to
 *     `card_hash`, or that the card names this agent, because fetching is
 *     I/O and a contracts library performs none. Consumers fetch,
 *     canonicalize (JCS), hash, and compare.
 *   - AIB-N2: `directory.accountable_role` is NOT validated against any
 *     directory. It is NOT a constraint that the role exists, is staffed,
 *     or holds authority over the agent, because directory contents are
 *     consumer state.
 *   - AIB-N3: `vc.expires_at` is NOT compared against a clock or against
 *     `bound_at`. A binding recorded after credential expiry is a policy
 *     question (some consumers keep historical bindings), so the library
 *     leaves freshness to consumers.
 *   - AIB-N4: uniqueness of bindings per `agent_id` (one directory
 *     identity per agent) is NOT a constraint, because it spans records.
 *     The directory profile document states it as a consumer inventory
 *     obligation.
 *   - AIB-N5: `directory.lifecycle_state` is NOT required to be `active`.
 *     Suspended and retired bindings are valid records; whether a
 *     non-active binding may act is consumer policy.
 *
 * ## Decision: compact JWS segments
 *
 * `card_signature_jws` uses three non-empty base64url segments per SDD §4.
 * The detached-payload form (`header..signature`) is therefore NOT
 * admitted; a consumer holding a detached signature re-attaches the
 * canonical card payload before recording it, or records `card_hash` and
 * omits the JWS.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/profiles/agent-identity-a2a-card.md
 * @see docs/profiles/agent-identity-directory.md
 * @since v8.8.0 (PR-C5, FR-C5)
 */
import { Type } from '@sinclair/typebox';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
import { ED25519_SIGNATURE_PATTERN } from './signature-envelope.js';
/**
 * Compact JWS serialization: three non-empty base64url segments joined by
 * dots (header.payload.signature). Shape only; the library does not decode
 * or verify the JWS.
 *
 * @since v8.8.0 (PR-C5)
 */
export const COMPACT_JWS_PATTERN = '^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$';
/** The three binding profiles, in declaration order. */
export const AGENT_IDENTITY_BINDING_PROFILES = [
    'a2a-agent-card',
    'directory-identity',
    'verifiable-credential',
];
export const AgentIdentityBindingProfileSchema = Type.Union([
    Type.Literal('a2a-agent-card'),
    Type.Literal('directory-identity'),
    Type.Literal('verifiable-credential'),
], {
    description: 'Identity-binding profile. Names exactly one of the a2a / directory / vc blocks, which MUST be present while the other two are absent (AIB-1..3).',
});
/** Block key each profile requires. The other two keys MUST be absent. */
export const AGENT_IDENTITY_BINDING_PROFILE_BLOCK = Object.freeze({
    'a2a-agent-card': 'a2a',
    'directory-identity': 'directory',
    'verifiable-credential': 'vc',
});
const PROFILE_RULE_ID = Object.freeze({
    'a2a-agent-card': 'AIB-1',
    'directory-identity': 'AIB-2',
    'verifiable-credential': 'AIB-3',
});
const BLOCK_KEYS = ['a2a', 'directory', 'vc'];
const A2aAgentCardBlock = Type.Object({
    card_url: Type.String({
        format: 'uri',
        maxLength: 2048,
        description: 'URL the A2A Agent Card is published at. The library does not fetch it (AIB-N1).',
    }),
    card_hash: Type.Optional(Type.String({
        pattern: SHA256_HEX_PATTERN,
        description: 'sha256 of the JCS (RFC 8785) canonical form of the fetched Agent Card. Consumers recompute and compare.',
    })),
    card_signature_jws: Type.Optional(Type.String({
        pattern: COMPACT_JWS_PATTERN,
        description: 'Compact JWS over the JCS-canonical Agent Card. Carried, not verified (AIB-4).',
    })),
    protocol_version: Type.Optional(Type.String({
        pattern: '^\\d+\\.\\d+(\\.\\d+)?$',
        description: 'A2A protocol version the card declares (MAJOR.MINOR or MAJOR.MINOR.PATCH).',
    })),
}, {
    additionalProperties: false,
    description: 'a2a-agent-card profile block.',
});
const DirectoryIdentityBlock = Type.Object({
    directory_kind: Type.Union([Type.Literal('entra'), Type.Literal('okta'), Type.Literal('ldap'), Type.Literal('other')], { description: 'Kind of identity directory holding the agent object.' }),
    tenant_id: Type.String({
        minLength: 1,
        maxLength: 256,
        description: 'Directory tenant or realm identifier. Opaque to the library.',
    }),
    object_id: Type.String({
        minLength: 1,
        maxLength: 256,
        description: 'Directory object identifier of the agent. Opaque to the library.',
    }),
    accountable_role: Type.String({
        minLength: 1,
        maxLength: 256,
        description: 'The human role accountable for the agent. A role, not a person. Not validated against any directory (AIB-N2).',
    }),
    lifecycle_state: Type.Union([Type.Literal('active'), Type.Literal('suspended'), Type.Literal('retired')], { description: 'Directory lifecycle state of the agent object at bound_at (AIB-N5).' }),
}, {
    additionalProperties: false,
    description: 'directory-identity profile block.',
});
const VerifiableCredentialBlock = Type.Object({
    issuer: Type.String({
        minLength: 1,
        maxLength: 512,
        description: 'Credential issuer identifier (for example a DID or URL). Opaque to the library.',
    }),
    credential_type: Type.String({
        minLength: 1,
        maxLength: 256,
        description: 'Credential type name. Opaque to the library.',
    }),
    credential_hash: Type.String({
        pattern: SHA256_HEX_PATTERN,
        description: 'sha256 of the credential bytes as recorded by the binder. Consumers recompute and compare.',
    }),
    expires_at: Type.Optional(Type.String({
        format: 'date-time',
        description: 'Credential expiry. Not compared against any clock (AIB-N3).',
    })),
}, {
    additionalProperties: false,
    description: 'verifiable-credential profile block.',
});
export const AgentIdentityBindingSchema = Type.Object({
    binding_id: Type.String({
        format: 'uuid',
        description: 'Stable opaque identifier for this binding record.',
    }),
    agent_id: Type.String({
        minLength: 1,
        description: 'AgentIdentity.agent_id this binding attaches an external identity to. Resolution is consumer-side (AIB-5).',
    }),
    profile: AgentIdentityBindingProfileSchema,
    a2a: Type.Optional(A2aAgentCardBlock),
    directory: Type.Optional(DirectoryIdentityBlock),
    vc: Type.Optional(VerifiableCredentialBlock),
    bound_at: Type.String({
        format: 'date-time',
        description: 'When the binding was recorded.',
    }),
    bound_by_signer_id: Type.String({
        minLength: 1,
        description: 'Signer that recorded the binding. Authority to bind is consumer-side (AIB-5).',
    }),
    signature: Type.Optional(Type.String({
        pattern: ED25519_SIGNATURE_PATTERN,
        description: 'Optional ed25519 signature by bound_by_signer_id. Carried, not verified (AIB-4).',
    })),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Hounfour contract version this binding was authored against.',
    }),
}, {
    $id: 'AgentIdentityBinding',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Binds an AgentIdentity.agent_id to one external identity surface: an A2A Agent Card, an organizational directory identity, or a verifiable credential. The profile field names exactly one block, which must be present while the other two are absent (AIB-1..3, enforced by the cross-field validator). Signatures are carried, not verified, and agent resolution plus binder authority are consumer-side (AIB-4, AIB-5).',
});
/**
 * Cross-field validator for AIB-1 / AIB-2 / AIB-3: the block named by
 * `profile` is present and the other two blocks are absent.
 *
 * Pure function; runs after the structural tier. Returns one error per
 * violated sub-rule so a record that is wrong in two ways reports both.
 *
 * @since v8.8.0 (PR-C5)
 */
export function validateAgentIdentityBinding(data) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        return {
            valid: false,
            errors: [
                `AIB: structural shape precondition failed — input must be a non-null object (AgentIdentityBinding record); got ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}.`,
            ],
            warnings: [],
        };
    }
    const record = data;
    const profile = record.profile;
    if (typeof profile !== 'string' ||
        !AGENT_IDENTITY_BINDING_PROFILES.includes(profile)) {
        return {
            valid: false,
            errors: [
                `AIB: structural shape precondition failed — profile must be one of ${AGENT_IDENTITY_BINDING_PROFILES.join(', ')}; the cross-field validator requires the structural tier (Value.Check) to have passed first.`,
            ],
            warnings: [],
        };
    }
    const p = profile;
    const ruleId = PROFILE_RULE_ID[p];
    const required = AGENT_IDENTITY_BINDING_PROFILE_BLOCK[p];
    const errors = [];
    if (record[required] === undefined) {
        errors.push(`${ruleId}: profile '${p}' requires the ${required} block, which is absent.`);
    }
    for (const key of BLOCK_KEYS) {
        if (key !== required && record[key] !== undefined) {
            errors.push(`${ruleId}: profile '${p}' forbids the ${key} block, which is present.`);
        }
    }
    return { valid: errors.length === 0, errors, warnings: [] };
}
//# sourceMappingURL=agent-identity-binding.js.map