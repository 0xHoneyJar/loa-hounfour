import { type Static } from '@sinclair/typebox';
/** Conversation lifecycle status. */
export declare const ConversationStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"paused">, import("@sinclair/typebox").TLiteral<"sealed">, import("@sinclair/typebox").TLiteral<"archived">]>;
export type ConversationStatus = Static<typeof ConversationStatusSchema>;
/**
 * Governs conversation data handling during NFT transfers.
 *
 * When encryption_scheme !== 'none', key_derivation must also be non-'none'
 * and key_reference must be provided. The reverse is not enforced at the
 * schema level — encryption_scheme: 'none' with key_reference is valid (ignored).
 */
export declare const ConversationSealingPolicySchema: import("@sinclair/typebox").TObject<{
    encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
    key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
    key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    access_audit: import("@sinclair/typebox").TBoolean;
    previous_owner_access: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only_24h">]>;
}>;
export type ConversationSealingPolicy = Static<typeof ConversationSealingPolicySchema>;
/**
 * Validate cross-field invariants for a sealing policy:
 * - When encryption_scheme !== 'none', key_derivation must be non-'none'
 *   and key_reference must be provided.
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
        previous_owner_access: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only_24h">]>;
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
    }>>>;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type Message = Static<typeof MessageSchema>;
//# sourceMappingURL=conversation.d.ts.map