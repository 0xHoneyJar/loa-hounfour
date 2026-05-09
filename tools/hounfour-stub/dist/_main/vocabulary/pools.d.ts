/**
 * Canonical pool vocabulary and tier-to-pool mapping.
 *
 * Pool IDs are the shared language between loa-finn routing
 * and arrakis distribution. Unknown pool IDs are rejected with 400.
 *
 * @see SDD 4.5 — Pool Registry
 */
import { type Static } from '@sinclair/typebox';
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
 * Pool capabilities schema.
 *
 * Defines the shape of pool capability declarations so both loa-finn
 * and arrakis validate pool configs against the same structure.
 * Actual capability values remain in consumer config — this is shape only.
 *
 * @see PR #61 BridgeBuilder review — Finding 5
 */
export declare const PoolCapabilitiesSchema: import("@sinclair/typebox").TObject<{
    pool_id: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>;
    models: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    max_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    supports_streaming: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    supports_tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    priority: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type PoolCapabilities = Static<typeof PoolCapabilitiesSchema>;
/**
 * Check if a pool ID is valid.
 */
export declare function isValidPoolId(id: string): id is PoolId;
/**
 * Check if a tier has access to a pool.
 */
export declare function tierHasAccess(tier: Tier, poolId: PoolId): boolean;
//# sourceMappingURL=pools.d.ts.map