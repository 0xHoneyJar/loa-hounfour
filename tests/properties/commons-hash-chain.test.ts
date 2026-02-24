/**
 * Property-based tests for hash chain properties.
 *
 * Uses fast-check to verify that the hash chain maintains invariants
 * across arbitrary sequences of audit entries.
 *
 * @see SDD §4.8 — Hash Chain Operational Response (FR-3)
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  buildDomainTag,
  computeAuditEntryHash,
  verifyAuditTrailIntegrity,
  type AuditEntryHashInput,
} from '../../src/commons/audit-trail-hash.js';
import {
  AUDIT_TRAIL_GENESIS_HASH,
  type AuditEntry,
  type AuditTrail,
} from '../../src/commons/audit-trail.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = buildDomainTag('Test', '8.0.0');

/** Generate a valid UUID v4 string. */
const uuidArb = fc.uuid().map((v) => v);

/** Generate a valid ISO 8601 date-time string. */
const dateTimeArb = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: new Date('2030-12-31T23:59:59Z').getTime(),
}).map((ms) => new Date(ms).toISOString());

/** Generate a valid event_type string. */
const eventTypeArb = fc.constantFrom(
  'commons.resource.created',
  'commons.transition.executed',
  'commons.resource.updated',
  'commons.resource.deleted',
  'commons.resource.quarantined',
  'commons.resource.restored',
  'commons.contract.negotiated',
  'commons.contract.expired',
);

/** Build a valid entry from random inputs. */
function buildEntry(
  entryId: string,
  timestamp: string,
  eventType: string,
  previousHash: string,
): AuditEntry {
  const input: AuditEntryHashInput = {
    entry_id: entryId,
    timestamp,
    event_type: eventType,
  };
  const entryHash = computeAuditEntryHash(input, DOMAIN_TAG);
  return {
    ...input,
    entry_hash: entryHash,
    previous_hash: previousHash,
    hash_domain_tag: DOMAIN_TAG,
  };
}

describe('Hash chain properties', () => {
  it('any correctly-built chain verifies', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(uuidArb, dateTimeArb, eventTypeArb), { minLength: 0, maxLength: 10 }),
        (inputs) => {
          const entries: AuditEntry[] = [];
          let prevHash = GENESIS;

          for (const [id, ts, evt] of inputs) {
            const entry = buildEntry(id, ts, evt, prevHash);
            entries.push(entry);
            prevHash = entry.entry_hash;
          }

          const trail: AuditTrail = {
            entries,
            hash_algorithm: 'sha256',
            genesis_hash: GENESIS,
            integrity_status: 'unverified',
          };

          return verifyAuditTrailIntegrity(trail).valid === true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('hash is deterministic — same inputs produce same hash', () => {
    fc.assert(
      fc.property(
        uuidArb,
        dateTimeArb,
        eventTypeArb,
        (id, ts, evt) => {
          const input: AuditEntryHashInput = {
            entry_id: id,
            timestamp: ts,
            event_type: evt,
          };
          const hash1 = computeAuditEntryHash(input, DOMAIN_TAG);
          const hash2 = computeAuditEntryHash(input, DOMAIN_TAG);
          return hash1 === hash2;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('different content produces different hashes', () => {
    fc.assert(
      fc.property(
        uuidArb,
        dateTimeArb,
        fc.tuple(eventTypeArb, eventTypeArb).filter(([a, b]) => a !== b),
        (id, ts, [evt1, evt2]) => {
          const hash1 = computeAuditEntryHash(
            { entry_id: id, timestamp: ts, event_type: evt1 },
            DOMAIN_TAG,
          );
          const hash2 = computeAuditEntryHash(
            { entry_id: id, timestamp: ts, event_type: evt2 },
            DOMAIN_TAG,
          );
          return hash1 !== hash2;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('domain separation — same content, different domain tags produce different hashes', () => {
    fc.assert(
      fc.property(
        uuidArb,
        dateTimeArb,
        eventTypeArb,
        (id, ts, evt) => {
          const input: AuditEntryHashInput = {
            entry_id: id,
            timestamp: ts,
            event_type: evt,
          };
          const hash1 = computeAuditEntryHash(input, 'loa-commons:audit:Schema1:8.0.0');
          const hash2 = computeAuditEntryHash(input, 'loa-commons:audit:Schema2:8.0.0');
          return hash1 !== hash2;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tampering at any position is detected', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(uuidArb, dateTimeArb, eventTypeArb), { minLength: 2, maxLength: 8 }),
        fc.nat(),
        (inputs, tamperSeed) => {
          // Build valid chain
          const entries: AuditEntry[] = [];
          let prevHash = GENESIS;
          for (const [id, ts, evt] of inputs) {
            const entry = buildEntry(id, ts, evt, prevHash);
            entries.push(entry);
            prevHash = entry.entry_hash;
          }

          // Tamper with one entry's event_type (ensure it differs from original)
          const tamperIndex = tamperSeed % entries.length;
          const original = entries[tamperIndex].event_type;
          const tamperValue = original === 'commons.TAMPERED' ? 'commons.TAMPERED.alt' : 'commons.TAMPERED';
          const tampered = [...entries];
          tampered[tamperIndex] = {
            ...tampered[tamperIndex],
            event_type: tamperValue,
          };

          const trail: AuditTrail = {
            entries: tampered,
            hash_algorithm: 'sha256',
            genesis_hash: GENESIS,
            integrity_status: 'unverified',
          };

          const result = verifyAuditTrailIntegrity(trail);
          return result.valid === false && result.failure_index === tamperIndex;
        },
      ),
      { numRuns: 50 },
    );
  });
});
