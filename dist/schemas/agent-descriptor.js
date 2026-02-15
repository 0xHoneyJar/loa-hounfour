import { Type } from '@sinclair/typebox';
import { NftIdSchema } from '../utilities/nft-id.js';
import { AgentLifecycleStateSchema } from './agent-lifecycle.js';
import { PoolIdSchema } from '../vocabulary/pools.js';
const AgentStatsSchema = Type.Object({
    interactions: Type.Integer({ minimum: 0, description: 'Total interactions count' }),
    uptime: Type.Number({ minimum: 0, maximum: 1, description: 'Uptime ratio (0-1)' }),
    created_at: Type.String({ format: 'date-time', description: 'Agent creation timestamp' }),
    last_active: Type.Optional(Type.String({ format: 'date-time', description: 'Last activity timestamp' })),
}, { $id: 'AgentStats', additionalProperties: false, description: 'Agent statistics' });
export const AgentDescriptorSchema = Type.Object({
    '@context': Type.Literal('https://schema.honeyjar.xyz/agent/v1', {
        description: 'JSON-LD context',
    }),
    // Identity
    id: NftIdSchema,
    name: Type.String({ minLength: 1, description: 'Display name' }),
    chain_id: Type.Integer({ minimum: 1, description: 'EIP-155 chain ID' }),
    collection: Type.String({
        pattern: '^0x[a-fA-F0-9]{40}$',
        description: 'NFT collection address',
    }),
    token_id: Type.String({ pattern: '^\\d+$', description: 'NFT token ID' }),
    // Personality
    personality: Type.String({ minLength: 1, description: 'Personality ID' }),
    description: Type.Optional(Type.String({ description: 'Short agent bio' })),
    avatar_url: Type.Optional(Type.String({ format: 'uri', description: 'Profile image URL' })),
    // Capabilities
    capabilities: Type.Array(Type.String(), {
        minItems: 1,
        description: 'Agent capabilities list',
    }),
    models: Type.Record(Type.String(), PoolIdSchema, {
        description: 'Task type → pool mapping',
    }),
    tools: Type.Optional(Type.Array(Type.String(), { description: 'Available tool IDs' })),
    // On-chain
    tba: Type.Optional(Type.String({ pattern: '^0x[a-fA-F0-9]{40}$', description: 'ERC-6551 TBA address' })),
    owner: Type.Optional(Type.String({ pattern: '^0x[a-fA-F0-9]{40}$', description: 'Current NFT owner address' })),
    // Network
    homepage: Type.String({ format: 'uri', description: 'Agent homepage URL' }),
    inbox: Type.Optional(Type.String({ format: 'uri', description: 'Agent inbox endpoint' })),
    llms_txt: Type.Optional(Type.String({ format: 'uri', description: 'Token-efficient markdown endpoint' })),
    // Stats
    stats: Type.Optional(AgentStatsSchema),
    // Lifecycle
    lifecycle_state: AgentLifecycleStateSchema,
    // Protocol
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version',
    }),
}, {
    $id: 'AgentDescriptor',
    additionalProperties: false,
    description: 'Canonical agent representation for content negotiation',
});
//# sourceMappingURL=agent-descriptor.js.map