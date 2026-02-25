/**
 * Integration test: full mutation lifecycle.
 *
 * Tests the complete path: GovernanceMutation envelope → invariant check →
 * state transition → audit trail append → hash chain verification.
 *
 * @see SDD §4 — Commons Protocol
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  GovernanceMutationSchema,
  type GovernanceMutation,
} from '../../src/commons/governed-resource.js';
import {
  GovernedCreditsSchema,
  type GovernedCredits,
} from '../../src/commons/governed-credits.js';
import {
  AUDIT_TRAIL_GENESIS_HASH,
  type AuditTrail,
  type AuditEntry,
} from '../../src/commons/audit-trail.js';
import {
  buildDomainTag,
  computeAuditEntryHash,
  verifyAuditTrailIntegrity,
} from '../../src/commons/audit-trail-hash.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = buildDomainTag('GovernedCredits', '8.0.0');

describe('Mutation lifecycle: credits lot debit', () => {
  // Step 1: Create a valid governed credits lot
  const lot: GovernedCredits = {
    lot_id: '550e8400-e29b-41d4-a716-446655440000',
    balance: '700000',
    original_allocation: '1000000',
    reserved: '100000',
    consumed: '200000',
    currency: 'micro-usd',
    conservation_law: {
      invariants: [
        {
          invariant_id: 'CL-01',
          name: 'Lot conservation',
          expression: 'bigint_eq(bigint_sum([balance, reserved, consumed]), original_allocation)',
          severity: 'error',
        },
      ],
      enforcement: 'strict',
      scope: 'per-entry',
    },
    audit_trail: {
      entries: [],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    },
    state_machine: {
      states: [{ name: 'active' }, { name: 'depleted' }],
      transitions: [{ from: 'active', to: 'depleted' }],
      initial_state: 'active',
      terminal_states: ['depleted'],
    },
    governance_class: 'protocol-fixed',
    version: 0,
    contract_version: '8.0.0',
  };

  it('step 1: initial lot validates against schema', () => {
    expect(Value.Check(GovernedCreditsSchema, lot)).toBe(true);
  });

  it('step 2: conservation law holds for initial state', () => {
    const result = evaluateConstraint(
      {
        balance: lot.balance,
        reserved: lot.reserved,
        consumed: lot.consumed,
        original_allocation: lot.original_allocation,
      },
      lot.conservation_law.invariants[0].expression,
    );
    expect(result).toBe(true);
  });

  it('step 3: mutation envelope validates', () => {
    const mutation: GovernanceMutation = {
      mutation_id: '550e8400-e29b-41d4-a716-446655440001',
      expected_version: 0,
      mutated_at: '2026-02-25T10:00:00Z',
      actor_id: 'billing-service',
    };
    expect(Value.Check(GovernanceMutationSchema, mutation)).toBe(true);
  });

  it('step 4: audit entry hash chain works end-to-end', () => {
    // Create an audit entry for the mutation
    const entryInput = {
      entry_id: '550e8400-e29b-41d4-a716-446655440002',
      timestamp: '2026-02-25T10:00:00Z',
      event_type: 'commons.transition.executed',
      actor_id: 'billing-service',
      payload: { amount: '50000', from_field: 'balance', to_field: 'consumed' },
    };

    const entryHash = computeAuditEntryHash(entryInput, DOMAIN_TAG);
    expect(entryHash).toMatch(/^sha256:[a-f0-9]{64}$/);

    const entry: AuditEntry = {
      ...entryInput,
      entry_hash: entryHash,
      previous_hash: GENESIS,
      hash_domain_tag: DOMAIN_TAG,
    };

    const trail: AuditTrail = {
      entries: [entry],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    };

    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(true);
  });

  it('step 5: conservation law holds after valid debit', () => {
    // Debit 50000 from balance to consumed: 700000→650000, 200000→250000
    const result = evaluateConstraint(
      {
        balance: '650000',
        reserved: '100000',
        consumed: '250000',
        original_allocation: '1000000',
      },
      lot.conservation_law.invariants[0].expression,
    );
    expect(result).toBe(true);
  });

  it('step 5b: conservation law detects violation', () => {
    // Invalid: balance shrinks but consumed doesn't grow proportionally
    const result = evaluateConstraint(
      {
        balance: '650000',
        reserved: '100000',
        consumed: '200000', // Should be 250000
        original_allocation: '1000000',
      },
      lot.conservation_law.invariants[0].expression,
    );
    expect(result).toBe(false);
  });

  it('step 6: multi-entry chain maintains integrity', () => {
    const e1Input = {
      entry_id: '550e8400-e29b-41d4-a716-446655440010',
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
      entry_id: '550e8400-e29b-41d4-a716-446655440011',
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

    const trail: AuditTrail = {
      entries: [e1, e2],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    };

    expect(verifyAuditTrailIntegrity(trail).valid).toBe(true);
  });
});
