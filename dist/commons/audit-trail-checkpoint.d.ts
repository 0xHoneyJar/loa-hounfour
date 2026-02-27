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
import type { AuditTrail } from './audit-trail.js';
import { type AuditTrailVerificationResult } from './audit-trail-hash.js';
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
export declare function createCheckpoint(trail: AuditTrail, index?: number): CheckpointResult;
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
export declare function verifyCheckpointContinuity(trail: AuditTrail): AuditTrailVerificationResult;
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
export declare function pruneBeforeCheckpoint(trail: AuditTrail): AuditTrail;
//# sourceMappingURL=audit-trail-checkpoint.d.ts.map