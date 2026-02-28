/**
 * Chain-Bound Hash — extends audit entry hashing with chain linkage.
 *
 * Computes sha256(contentHash + ":" + previousHash) to bind each entry
 * to its predecessor, creating a tamper-evident chain with domain separation.
 *
 * Uses existing @noble/hashes and canonicalize — no new dependencies.
 * Opt-in: existing computeAuditEntryHash() remains for simple use cases.
 *
 * Byte-level framing: all strings UTF-8 encoded, colon delimiter (0x3A).
 *
 * @see PRD FR-5 — Audit Trail Domain Separation + Chain-Bound Hash
 * @see SDD §5.1 — Chain-Bound Hash
 * @since v8.3.0
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  computeAuditEntryHash,
  type AuditEntryHashInput,
} from './audit-trail-hash.js';
import { AUDIT_TRAIL_GENESIS_HASH } from './audit-trail.js';

/**
 * Typed error for chain-bound hash operations.
 */
export class ChainBoundHashError extends Error {
  readonly code: 'CANONICALIZATION_FAILED' | 'INVALID_DOMAIN_TAG' | 'INVALID_PREVIOUS_HASH';

  constructor(code: ChainBoundHashError['code'], message: string) {
    super(message);
    this.name = 'ChainBoundHashError';
    this.code = code;
  }
}

/** Domain tag validation regex: {repo}:{domain}:{qualifier}, each segment lowercase alphanumeric + hyphens/underscores. */
const DOMAIN_TAG_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/;

/** SHA-256 hash format. */
const SHA256_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

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
export function validateDomainTag(domainTag: string): {
  valid: boolean;
  error?: string;
} {
  if (!domainTag || domainTag.length === 0) {
    return { valid: false, error: 'Domain tag must not be empty' };
  }

  const segments = domainTag.split(':');
  if (segments.length < 3) {
    return {
      valid: false,
      error: `Domain tag must have at least 3 colon-separated segments, got ${segments.length}`,
    };
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.length === 0) {
      return { valid: false, error: `Segment ${i} is empty` };
    }
    if (!DOMAIN_TAG_SEGMENT.test(segment)) {
      return {
        valid: false,
        error: `Segment ${i} ("${segment}") must be lowercase alphanumeric with hyphens/underscores`,
      };
    }
  }

  return { valid: true };
}

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
export function computeChainBoundHash(
  entry: AuditEntryHashInput,
  domainTag: string,
  previousHash: string,
): string {
  // Validate domain tag
  const tagResult = validateDomainTag(domainTag);
  if (!tagResult.valid) {
    throw new ChainBoundHashError('INVALID_DOMAIN_TAG', tagResult.error!);
  }

  // Validate previous hash format
  if (!SHA256_HASH_PATTERN.test(previousHash)) {
    throw new ChainBoundHashError(
      'INVALID_PREVIOUS_HASH',
      `Previous hash must match sha256:<64 hex> format, got "${previousHash}"`,
    );
  }

  // Step 1: Compute content hash using existing function
  let contentHash: string;
  try {
    contentHash = computeAuditEntryHash(entry, domainTag);
  } catch {
    throw new ChainBoundHashError(
      'CANONICALIZATION_FAILED',
      'Failed to canonicalize audit entry for content hash',
    );
  }

  // Step 2: Chain input = contentHash:previousHash (UTF-8, colon 0x3A)
  const chainInput = `${contentHash}:${previousHash}`;

  // Step 3: SHA-256 of chain input
  return `sha256:${bytesToHex(sha256(new TextEncoder().encode(chainInput)))}`;
}

/** Re-export genesis hash for convenience. */
export { AUDIT_TRAIL_GENESIS_HASH } from './audit-trail.js';
export type { AuditEntryHashInput } from './audit-trail-hash.js';
