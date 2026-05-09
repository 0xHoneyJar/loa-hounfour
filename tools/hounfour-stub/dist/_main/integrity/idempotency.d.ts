/**
 * Derive a canonical idempotency key for budget recording.
 *
 * The key ensures that retrying the same logical request
 * (same tenant, same body hash, same target model) produces
 * the same key — preventing double-charge even if trace_id differs.
 *
 * @param tenant - Tenant identifier from JWT claims
 * @param reqHash - Canonical request hash ("sha256:...")
 * @param provider - Target provider (e.g., "openai", "anthropic")
 * @param model - Target model (e.g., "gpt-4o", "claude-opus-4-6")
 * @returns Hex-encoded SHA-256 idempotency key
 */
export declare function deriveIdempotencyKey(tenant: string, reqHash: string, provider: string, model: string): string;
/**
 * End-to-end idempotency behavior:
 *
 * | Scenario                     | Same Key? | Behavior                           |
 * |-----------------------------|-----------|------------------------------------|
 * | Retry same request          | YES       | Return cached cost, no charge      |
 * | Same body, different model  | NO        | New charge (different model)        |
 * | Different body, same model  | NO        | New charge (different reqHash)      |
 * | Same body, same model, retry| YES       | Return cached (exactly-once)        |
 *
 * Streaming interaction:
 * - Key derived BEFORE stream starts (from request body hash)
 * - Budget reserved atomically using ensemble_reserve.lua
 * - On stream completion: commit actual cost via ensemble_commit.lua
 * - On abort: release unused reservation
 *
 * Budget interaction:
 * - Redis Lua: SET idem:{key} NX EX 86400
 * - If key exists: return cached cost (no INCRBY)
 * - If new: INCRBY committed + store cost at key
 */
//# sourceMappingURL=idempotency.d.ts.map