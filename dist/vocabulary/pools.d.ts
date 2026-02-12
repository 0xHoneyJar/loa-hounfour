import type { Tier } from '../schemas/jwt-claims.js';
/** Canonical pool identifiers. */
export declare const POOL_IDS: readonly ["cheap", "fast-code", "reviewer", "reasoning", "architect"];
export type PoolId = (typeof POOL_IDS)[number];
/** TypeBox schema for pool ID validation. */
export declare const PoolIdSchema: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>;
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
export declare const TIER_POOL_ACCESS: Record<Tier, readonly PoolId[]>;
/**
 * Default pool for each tier (used when no preference specified).
 */
export declare const TIER_DEFAULT_POOL: Record<Tier, PoolId>;
/**
 * Check if a pool ID is valid.
 */
export declare function isValidPoolId(id: string): id is PoolId;
/**
 * Check if a tier has access to a pool.
 */
export declare function tierHasAccess(tier: Tier, poolId: PoolId): boolean;
//# sourceMappingURL=pools.d.ts.map