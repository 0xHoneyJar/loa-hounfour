/**
 * Server-derived idempotency key.
 *
 * Canonical derivation (SDD 6.1):
 *   deriveIdempotencyKey(tenant, reqHash, provider, model) =
 *     SHA256(tenant + ":" + reqHash + ":" + provider + ":" + model)
 *
 * This key is deterministic for the same logical request regardless of:
 * - retry attempt number
 * - trace_id regeneration
 * - timestamp differences
 *
 * Used for exactly-once budget recording in Redis Lua.
 *
 * @see SDD 6.1 — Idempotency Semantics
 */
import { createHash } from 'node:crypto';
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
export function deriveIdempotencyKey(tenant, reqHash, provider, model) {
    if (!tenant || !reqHash || !provider || !model) {
        throw new Error('All idempotency key components are required');
    }
    const canonical = `${tenant}:${reqHash}:${provider}:${model}`;
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
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
//# sourceMappingURL=idempotency.js.map