/**
 * Tests for the audit_trail_chain_valid evaluator builtin.
 *
 * Verifies structural chain linkage (previous_hash → entry_hash)
 * without recomputing content hashes.
 *
 * @see SDD §4.8 — Hash Chain Operational Response (FR-3)
 * @since v8.0.0
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import { AUDIT_TRAIL_GENESIS_HASH } from '../../src/commons/audit-trail.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const HASH_A = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const HASH_B = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const HASH_C = 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

describe('audit_trail_chain_valid builtin', () => {
  const expression = 'audit_trail_chain_valid(trail)';

  it('passes for empty trail', () => {
    const data = {
      trail: {
        entries: [],
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
        integrity_status: 'unverified',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(true);
  });

  it('passes for single-entry trail linked to genesis', () => {
    const data = {
      trail: {
        entries: [
          {
            entry_id: 'e1',
            timestamp: '2026-02-25T10:00:00Z',
            event_type: 'commons.resource.created',
            entry_hash: HASH_A,
            previous_hash: GENESIS,
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
        ],
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
        integrity_status: 'unverified',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(true);
  });

  it('passes for multi-entry chain with correct linkage', () => {
    const data = {
      trail: {
        entries: [
          {
            entry_id: 'e1',
            timestamp: '2026-02-25T10:00:00Z',
            event_type: 'commons.resource.created',
            entry_hash: HASH_A,
            previous_hash: GENESIS,
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
          {
            entry_id: 'e2',
            timestamp: '2026-02-25T10:01:00Z',
            event_type: 'commons.transition.executed',
            entry_hash: HASH_B,
            previous_hash: HASH_A,
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
          {
            entry_id: 'e3',
            timestamp: '2026-02-25T10:02:00Z',
            event_type: 'commons.resource.updated',
            entry_hash: HASH_C,
            previous_hash: HASH_B,
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
        ],
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
        integrity_status: 'unverified',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(true);
  });

  it('fails when first entry does not link to genesis', () => {
    const data = {
      trail: {
        entries: [
          {
            entry_id: 'e1',
            timestamp: '2026-02-25T10:00:00Z',
            event_type: 'commons.resource.created',
            entry_hash: HASH_A,
            previous_hash: HASH_B, // Wrong: should be GENESIS
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
        ],
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
        integrity_status: 'unverified',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(false);
  });

  it('fails when inter-entry linkage is broken', () => {
    const data = {
      trail: {
        entries: [
          {
            entry_id: 'e1',
            timestamp: '2026-02-25T10:00:00Z',
            event_type: 'commons.resource.created',
            entry_hash: HASH_A,
            previous_hash: GENESIS,
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
          {
            entry_id: 'e2',
            timestamp: '2026-02-25T10:01:00Z',
            event_type: 'commons.transition.executed',
            entry_hash: HASH_B,
            previous_hash: HASH_C, // Wrong: should be HASH_A
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
        ],
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
        integrity_status: 'unverified',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(false);
  });

  it('fails when trail has no entries field', () => {
    const data = {
      trail: {
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(false);
  });

  it('fails when genesis_hash is missing', () => {
    const data = {
      trail: {
        entries: [],
        hash_algorithm: 'sha256',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(false);
  });

  it('fails when entry missing previous_hash', () => {
    const data = {
      trail: {
        entries: [
          {
            entry_id: 'e1',
            timestamp: '2026-02-25T10:00:00Z',
            event_type: 'commons.resource.created',
            entry_hash: HASH_A,
            // missing previous_hash
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
        ],
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
        integrity_status: 'unverified',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(false);
  });

  it('fails when entry missing entry_hash', () => {
    const data = {
      trail: {
        entries: [
          {
            entry_id: 'e1',
            timestamp: '2026-02-25T10:00:00Z',
            event_type: 'commons.resource.created',
            // missing entry_hash
            previous_hash: GENESIS,
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
          {
            entry_id: 'e2',
            timestamp: '2026-02-25T10:01:00Z',
            event_type: 'commons.transition.executed',
            entry_hash: HASH_B,
            previous_hash: HASH_A, // Can't match because e1 has no entry_hash
            hash_domain_tag: 'loa-commons:audit:Test:8.0.0',
          },
        ],
        genesis_hash: GENESIS,
        hash_algorithm: 'sha256',
        integrity_status: 'unverified',
      },
    };
    expect(evaluateConstraint(data, expression)).toBe(false);
  });
});
