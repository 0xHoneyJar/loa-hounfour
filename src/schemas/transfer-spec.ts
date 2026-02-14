import { Type, type Static } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';
import { ConversationSealingPolicySchema } from './conversation.js';

/** Transfer scenario categorization. */
export const TransferScenarioSchema = Type.Union([
  Type.Literal('sale'),
  Type.Literal('gift'),
  Type.Literal('admin_recovery'),
  Type.Literal('custody_change'),
], { $id: 'TransferScenario' });

export type TransferScenario = Static<typeof TransferScenarioSchema>;

/** Transfer outcome status. */
export const TransferResultSchema = Type.Union([
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('rolled_back'),
], { $id: 'TransferResult' });

export type TransferResult = Static<typeof TransferResultSchema>;

/** Ethereum address pattern for owner fields. */
const EthAddress = Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' });

/**
 * Transfer specification — initiates an NFT ownership transfer.
 * Captures who, what, why, and the sealing policy for conversation data.
 */
export const TransferSpecSchema = Type.Object({
  transfer_id: Type.String({ minLength: 1, description: 'Transfer ID' }),
  nft_id: NftIdSchema,
  from_owner: EthAddress,
  to_owner: EthAddress,
  scenario: TransferScenarioSchema,
  sealing_policy: ConversationSealingPolicySchema,
  initiated_at: Type.String({ format: 'date-time' }),
  initiated_by: Type.String({ minLength: 1, description: 'Actor who initiated the transfer' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'TransferSpec',
  description: 'Specification for NFT ownership transfers between parties',
  additionalProperties: false,
});

export type TransferSpec = Static<typeof TransferSpecSchema>;

/**
 * Transfer event record — outcome of a completed or failed transfer.
 *
 * Named TransferEventRecord (not TransferEvent) to avoid collision with
 * the DomainEvent typed wrapper TransferEvent in domain-event.ts.
 */
export const TransferEventSchema = Type.Object({
  transfer_id: Type.String({ minLength: 1 }),
  nft_id: NftIdSchema,
  from_owner: EthAddress,
  to_owner: EthAddress,
  scenario: TransferScenarioSchema,
  result: TransferResultSchema,
  sealing_policy: ConversationSealingPolicySchema,
  conversations_sealed: Type.Integer({ minimum: 0 }),
  conversations_migrated: Type.Integer({ minimum: 0 }),
  initiated_at: Type.String({ format: 'date-time' }),
  completed_at: Type.Optional(Type.String({ format: 'date-time' })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'TransferEventRecord',
  description: 'Record of a completed NFT ownership transfer',
  additionalProperties: false,
});

export type TransferEventRecord = Static<typeof TransferEventSchema>;
