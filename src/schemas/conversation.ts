import { Type, type Static } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';
import { ToolCallSchema } from './tool-call.js';

/** Conversation lifecycle status. */
export const ConversationStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('paused'),
  Type.Literal('sealed'),
  Type.Literal('archived'),
], { $id: 'ConversationStatus' });

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
    description: 'Roles granted access (required for role_based). '
      + 'Role names are intentionally unconstrained at the protocol level — '
      + 'domain-specific validation (e.g., valid role enums) is the consumer\'s responsibility.',
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
  'x-cross-field-validated': true,
  $comment: 'Cross-field invariants: '
    + '(1) time_limited requires duration_hours. '
    + '(2) role_based requires roles array. '
    + 'Enforced by validateAccessPolicy() in TypeScript.',
});

export type AccessPolicy = Static<typeof AccessPolicySchema>;

/**
 * Options for access policy validation.
 *
 * @since v3.1.0
 */
export interface AccessPolicyValidationOptions {
  /**
   * When `true`, warnings are promoted to errors. Use this in production
   * deployment where extraneous fields should be treated as hard failures.
   *
   * For example, `type: 'none'` with `duration_hours: 24` is valid but
   * suspicious — in strict mode it becomes an error.
   *
   * @default false
   * @see BB-C5-Part5-§4 — Strict mode for production deployment
   */
  strict?: boolean;
}

/**
 * Validate cross-field invariants for an access policy:
 * - `time_limited` requires `duration_hours`
 * - `role_based` requires `roles` array
 * - Warns when extraneous fields are present for non-matching types
 *
 * @param policy - The access policy to validate
 * @param options - Validation options. `{ strict: true }` promotes warnings to errors.
 */
export function validateAccessPolicy(
  policy: AccessPolicy,
  options?: AccessPolicyValidationOptions,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const strict = options?.strict ?? false;

  // Required field checks
  if (policy.type === 'time_limited' && policy.duration_hours === undefined) {
    errors.push('duration_hours is required when type is "time_limited"');
  }
  if (policy.type === 'role_based' && (!policy.roles || policy.roles.length === 0)) {
    errors.push('roles array is required and must be non-empty when type is "role_based"');
  }

  // Extraneous field checks (BB-C5-002/005)
  // In strict mode, these become errors instead of warnings (BB-C5-Part5-§4)
  if (policy.type !== 'time_limited' && policy.duration_hours !== undefined) {
    const msg = `duration_hours is only meaningful when type is "time_limited" (current type: "${policy.type}")`;
    if (strict) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }
  if (policy.type !== 'role_based' && policy.roles !== undefined) {
    const msg = `roles is only meaningful when type is "role_based" (current type: "${policy.type}")`;
    if (strict) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
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
  'x-cross-field-validated': true,
  $comment: 'Cross-field invariants: '
    + '(1) When encryption_scheme !== "none", key_derivation must be non-"none" and key_reference must be provided. '
    + '(2) When access_policy.type is "time_limited", duration_hours must be set. '
    + '(3) When access_policy.type is "role_based", roles must be non-empty. '
    + 'Enforced by validateSealingPolicy() in TypeScript. '
    + 'Cross-language consumers should implement equivalent validation.',
});

export type ConversationSealingPolicy = Static<typeof ConversationSealingPolicySchema>;

/**
 * Validate cross-field invariants for a sealing policy:
 * - When encryption_scheme !== 'none', key_derivation must be non-'none'
 *   and key_reference must be provided.
 * - When access_policy is present, validates its cross-field invariants.
 */
export function validateSealingPolicy(
  policy: ConversationSealingPolicy,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
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
    warnings.push(...apResult.warnings);
  }
  return { valid: errors.length === 0, errors, warnings };
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
  description: 'NFT-owned conversation with sealing policy and access control',
  additionalProperties: false,
});

export type Conversation = Static<typeof ConversationSchema>;

/** Message role within a conversation. */
export const MessageRoleSchema = Type.Union([
  Type.Literal('user'),
  Type.Literal('assistant'),
  Type.Literal('system'),
  Type.Literal('tool'),
], { $id: 'MessageRole' });

export type MessageRole = Static<typeof MessageRoleSchema>;

/** Individual message within a conversation. */
export const MessageSchema = Type.Object({
  id: Type.String({ minLength: 1, description: 'Message ID' }),
  conversation_id: Type.String({ minLength: 1 }),
  role: MessageRoleSchema,
  content: Type.String(),
  model: Type.Optional(Type.String()),
  pool_id: Type.Optional(Type.String()),
  billing_entry_id: Type.Optional(Type.String()),
  tool_calls: Type.Optional(Type.Array(ToolCallSchema)),
  created_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'Message',
  description: 'Individual message within an NFT-owned conversation',
  additionalProperties: false,
});

export type Message = Static<typeof MessageSchema>;
