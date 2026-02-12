/**
 * Canonical pool vocabulary and tier-to-pool mapping.
 *
 * Pool IDs are the shared language between loa-finn routing
 * and arrakis distribution. Unknown pool IDs are rejected with 400.
 *
 * @see SDD 4.5 — Pool Registry
 */
import { Type, type Static } from '@sinclair/typebox';
import type { Tier } from '../schemas/jwt-claims.js';

/** Canonical pool identifiers. */
export const POOL_IDS = [
  'cheap',
  'fast-code',
  'reviewer',
  'reasoning',
  'architect',
] as const;

export type PoolId = (typeof POOL_IDS)[number];

/** TypeBox schema for pool ID validation. */
export const PoolIdSchema = Type.Union(
  POOL_IDS.map(id => Type.Literal(id)),
  { $id: 'PoolId', description: 'Canonical pool identifier' },
);

/**
 * Tier-to-pool access mapping.
 *
 * | Pool       | free | pro  | enterprise |
 * |------------|------|------|------------|
 * | cheap      | ✓    | ✓    | ✓          |
 * | fast-code  |      | ✓    | ✓          |
 * | reviewer   |      | ✓    | ✓          |
 * | reasoning  |      |      | ✓          |
 * | architect  |      |      | ✓          |
 */
export const TIER_POOL_ACCESS: Record<Tier, readonly PoolId[]> = {
  free: ['cheap'],
  pro: ['cheap', 'fast-code', 'reviewer'],
  enterprise: ['cheap', 'fast-code', 'reviewer', 'reasoning', 'architect'],
} as const;

/**
 * Default pool for each tier (used when no preference specified).
 */
export const TIER_DEFAULT_POOL: Record<Tier, PoolId> = {
  free: 'cheap',
  pro: 'fast-code',
  enterprise: 'reviewer',
} as const;

/**
 * Pool capabilities schema.
 *
 * Defines the shape of pool capability declarations so both loa-finn
 * and arrakis validate pool configs against the same structure.
 * Actual capability values remain in consumer config — this is shape only.
 *
 * @see PR #61 BridgeBuilder review — Finding 5
 */
export const PoolCapabilitiesSchema = Type.Object({
  pool_id: PoolIdSchema,
  models: Type.Array(Type.String(), { description: 'Supported model identifiers' }),
  max_tokens: Type.Optional(Type.Integer({ minimum: 1, description: 'Max output tokens' })),
  supports_streaming: Type.Optional(Type.Boolean({ description: 'Whether pool supports SSE streaming' })),
  supports_tools: Type.Optional(Type.Boolean({ description: 'Whether pool supports tool/function calling' })),
  priority: Type.Optional(Type.Integer({ minimum: 0, description: 'Routing priority (lower = preferred)' })),
}, { $id: 'PoolCapabilities', description: 'Shape validation for pool capability declarations' });

export type PoolCapabilities = Static<typeof PoolCapabilitiesSchema>;

/**
 * Check if a pool ID is valid.
 */
export function isValidPoolId(id: string): id is PoolId {
  return (POOL_IDS as readonly string[]).includes(id);
}

/**
 * Check if a tier has access to a pool.
 */
export function tierHasAccess(tier: Tier, poolId: PoolId): boolean {
  return (TIER_POOL_ACCESS[tier] as readonly string[]).includes(poolId);
}
