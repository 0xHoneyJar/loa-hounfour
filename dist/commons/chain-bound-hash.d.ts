import { type AuditEntryHashInput } from './audit-trail-hash.js';
/**
 * Typed error for chain-bound hash operations.
 */
export declare class ChainBoundHashError extends Error {
    readonly code: 'CANONICALIZATION_FAILED' | 'INVALID_DOMAIN_TAG' | 'INVALID_PREVIOUS_HASH';
    constructor(code: ChainBoundHashError['code'], message: string);
}
/**
 * Validate a domain tag for chain-bound hashing.
 *
 * Format: {repo}:{domain}:{qualifier}
 * - At least 3 colon-separated segments
 * - No empty segments
 * - Each segment: lowercase alphanumeric, hyphens, underscores
 *
 * @param domainTag - Domain tag string to validate
 * @returns Validation result with error detail if invalid
 */
export declare function validateDomainTag(domainTag: string): {
    valid: boolean;
    error?: string;
};
/**
 * Compute a chain-bound hash that links an audit entry to its predecessor.
 *
 * Algorithm:
 * 1. contentHash = computeAuditEntryHash(entry, domainTag)
 * 2. chainInput = `${contentHash}:${previousHash}` (UTF-8, colon 0x3A delimiter)
 * 3. return `sha256:${bytesToHex(sha256(chainInput))}`
 *
 * @param entry - Hashable audit entry fields
 * @param domainTag - Domain tag for content hashing (validated)
 * @param previousHash - Hash of the preceding entry (or AUDIT_TRAIL_GENESIS_HASH for genesis)
 * @returns Chain-bound hash in `sha256:<64 hex chars>` format
 * @throws {ChainBoundHashError} On empty domain tag, invalid previous hash, or canonicalization failure
 */
export declare function computeChainBoundHash(entry: AuditEntryHashInput, domainTag: string, previousHash: string): string;
/** Re-export genesis hash for convenience. */
export { AUDIT_TRAIL_GENESIS_HASH } from './audit-trail.js';
export type { AuditEntryHashInput } from './audit-trail-hash.js';
//# sourceMappingURL=chain-bound-hash.d.ts.map