/**
 * Hash utilities for tamper-evident ScoringPathLog chains.
 *
 * Uses @noble/hashes (not node:crypto) for browser compatibility,
 * consistent with `reputation-replay.ts:computeEventStreamHash()`.
 * Serialization uses RFC 8785 canonical JSON for determinism.
 *
 * @see ADR-003 — Bridgebuilder Meditation III (Ostrom Principle 4)
 * @since v7.11.0
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import _canonicalize from 'canonicalize';

const canonicalize = _canonicalize as unknown as (input: unknown) => string | undefined;

/**
 * SHA-256 of empty string — genesis sentinel for the first entry in a chain.
 *
 * Matches the EMPTY_BODY_HASH pattern in `src/integrity/req-hash.ts`.
 */
export const SCORING_PATH_GENESIS_HASH =
  'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Hashable fields of a ScoringPathLog entry.
 *
 * Excludes `entry_hash` and `previous_hash` (chain metadata) —
 * only the content fields are hashed.
 */
export interface ScoringPathHashInput {
  path: string;
  model_id?: string;
  task_type?: string;
  reason?: string;
  scored_at?: string;
}

/**
 * Compute SHA-256 hash of a ScoringPathLog entry's content fields.
 *
 * Uses RFC 8785 canonical JSON for deterministic serialization,
 * then SHA-256 for hashing. Returns `sha256:<64 hex chars>`.
 *
 * @param entry - Content fields of the ScoringPathLog entry (excluding hash fields)
 * @returns Hash string in `sha256:<hex>` format
 * @throws If canonicalization fails
 */
export function computeScoringPathHash(entry: ScoringPathHashInput): string {
  // Runtime field stripping — prevent structural subtyping from leaking
  // chain metadata (entry_hash, previous_hash) into the hash input.
  // TypeScript interfaces are erased at runtime; this is the real boundary.
  const hashInput: ScoringPathHashInput = {
    path: entry.path,
    ...(entry.model_id !== undefined && { model_id: entry.model_id }),
    ...(entry.task_type !== undefined && { task_type: entry.task_type }),
    ...(entry.reason !== undefined && { reason: entry.reason }),
    ...(entry.scored_at !== undefined && { scored_at: entry.scored_at }),
  };
  const canonical = canonicalize(hashInput);
  if (canonical === undefined) {
    throw new Error('Failed to canonicalize ScoringPathLog entry');
  }
  return `sha256:${bytesToHex(sha256(new TextEncoder().encode(canonical)))}`;
}
