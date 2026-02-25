/**
 * Domain-separated hash utility for audit trail entries.
 *
 * Uses @noble/hashes (not node:crypto) for browser compatibility,
 * consistent with scoring-path-hash.ts. Serialization uses RFC 8785
 * canonical JSON for determinism.
 *
 * Domain tag format: "loa-commons:audit:<schema_$id>:<contract_version>"
 *
 * @see SDD §4.14 — Domain-Separated Hash Utility
 * @see SDD §4.8 — Hash Chain Operational Response (FR-3)
 * @since v8.0.0
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import _canonicalize from 'canonicalize';
import type { AuditEntry, AuditTrail } from './audit-trail.js';

const canonicalize = _canonicalize as unknown as (input: unknown) => string | undefined;

/**
 * Build the domain tag for audit entry hashing.
 *
 * @param schemaId - The $id of the governed resource schema (e.g., 'GovernedCredits')
 * @param contractVersion - Protocol version (e.g., '8.0.0')
 * @returns Domain tag string
 */
export function buildDomainTag(schemaId: string, contractVersion: string): string {
  return `loa-commons:audit:${schemaId}:${contractVersion}`;
}

/**
 * Hashable fields of an AuditEntry (excluding hash chain metadata).
 */
export interface AuditEntryHashInput {
  entry_id: string;
  timestamp: string;
  event_type: string;
  actor_id?: string;
  payload?: unknown;
}

/**
 * Compute domain-separated SHA-256 hash of an audit entry's content fields.
 *
 * Hash = sha256(domain_tag + canonical_json(content_fields))
 *
 * @param entry - Content fields of the audit entry (excluding hash fields)
 * @param domainTag - Domain tag string (from buildDomainTag)
 * @returns Hash string in `sha256:<64 hex chars>` format
 * @throws If canonicalization fails
 */
export function computeAuditEntryHash(
  entry: AuditEntryHashInput,
  domainTag: string,
): string {
  const hashInput: AuditEntryHashInput = {
    entry_id: entry.entry_id,
    timestamp: entry.timestamp,
    event_type: entry.event_type,
    ...(entry.actor_id !== undefined && { actor_id: entry.actor_id }),
    ...(entry.payload !== undefined && { payload: entry.payload }),
  };
  const canonical = canonicalize(hashInput);
  if (canonical === undefined) {
    throw new Error('Failed to canonicalize AuditEntry');
  }
  const input = domainTag + canonical;
  return `sha256:${bytesToHex(sha256(new TextEncoder().encode(input)))}`;
}

/**
 * Result of audit trail integrity verification.
 */
export interface AuditTrailVerificationResult {
  valid: boolean;
  failure_phase?: 'content' | 'chain';
  failure_index?: number;
  expected_hash?: string;
  actual_hash?: string;
}

/**
 * Two-phase audit trail integrity verification (Flatline IMP-004).
 *
 * Phase 1 (content): Recompute entry_hash for each entry using domain tag.
 * Phase 2 (chain): Verify previous_hash linkage.
 *
 * @param trail - The AuditTrail to verify
 * @returns Verification result with failure details if invalid
 */
export function verifyAuditTrailIntegrity(
  trail: AuditTrail,
): AuditTrailVerificationResult {
  const entries = trail.entries;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Phase 1: Recompute content hash
    const recomputedHash = computeAuditEntryHash(
      {
        entry_id: entry.entry_id,
        timestamp: entry.timestamp,
        event_type: entry.event_type,
        ...(entry.actor_id !== undefined && { actor_id: entry.actor_id }),
        ...(entry.payload !== undefined && { payload: entry.payload }),
      },
      entry.hash_domain_tag,
    );

    if (recomputedHash !== entry.entry_hash) {
      return {
        valid: false,
        failure_phase: 'content',
        failure_index: i,
        expected_hash: entry.entry_hash,
        actual_hash: recomputedHash,
      };
    }

    // Phase 2: Verify chain linkage
    const expectedPrevious = i === 0
      ? trail.genesis_hash
      : entries[i - 1].entry_hash;

    if (entry.previous_hash !== expectedPrevious) {
      return {
        valid: false,
        failure_phase: 'chain',
        failure_index: i,
        expected_hash: expectedPrevious,
        actual_hash: entry.previous_hash,
      };
    }
  }

  return { valid: true };
}
