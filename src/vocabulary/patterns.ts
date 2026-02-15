/**
 * UUID v4 pattern for protocol-generated identifiers.
 * Used for financial records (escrow_id, stake_id) requiring global uniqueness.
 * Consumer-provided IDs (agent_id, pool_id) use opaque strings with minLength:1.
 */
export const UUID_V4_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

/**
 * Constraints for consumer-provided opaque identifiers.
 * Used for agent_id, pool_id, community_id — entities where
 * the format is consumer-defined (could be UUID, nanoid, etc.).
 */
export const OPAQUE_ID_CONSTRAINTS = { minLength: 1 } as const;
