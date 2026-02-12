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
