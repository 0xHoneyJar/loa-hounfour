import { type Static } from '@sinclair/typebox';
/** Conversation lifecycle status. */
export declare const ConversationStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"paused">, import("@sinclair/typebox").TLiteral<"sealed">, import("@sinclair/typebox").TLiteral<"archived">]>;
export type ConversationStatus = Static<typeof ConversationStatusSchema>;
/**
 * Access policy for conversation data during and after NFT transfers.
 *
 * Replaces the deprecated `previous_owner_access` field from v2.x.
 * Supports four access types with varying levels of control:
 *
 * - `none`: Previous owner loses all access immediately
 * - `read_only`: Indefinite read-only access to conversation history
 * - `time_limited`: Read-only access for a specified duration
 * - `role_based`: Access granted to specific roles (e.g., 'auditor', 'admin')
 *
 * @see BB-V3-004 — previous_owner_access deprecated, needs replacement
 * @since v3.0.0
 */
export declare const AccessPolicySchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">]>;
    duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    audit_required: import("@sinclair/typebox").TBoolean;
    revocable: import("@sinclair/typebox").TBoolean;
}>;
export type AccessPolicy = Static<typeof AccessPolicySchema>;
/**
 * Validate cross-field invariants for an access policy:
 * - `time_limited` requires `duration_hours`
 * - `role_based` requires `roles` array
 */
export declare function validateAccessPolicy(policy: AccessPolicy): {
    valid: boolean;
    errors: string[];
};
/**
 * Governs conversation data handling during NFT transfers.
 *
 * When encryption_scheme !== 'none', key_derivation must also be non-'none'
 * and key_reference must be provided. The reverse is not enforced at the
 * schema level — encryption_scheme: 'none' with key_reference is valid (ignored).
 *
 * v3.0.0 BREAKING CHANGE: `previous_owner_access` has been removed and
 * replaced by the richer `access_policy` field. See MIGRATION.md for
 * the v2 → v3 migration guide.
 */
export declare const ConversationSealingPolicySchema: import("@sinclair/typebox").TObject<{
    encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
    key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
    key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    access_audit: import("@sinclair/typebox").TBoolean;
    access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">]>;
        duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        audit_required: import("@sinclair/typebox").TBoolean;
        revocable: import("@sinclair/typebox").TBoolean;
    }>>;
}>;
export type ConversationSealingPolicy = Static<typeof ConversationSealingPolicySchema>;
/**
 * Validate cross-field invariants for a sealing policy:
 * - When encryption_scheme !== 'none', key_derivation must be non-'none'
 *   and key_reference must be provided.
 * - When access_policy is present, validates its cross-field invariants.
 */
export declare function validateSealingPolicy(policy: ConversationSealingPolicy): {
    valid: boolean;
    errors: string[];
};
/**
 * Conversation belonging to an NFT agent.
 * Conversations transfer with the NFT — they belong to the agent, not the user.
 */
export declare const ConversationSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    nft_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"paused">, import("@sinclair/typebox").TLiteral<"sealed">, import("@sinclair/typebox").TLiteral<"archived">]>;
    sealing_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        access_audit: import("@sinclair/typebox").TBoolean;
        access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">]>;
            duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            audit_required: import("@sinclair/typebox").TBoolean;
            revocable: import("@sinclair/typebox").TBoolean;
        }>>;
    }>>;
    message_count: import("@sinclair/typebox").TInteger;
    created_at: import("@sinclair/typebox").TString;
    updated_at: import("@sinclair/typebox").TString;
    sealed_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    sealed_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type Conversation = Static<typeof ConversationSchema>;
/** Message role within a conversation. */
export declare const MessageRoleSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"user">, import("@sinclair/typebox").TLiteral<"assistant">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"tool">]>;
export type MessageRole = Static<typeof MessageRoleSchema>;
/** Individual message within a conversation. */
export declare const MessageSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    conversation_id: import("@sinclair/typebox").TString;
    role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"user">, import("@sinclair/typebox").TLiteral<"assistant">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"tool">]>;
    content: import("@sinclair/typebox").TString;
    model: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    pool_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    billing_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        arguments: import("@sinclair/typebox").TString;
        model_source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>>;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type Message = Static<typeof MessageSchema>;
//# sourceMappingURL=conversation.d.ts.map