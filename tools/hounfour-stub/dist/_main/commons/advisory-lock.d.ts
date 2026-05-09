/**
 * Advisory Lock Key — FNV-1a 32-bit hash for PostgreSQL advisory locks.
 *
 * Generates deterministic signed 32-bit integers suitable for
 * pg_advisory_xact_lock(). Replaces Java's hashCode() which has
 * poor distribution and birthday paradox issues at O(10K) domain tags.
 *
 * Input normalization:
 * - Empty string returns deterministic hash (valid but documented as bad practice)
 * - Unicode tags normalized to UTF-8 bytes before hashing
 * - Whitespace-only tags produce deterministic result (bad practice, documented)
 *
 * Collision probability bounds (FNV-1a 32-bit):
 * - ~1 in 2^16 at 256 tags
 * - ~1 in 2^10 at 1024 tags
 * - 10,000 random tags: ≤2 collisions expected (birthday paradox bound)
 *
 * @see PRD FR-5 — Audit Trail Domain Separation
 * @see SDD §5.4 — Advisory Lock Key
 * @since v8.3.0
 */
/**
 * Compute a 32-bit advisory lock key from a domain tag using FNV-1a.
 *
 * Returns a signed 32-bit integer suitable for PostgreSQL's
 * pg_advisory_xact_lock(int4).
 *
 * @param domainTag - Domain tag string to hash
 * @returns Signed 32-bit integer lock key
 */
export declare function computeAdvisoryLockKey(domainTag: string): number;
//# sourceMappingURL=advisory-lock.d.ts.map