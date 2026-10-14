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
 * library-evaluable DSL expressions.
 *
 * **The JSON Schema shape alone does NOT enforce AIB-1..3.** Neither TypeBox
 * `Value.Check` nor a JSON Schema validator running the published
 * `schemas/agent-identity-binding.schema.json` rejects a profile/block
 * mismatch. This matches every other `x-cross-field-validated` schema:
 * the structural tier is the shape, and the cross-field tier is the
 * registered validator. TypeScript consumers call `validate()`; consumers
 * in other languages MUST implement AIB-1..3 themselves, using the
 * constraint file as the specification.
 *
 * **Decision (SDD §4 shape).** The SDD specifies one object with three
 * optional blocks plus a cross-field rule, not a TypeBox discriminated
 * union. The single-object shape is kept so the generated JSON Schema stays
 * a flat object for non-TypeScript consumers.
 *
 * **Decision (card_url pattern).** `format: 'uri'` checks URI syntax. The
 * pattern adds the profile-specific rules: an `http` or `https` scheme, a
 * host containing at least one character other than `.` and `-`, and an
 * end anchor so no whitespace or trailing garbage follows the host and
 * path. It does not attempt full host validation.
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
import { type Static } from '@sinclair/typebox';
/**
 * Compact JWS serialization: three non-empty base64url segments joined by
 * dots (header.payload.signature). Shape only; the library does not decode
 * or verify the JWS.
 *
 * @since v8.8.0 (PR-C5)
 */
export declare const COMPACT_JWS_PATTERN = "^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$";
/** The three binding profiles, in declaration order. */
export declare const AGENT_IDENTITY_BINDING_PROFILES: readonly ["a2a-agent-card", "directory-identity", "verifiable-credential"];
export declare const AgentIdentityBindingProfileSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"a2a-agent-card">, import("@sinclair/typebox").TLiteral<"directory-identity">, import("@sinclair/typebox").TLiteral<"verifiable-credential">]>;
export type AgentIdentityBindingProfile = Static<typeof AgentIdentityBindingProfileSchema>;
/** Block key each profile requires. The other two keys MUST be absent. */
export declare const AGENT_IDENTITY_BINDING_PROFILE_BLOCK: Readonly<Record<AgentIdentityBindingProfile, 'a2a' | 'directory' | 'vc'>>;
export declare const AgentIdentityBindingSchema: import("@sinclair/typebox").TObject<{
    binding_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    profile: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"a2a-agent-card">, import("@sinclair/typebox").TLiteral<"directory-identity">, import("@sinclair/typebox").TLiteral<"verifiable-credential">]>;
    a2a: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        card_url: import("@sinclair/typebox").TString;
        card_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        card_signature_jws: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        protocol_version: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    directory: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        directory_kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"entra">, import("@sinclair/typebox").TLiteral<"okta">, import("@sinclair/typebox").TLiteral<"ldap">, import("@sinclair/typebox").TLiteral<"other">]>;
        tenant_id: import("@sinclair/typebox").TString;
        object_id: import("@sinclair/typebox").TString;
        accountable_role: import("@sinclair/typebox").TString;
        lifecycle_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"suspended">, import("@sinclair/typebox").TLiteral<"retired">]>;
    }>>;
    vc: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        issuer: import("@sinclair/typebox").TString;
        credential_type: import("@sinclair/typebox").TString;
        credential_hash: import("@sinclair/typebox").TString;
        expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    bound_at: import("@sinclair/typebox").TString;
    bound_by_signer_id: import("@sinclair/typebox").TString;
    signature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type AgentIdentityBinding = Static<typeof AgentIdentityBindingSchema>;
/**
 * Cross-field validator for AIB-1 / AIB-2 / AIB-3: the block named by
 * `profile` is present and the other two blocks are absent.
 *
 * Pure function; runs after the structural tier. Returns one error per
 * violated sub-rule so a record that is wrong in two ways reports both.
 *
 * Presence semantics match the AIB-1..3 DSL expressions (`!= null`): a
 * block that is `undefined` or `null` counts as absent. The structural
 * tier never lets a `null` block through, because the blocks are optional
 * objects and not nullable, so this matters only for direct calls that
 * skip the structural tier. On that direct-call path, a block that is
 * present (not `null` and not `undefined`) MUST be a plain object; a
 * string, number, boolean or array block fails the structural shape
 * precondition before AIB-1..3 are evaluated.
 *
 * @since v8.8.0 (PR-C5)
 */
export declare function validateAgentIdentityBinding(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=agent-identity-binding.d.ts.map