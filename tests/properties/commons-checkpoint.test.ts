/**
 * Property-based tests for audit trail checkpoint round-trips.
 *
 * Uses fast-check to verify that checkpoint → prune → verify
 * round-trips correctly for arbitrary audit trails.
 *
 * @see Bridgebuilder Finding F8 — Checkpoint operational logic
 * @see Bridgebuilder Q5 — Environment enrichment (property tests)
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { AUDIT_TRAIL_GENESIS_HASH, type AuditTrail, type AuditEntry } from '../../src/commons/audit-trail.js';
import { buildDomainTag, computeAuditEntryHash, verifyAuditTrailIntegrity } from '../../src/commons/audit-trail-hash.js';
import { createCheckpoint, pruneBeforeCheckpoint, verifyCheckpointContinuity } from '../../src/commons/audit-trail-checkpoint.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = buildDomainTag('PropertyTest', '8.1.0');

const uuidArb = fc.uuid().map(v => v);

const dateTimeArb = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: new Date('2030-12-31T23:59:59Z').getTime(),
}).map((ms) => new Date(ms).toISOString());

const eventTypeArb = fc.constantFrom(
  'commons.resource.created',
  'commons.transition.executed',
  'commons.resource.updated',
);

function buildChainFromInputs(inputs: [string, string, string][]): AuditTrail {
  const entries: AuditEntry[] = [];
  let prevHash = GENESIS;
  for (const [id, ts, evt] of inputs) {
    const input = { entry_id: id, timestamp: ts, event_type: evt };
    const entryHash = computeAuditEntryHash(input, DOMAIN_TAG);
    entries.push({
      ...input,
      entry_hash: entryHash,
      previous_hash: prevHash,
      hash_domain_tag: DOMAIN_TAG,
    });
    prevHash = entryHash;
  }
  return {
    entries,
    hash_algorithm: 'sha256',
    genesis_hash: GENESIS,
    integrity_status: 'unverified',
  };
}

describe('Checkpoint properties', () => {
  it('checkpoint → prune → verify round-trips for any valid chain', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(uuidArb, dateTimeArb, eventTypeArb), { minLength: 2, maxLength: 15 }),
        fc.nat(),
        (inputs, checkpointSeed) => {
          const trail = buildChainFromInputs(inputs);

          // Pick a valid checkpoint index
          const checkpointIndex = checkpointSeed % trail.entries.length;

          // Create checkpoint
          const cpResult = createCheckpoint(trail, checkpointIndex);
          if (!cpResult.success) return false;

          // Verify checkpoint continuity before pruning
          const continuity = verifyCheckpointContinuity(cpResult.trail);
          if (!continuity.valid) return false;

          // Prune before checkpoint
          const pruned = pruneBeforeCheckpoint(cpResult.trail);

          // Verify pruned trail integrity
          const integrity = verifyAuditTrailIntegrity(pruned);
          if (!integrity.valid) return false;

          // Pruned trail should have entries after checkpoint
          const expectedLength = trail.entries.length - checkpointIndex - 1;
          return pruned.entries.length === expectedLength;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('checkpoint at last entry → prune produces empty entries', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(uuidArb, dateTimeArb, eventTypeArb), { minLength: 1, maxLength: 10 }),
        (inputs) => {
          const trail = buildChainFromInputs(inputs);
          const cp = createCheckpoint(trail); // Default: last entry
          if (!cp.success) return false;

          const pruned = pruneBeforeCheckpoint(cp.trail);
          return pruned.entries.length === 0;
        },
      ),
      { numRuns: 30 },
    );
  });

  it('checkpoint at index 0 preserves all-but-first entries', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(uuidArb, dateTimeArb, eventTypeArb), { minLength: 2, maxLength: 10 }),
        (inputs) => {
          const trail = buildChainFromInputs(inputs);
          const cp = createCheckpoint(trail, 0);
          if (!cp.success) return false;

          const pruned = pruneBeforeCheckpoint(cp.trail);
          return pruned.entries.length === trail.entries.length - 1
            && verifyAuditTrailIntegrity(pruned).valid;
        },
      ),
      { numRuns: 30 },
    );
  });
});
