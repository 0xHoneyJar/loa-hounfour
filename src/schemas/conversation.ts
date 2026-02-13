import { Type, type Static } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';

/** Conversation lifecycle status. */
export const ConversationStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('paused'),
  Type.Literal('sealed'),
  Type.Literal('archived'),
], { $id: 'ConversationStatus' });

export type ConversationStatus = Static<typeof ConversationStatusSchema>;

/**
 * Governs conversation data handling during NFT transfers.
 *
 * When encryption_scheme !== 'none', key_derivation must also be non-'none'
 * and key_reference must be provided. The reverse is not enforced at the
 * schema level — encryption_scheme: 'none' with key_reference is valid (ignored).
 */
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
  previous_owner_access: Type.Union([
    Type.Literal('none'),
    Type.Literal('read_only_24h'),
  ]),
}, {
  $id: 'ConversationSealingPolicy',
  additionalProperties: false,
});

export type ConversationSealingPolicy = Static<typeof ConversationSealingPolicySchema>;

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
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'Conversation',
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
  tool_calls: Type.Optional(Type.Array(Type.Object({
    id: Type.String(),
    name: Type.String(),
    arguments: Type.String(),
  }))),
  created_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'Message',
  additionalProperties: false,
});

export type Message = Static<typeof MessageSchema>;
