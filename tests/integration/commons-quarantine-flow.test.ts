/**
 * Integration test: quarantine end-to-end flow.
 *
 * Tests: detect discontinuity → create quarantine → investigate → resolve.
 *
 * @see SDD §4.8 — Hash Chain Operational Response
 * @see ADR-006 — Hash Chain Operational Response
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  AUDIT_TRAIL_GENESIS_HASH,
  AuditTrailSchema,
  type AuditTrail,
  type AuditEntry,
} from '../../src/commons/audit-trail.js';
import {
  buildDomainTag,
  computeAuditEntryHash,
  verifyAuditTrailIntegrity,
} from '../../src/commons/audit-trail-hash.js';
import {
  HashChainDiscontinuitySchema,
  type HashChainDiscontinuity,
} from '../../src/commons/hash-chain-discontinuity.js';
import {
  QuarantineRecordSchema,
  type QuarantineRecord,
} from '../../src/commons/quarantine.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = buildDomainTag('GovernedCredits', '8.0.0');

describe('Quarantine flow: detect → record → resolve', () => {
  // Build a valid 3-entry trail, then tamper with entry 2
  function buildTamperedTrail(): {
    trail: AuditTrail;
    goodEntries: AuditEntry[];
  } {
    const e1Input = {
      entry_id: '550e8400-e29b-41d4-a716-446655440001',
      timestamp: '2026-02-25T10:00:00Z',
      event_type: 'commons.resource.created',
    };
    const e1Hash = computeAuditEntryHash(e1Input, DOMAIN_TAG);
    const e1: AuditEntry = {
      ...e1Input,
      entry_hash: e1Hash,
      previous_hash: GENESIS,
      hash_domain_tag: DOMAIN_TAG,
    };

    const e2Input = {
      entry_id: '550e8400-e29b-41d4-a716-446655440002',
      timestamp: '2026-02-25T10:01:00Z',
      event_type: 'commons.transition.executed',
      payload: { amount: '50000' },
    };
    const e2Hash = computeAuditEntryHash(e2Input, DOMAIN_TAG);
    const e2: AuditEntry = {
      ...e2Input,
      entry_hash: e2Hash,
      previous_hash: e1Hash,
      hash_domain_tag: DOMAIN_TAG,
    };

    const e3Input = {
      entry_id: '550e8400-e29b-41d4-a716-446655440003',
      timestamp: '2026-02-25T10:02:00Z',
      event_type: 'commons.resource.updated',
    };
    const e3Hash = computeAuditEntryHash(e3Input, DOMAIN_TAG);
    const e3: AuditEntry = {
      ...e3Input,
      entry_hash: e3Hash,
      previous_hash: e2Hash,
      hash_domain_tag: DOMAIN_TAG,
    };

    // Tamper with e2's payload (content tampering)
    const tamperedE2 = { ...e2, payload: { amount: '99999' } };

    return {
      trail: {
        entries: [e1, tamperedE2, e3],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      },
      goodEntries: [e1, e2, e3],
    };
  }

  it('step 1: verification detects content tampering at entry 1', () => {
    const { trail } = buildTamperedTrail();
    const result = verifyAuditTrailIntegrity(trail);

    expect(result.valid).toBe(false);
    expect(result.failure_phase).toBe('content');
    expect(result.failure_index).toBe(1);
  });

  it('step 2: create HashChainDiscontinuity event', () => {
    const { trail } = buildTamperedTrail();
    const result = verifyAuditTrailIntegrity(trail);

    const discontinuity: HashChainDiscontinuity = {
      discontinuity_id: '550e8400-e29b-41d4-a716-446655440010',
      resource_type: 'GovernedCredits',
      resource_id: 'lot-001',
      detected_at: '2026-02-25T10:05:00Z',
      entry_index: result.failure_index!,
      expected_hash: result.expected_hash!,
      actual_hash: result.actual_hash!,
      last_known_good_index: result.failure_index! - 1,
      affected_entries: trail.entries.length - result.failure_index!,
      detector: 'integrity-check-service',
      failure_phase: result.failure_phase!,
    };

    expect(Value.Check(HashChainDiscontinuitySchema, discontinuity)).toBe(true);

    // Verify constraint: last_known_good_index < entry_index
    expect(evaluateConstraint(
      {
        last_known_good_index: discontinuity.last_known_good_index,
        entry_index: discontinuity.entry_index,
      },
      'last_known_good_index < entry_index',
    )).toBe(true);
  });

  it('step 3: create active QuarantineRecord', () => {
    const { trail } = buildTamperedTrail();
    const result = verifyAuditTrailIntegrity(trail);

    const record: QuarantineRecord = {
      quarantine_id: '550e8400-e29b-41d4-a716-446655440020',
      discontinuity_id: '550e8400-e29b-41d4-a716-446655440010',
      resource_type: 'GovernedCredits',
      resource_id: 'lot-001',
      status: 'active',
      quarantined_at: '2026-02-25T10:05:00Z',
      first_affected_index: result.failure_index!,
      last_affected_index: trail.entries.length - 1,
    };

    expect(Value.Check(QuarantineRecordSchema, record)).toBe(true);

    // Verify constraint: first <= last
    expect(evaluateConstraint(
      {
        first_affected_index: record.first_affected_index,
        last_affected_index: record.last_affected_index,
      },
      'first_affected_index <= last_affected_index',
    )).toBe(true);
  });

  it('step 4: set audit trail to quarantined status', () => {
    const { trail } = buildTamperedTrail();
    const quarantinedTrail: AuditTrail = {
      ...trail,
      integrity_status: 'quarantined',
    };
    expect(Value.Check(AuditTrailSchema, quarantinedTrail)).toBe(true);
    expect(quarantinedTrail.integrity_status).toBe('quarantined');
  });

  it('step 5: reconcile — resolve quarantine record', () => {
    const reconciled: QuarantineRecord = {
      quarantine_id: '550e8400-e29b-41d4-a716-446655440020',
      discontinuity_id: '550e8400-e29b-41d4-a716-446655440010',
      resource_type: 'GovernedCredits',
      resource_id: 'lot-001',
      status: 'reconciled',
      quarantined_at: '2026-02-25T10:05:00Z',
      resolved_at: '2026-02-25T11:00:00Z',
      first_affected_index: 1,
      last_affected_index: 2,
      resolution_notes: 'Manual verification confirmed entries are valid. Tampering was a test.',
    };

    expect(Value.Check(QuarantineRecordSchema, reconciled)).toBe(true);
  });

  it('step 5b: dismiss — permanently reject quarantined entries', () => {
    const dismissed: QuarantineRecord = {
      quarantine_id: '550e8400-e29b-41d4-a716-446655440020',
      discontinuity_id: '550e8400-e29b-41d4-a716-446655440010',
      resource_type: 'GovernedCredits',
      resource_id: 'lot-001',
      status: 'dismissed',
      quarantined_at: '2026-02-25T10:05:00Z',
      resolved_at: '2026-02-25T11:00:00Z',
      first_affected_index: 1,
      last_affected_index: 2,
      resolution_notes: 'Entries confirmed corrupted. Rebuilding from last known good.',
    };

    expect(Value.Check(QuarantineRecordSchema, dismissed)).toBe(true);
  });

  it('step 6: quarantine constraint — resolved status requires timestamp', () => {
    const expression = "!(status == 'reconciled' && resolved_at == undefined) && !(status == 'dismissed' && resolved_at == undefined)";

    // Valid: reconciled with resolved_at
    expect(evaluateConstraint(
      { status: 'reconciled', resolved_at: '2026-02-25T11:00:00Z' },
      expression,
    )).toBe(true);

    // Invalid: reconciled without resolved_at
    expect(evaluateConstraint(
      { status: 'reconciled', resolved_at: undefined },
      expression,
    )).toBe(false);

    // Valid: active without resolved_at
    expect(evaluateConstraint(
      { status: 'active', resolved_at: undefined },
      expression,
    )).toBe(true);
  });
});
