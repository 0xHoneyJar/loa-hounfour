import { Type } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';
/** Conversation lifecycle status. */
export const ConversationStatusSchema = Type.Union([
    Type.Literal('active'),
    Type.Literal('paused'),
    Type.Literal('sealed'),
    Type.Literal('archived'),
], { $id: 'ConversationStatus' });
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
export const AccessPolicySchema = Type.Object({
    type: Type.Union([
        Type.Literal('none'),
        Type.Literal('read_only'),
        Type.Literal('time_limited'),
        Type.Literal('role_based'),
    ], {
        description: 'Access type governing previous owner data visibility',
    }),
    duration_hours: Type.Optional(Type.Integer({
        minimum: 1,
        maximum: 8760, // 1 year max
        description: 'Access duration in hours (required for time_limited)',
    })),
    roles: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        minItems: 1,
        description: 'Roles granted access (required for role_based)',
    })),
    audit_required: Type.Boolean({
        description: 'Whether access events must be logged to the audit trail',
    }),
    revocable: Type.Boolean({
        description: 'Whether the new owner can revoke this access policy',
    }),
}, {
    $id: 'AccessPolicy',
    additionalProperties: false,
    $comment: 'Cross-field invariants: '
        + '(1) time_limited requires duration_hours. '
        + '(2) role_based requires roles array. '
        + 'Enforced by validateAccessPolicy() in TypeScript.',
});
/**
 * Validate cross-field invariants for an access policy:
 * - `time_limited` requires `duration_hours`
 * - `role_based` requires `roles` array
 */
export function validateAccessPolicy(policy) {
    const errors = [];
    if (policy.type === 'time_limited' && policy.duration_hours === undefined) {
        errors.push('duration_hours is required when type is "time_limited"');
    }
    if (policy.type === 'role_based' && (!policy.roles || policy.roles.length === 0)) {
        errors.push('roles array is required and must be non-empty when type is "role_based"');
    }
    return { valid: errors.length === 0, errors };
}
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
// AES-256-GCM chosen over XChaCha20-Poly1305: GCM is the NIST standard with hardware
// acceleration on modern CPUs (AES-NI), and all three downstream repos (loa-finn, arrakis,
// mibera-freeside) already depend on Node.js crypto which provides GCM natively. XChaCha20
// would require an additional dependency (@noble/ciphers) for marginal nonce-misuse
// resistance benefit.
export const ConversationSealingPolicySchema = Type.Object({
    encryption_scheme: Type.Union([
        Type.Literal('aes-256-gcm'),
        Type.Literal('none'),
    ]),
    key_derivation: Type.Union([
        Type.Literal('hkdf-sha256'),
        Type.Literal('none'),
    ]),
    key_reference: Type.Optional(Type.String({ minLength: 1 })),
    access_audit: Type.Boolean(),
    access_policy: Type.Optional(AccessPolicySchema),
}, {
    $id: 'ConversationSealingPolicy',
    additionalProperties: false,
    $comment: 'Cross-field invariants: '
        + '(1) When encryption_scheme !== "none", key_derivation must be non-"none" and key_reference must be provided. '
        + '(2) When access_policy.type is "time_limited", duration_hours must be set. '
        + '(3) When access_policy.type is "role_based", roles must be non-empty. '
        + 'Enforced by validateSealingPolicy() in TypeScript. '
        + 'Cross-language consumers should implement equivalent validation.',
});
/**
 * Validate cross-field invariants for a sealing policy:
 * - When encryption_scheme !== 'none', key_derivation must be non-'none'
 *   and key_reference must be provided.
 * - When access_policy is present, validates its cross-field invariants.
 */
export function validateSealingPolicy(policy) {
    const errors = [];
    if (policy.encryption_scheme !== 'none') {
        if (policy.key_derivation === 'none') {
            errors.push('key_derivation must not be "none" when encryption is enabled');
        }
        if (!policy.key_reference) {
            errors.push('key_reference is required when encryption is enabled');
        }
    }
    if (policy.access_policy) {
        const apResult = validateAccessPolicy(policy.access_policy);
        errors.push(...apResult.errors);
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Conversation belonging to an NFT agent.
 * Conversations transfer with the NFT — they belong to the agent, not the user.
 */
export const ConversationSchema = Type.Object({
    id: Type.String({ minLength: 1, description: 'Conversation ID' }),
    nft_id: NftIdSchema,
    title: Type.Optional(Type.String()),
    status: ConversationStatusSchema,
    sealing_policy: Type.Optional(ConversationSealingPolicySchema),
    message_count: Type.Integer({ minimum: 0 }),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' }),
    sealed_at: Type.Optional(Type.String({ format: 'date-time' })),
    sealed_by: Type.Optional(Type.String({
        minLength: 1,
        description: 'Transfer ID that caused sealing (causal audit trail)',
    })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'Conversation',
    additionalProperties: false,
});
/** Message role within a conversation. */
export const MessageRoleSchema = Type.Union([
    Type.Literal('user'),
    Type.Literal('assistant'),
    Type.Literal('system'),
    Type.Literal('tool'),
], { $id: 'MessageRole' });
/** Individual message within a conversation. */
export const MessageSchema = Type.Object({
    id: Type.String({ minLength: 1, description: 'Message ID' }),
    conversation_id: Type.String({ minLength: 1 }),
    role: MessageRoleSchema,
    content: Type.String(),
    model: Type.Optional(Type.String()),
    pool_id: Type.Optional(Type.String()),
    billing_entry_id: Type.Optional(Type.String()),
    tool_calls: Type.Optional(Type.Array(Type.Object({
        id: Type.String(),
        name: Type.String(),
        arguments: Type.String(),
        model_source: Type.Optional(Type.String({
            description: 'Model that generated this tool call (for multi-model debugging)',
        })),
    }, { additionalProperties: false }))),
    created_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'Message',
    additionalProperties: false,
});
//# sourceMappingURL=conversation.js.map