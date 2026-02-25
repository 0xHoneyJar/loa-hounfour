/**
 * Audit trail checkpointing utilities.
 *
 * Provides operational logic for the checkpoint_hash and checkpoint_index
 * fields on AuditTrailSchema. Enables pruning old entries while maintaining
 * hash chain continuity.
 *
 * @see Bridgebuilder Finding F8 — Checkpoint fields without operational logic
 * @see SDD §4.3.1 — Audit Trail Checkpointing (Flatline IMP-003)
 * @since v8.1.0
 */
import type { AuditTrail, AuditEntry } from './audit-trail.js';
import { verifyAuditTrailIntegrity, type AuditTrailVerificationResult } from './audit-trail-hash.js';

/**
 * Result of creating a checkpoint on an audit trail.
 */
export interface CheckpointResult {
  /** Whether the checkpoint was created successfully. */
  success: boolean;
  /** The updated audit trail with checkpoint fields set. */
  trail: AuditTrail;
  /** The index of the checkpointed entry. */
  checkpoint_index: number;
  /** The hash of the checkpointed entry. */
  checkpoint_hash: string;
  /** Error message if checkpoint creation failed. */
  error?: string;
}

/**
 * Create a checkpoint at a specified index in the audit trail.
 *
 * The checkpoint records the entry_hash at the given index, allowing entries
 * before the checkpoint to be pruned later while maintaining chain integrity.
 *
 * @param trail - The audit trail to checkpoint
 * @param index - The entry index to checkpoint at (defaults to last entry)
 * @returns CheckpointResult with the updated trail
 */
export function createCheckpoint(
  trail: AuditTrail,
  index?: number,
): CheckpointResult {
  if (trail.entries.length === 0) {
    return {
      success: false,
      trail,
      checkpoint_index: -1,
      checkpoint_hash: '',
      error: 'Cannot checkpoint an empty audit trail',
    };
  }

  const targetIndex = index ?? trail.entries.length - 1;

  if (targetIndex < 0 || targetIndex >= trail.entries.length) {
    return {
      success: false,
      trail,
      checkpoint_index: -1,
      checkpoint_hash: '',
      error: `Checkpoint index ${targetIndex} out of range [0, ${trail.entries.length - 1}]`,
    };
  }

  const checkpointHash = trail.entries[targetIndex].entry_hash;

  return {
    success: true,
    trail: {
      ...trail,
      checkpoint_hash: checkpointHash,
      checkpoint_index: targetIndex,
    },
    checkpoint_index: targetIndex,
    checkpoint_hash: checkpointHash,
  };
}

/**
 * Verify that entries after a checkpoint chain correctly from the checkpoint hash.
 *
 * This validates that the segment after checkpoint_index maintains hash chain
 * integrity, with the first post-checkpoint entry's previous_hash matching
 * the checkpoint_hash.
 *
 * @param trail - The audit trail with checkpoint fields
 * @returns Verification result
 */
export function verifyCheckpointContinuity(
  trail: AuditTrail,
): AuditTrailVerificationResult {
  if (trail.checkpoint_hash === undefined || trail.checkpoint_index === undefined) {
    return { valid: true }; // No checkpoint — nothing to verify
  }

  const postCheckpointEntries = trail.entries.slice(trail.checkpoint_index + 1);

  if (postCheckpointEntries.length === 0) {
    return { valid: true }; // No entries after checkpoint
  }

  // First post-checkpoint entry must link to checkpoint hash
  const firstPostEntry = postCheckpointEntries[0];
  if (firstPostEntry.previous_hash !== trail.checkpoint_hash) {
    return {
      valid: false,
      failure_phase: 'chain',
      failure_index: trail.checkpoint_index + 1,
      expected_hash: trail.checkpoint_hash,
      actual_hash: firstPostEntry.previous_hash,
    };
  }

  // Verify the rest of the chain normally
  const postTrail: AuditTrail = {
    ...trail,
    entries: postCheckpointEntries,
    genesis_hash: trail.checkpoint_hash,
  };

  return verifyAuditTrailIntegrity(postTrail);
}

/**
 * Prune entries before the checkpoint, preserving chain integrity.
 *
 * Returns a new AuditTrail with only entries after the checkpoint index.
 * The checkpoint hash becomes the effective genesis for the pruned trail.
 *
 * @param trail - The audit trail with checkpoint fields
 * @returns A new AuditTrail with pre-checkpoint entries removed, or the
 *          original trail if no checkpoint exists
 */
export function pruneBeforeCheckpoint(
  trail: AuditTrail,
): AuditTrail {
  if (trail.checkpoint_hash === undefined || trail.checkpoint_index === undefined) {
    return trail; // No checkpoint — return as-is
  }

  const keptEntries = trail.entries.slice(trail.checkpoint_index + 1);

  return {
    ...trail,
    entries: keptEntries,
    // The checkpoint hash becomes the effective genesis for the pruned chain
    genesis_hash: trail.checkpoint_hash,
    // Clear checkpoint fields (they've been consumed)
    checkpoint_hash: undefined,
    checkpoint_index: undefined,
  };
}
