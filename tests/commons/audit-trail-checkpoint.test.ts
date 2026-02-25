/**
 * Tests for audit trail checkpointing utilities.
 *
 * @see Bridgebuilder Finding F8 — Checkpoint fields without operational logic
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import { AUDIT_TRAIL_GENESIS_HASH, type AuditTrail, type AuditEntry } from '../../src/commons/audit-trail.js';
import { buildDomainTag, computeAuditEntryHash, verifyAuditTrailIntegrity } from '../../src/commons/audit-trail-hash.js';
import {
  createCheckpoint,
  verifyCheckpointContinuity,
  pruneBeforeCheckpoint,
} from '../../src/commons/audit-trail-checkpoint.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = buildDomainTag('Test', '8.1.0');

function buildEntry(id: string, ts: string, eventType: string, previousHash: string): AuditEntry {
  const input = { entry_id: id, timestamp: ts, event_type: eventType };
  const entryHash = computeAuditEntryHash(input, DOMAIN_TAG);
  return { ...input, entry_hash: entryHash, previous_hash: previousHash, hash_domain_tag: DOMAIN_TAG };
}

function buildChain(count: number): AuditTrail {
  const entries: AuditEntry[] = [];
  let prevHash = GENESIS;
  for (let i = 0; i < count; i++) {
    const entry = buildEntry(
      `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
      `2026-02-25T10:${String(i).padStart(2, '0')}:00Z`,
      'commons.resource.updated',
      prevHash,
    );
    entries.push(entry);
    prevHash = entry.entry_hash;
  }
  return {
    entries,
    hash_algorithm: 'sha256',
    genesis_hash: GENESIS,
    integrity_status: 'unverified',
  };
}

describe('createCheckpoint', () => {
  it('creates checkpoint at last entry by default', () => {
    const trail = buildChain(5);
    const result = createCheckpoint(trail);
    expect(result.success).toBe(true);
    expect(result.checkpoint_index).toBe(4);
    expect(result.checkpoint_hash).toBe(trail.entries[4].entry_hash);
    expect(result.trail.checkpoint_hash).toBe(trail.entries[4].entry_hash);
    expect(result.trail.checkpoint_index).toBe(4);
  });

  it('creates checkpoint at specified index', () => {
    const trail = buildChain(5);
    const result = createCheckpoint(trail, 2);
    expect(result.success).toBe(true);
    expect(result.checkpoint_index).toBe(2);
    expect(result.checkpoint_hash).toBe(trail.entries[2].entry_hash);
  });

  it('fails on empty trail', () => {
    const trail: AuditTrail = {
      entries: [],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    };
    const result = createCheckpoint(trail);
    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('fails on out-of-range index', () => {
    const trail = buildChain(3);
    const result = createCheckpoint(trail, 10);
    expect(result.success).toBe(false);
    expect(result.error).toContain('out of range');
  });

  it('fails on negative index', () => {
    const trail = buildChain(3);
    const result = createCheckpoint(trail, -1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('out of range');
  });

  it('creates checkpoint at index 0', () => {
    const trail = buildChain(3);
    const result = createCheckpoint(trail, 0);
    expect(result.success).toBe(true);
    expect(result.checkpoint_index).toBe(0);
  });
});

describe('verifyCheckpointContinuity', () => {
  it('passes when no checkpoint exists', () => {
    const trail = buildChain(5);
    const result = verifyCheckpointContinuity(trail);
    expect(result.valid).toBe(true);
  });

  it('passes for valid checkpoint continuity', () => {
    const trail = buildChain(5);
    const checkpointed = createCheckpoint(trail, 2).trail;
    const result = verifyCheckpointContinuity(checkpointed);
    expect(result.valid).toBe(true);
  });

  it('passes when checkpoint is at last entry (no post-checkpoint entries)', () => {
    const trail = buildChain(3);
    const checkpointed = createCheckpoint(trail).trail;
    const result = verifyCheckpointContinuity(checkpointed);
    expect(result.valid).toBe(true);
  });

  it('detects broken continuity after checkpoint', () => {
    const trail = buildChain(5);
    const checkpointed = createCheckpoint(trail, 2).trail;
    // Tamper with the entry after checkpoint
    const tampered = { ...checkpointed };
    tampered.entries = [...tampered.entries];
    tampered.entries[3] = { ...tampered.entries[3], previous_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' };
    const result = verifyCheckpointContinuity(tampered);
    expect(result.valid).toBe(false);
    expect(result.failure_phase).toBe('chain');
  });
});

describe('pruneBeforeCheckpoint', () => {
  it('returns original trail when no checkpoint', () => {
    const trail = buildChain(5);
    const pruned = pruneBeforeCheckpoint(trail);
    expect(pruned.entries).toHaveLength(5);
    expect(pruned).toBe(trail);
  });

  it('removes entries before checkpoint', () => {
    const trail = buildChain(5);
    const checkpointed = createCheckpoint(trail, 2).trail;
    const pruned = pruneBeforeCheckpoint(checkpointed);
    expect(pruned.entries).toHaveLength(2); // entries at index 3 and 4
    expect(pruned.genesis_hash).toBe(trail.entries[2].entry_hash);
    expect(pruned.checkpoint_hash).toBeUndefined();
    expect(pruned.checkpoint_index).toBeUndefined();
  });

  it('preserves hash chain integrity after pruning', () => {
    const trail = buildChain(5);
    const checkpointed = createCheckpoint(trail, 2).trail;
    const pruned = pruneBeforeCheckpoint(checkpointed);
    const result = verifyAuditTrailIntegrity(pruned);
    expect(result.valid).toBe(true);
  });

  it('round-trip: checkpoint → prune → verify', () => {
    const trail = buildChain(10);
    const checkpointed = createCheckpoint(trail, 4).trail;
    const pruned = pruneBeforeCheckpoint(checkpointed);
    expect(pruned.entries).toHaveLength(5);
    expect(verifyAuditTrailIntegrity(pruned).valid).toBe(true);
  });

  it('returns empty entries when checkpoint is at last entry', () => {
    const trail = buildChain(3);
    const checkpointed = createCheckpoint(trail).trail;
    const pruned = pruneBeforeCheckpoint(checkpointed);
    expect(pruned.entries).toHaveLength(0);
    expect(pruned.genesis_hash).toBe(trail.entries[2].entry_hash);
  });
});
