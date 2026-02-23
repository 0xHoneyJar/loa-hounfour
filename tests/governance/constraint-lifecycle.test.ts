/**
 * Tests for Constraint Lifecycle Governance schemas (v7.6.0, DR-S4).
 *
 * Validates the self-amending protocol:
 * - Constraint lifecycle status and transitions
 * - Constraint candidate with dry-run validation
 * - Constraint lifecycle events with proposal linkage
 * - Evaluator builtin for transition validation
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  ConstraintLifecycleStatusSchema,
  CONSTRAINT_LIFECYCLE_TRANSITIONS,
  ConstraintCandidateSchema,
  ConstraintLifecycleEventSchema,
  type ConstraintLifecycleStatus,
  type ConstraintCandidate,
  type ConstraintLifecycleEvent,
} from '../../src/governance/constraint-lifecycle.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// ---------------------------------------------------------------------------
// ConstraintLifecycleStatus
// ---------------------------------------------------------------------------

describe('ConstraintLifecycleStatusSchema', () => {
  const validStatuses: ConstraintLifecycleStatus[] = [
    'proposed', 'under_review', 'enacted', 'rejected', 'deprecated',
  ];

  for (const status of validStatuses) {
    it(`accepts "${status}"`, () => {
      expect(Value.Check(ConstraintLifecycleStatusSchema, status)).toBe(true);
    });
  }

  it('rejects unknown status', () => {
    expect(Value.Check(ConstraintLifecycleStatusSchema, 'active')).toBe(false);
    expect(Value.Check(ConstraintLifecycleStatusSchema, '')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CONSTRAINT_LIFECYCLE_TRANSITIONS
// ---------------------------------------------------------------------------

describe('CONSTRAINT_LIFECYCLE_TRANSITIONS', () => {
  it('proposed can transition to under_review or rejected', () => {
    expect(CONSTRAINT_LIFECYCLE_TRANSITIONS.proposed).toEqual(['under_review', 'rejected']);
  });

  it('under_review can transition to enacted or rejected', () => {
    expect(CONSTRAINT_LIFECYCLE_TRANSITIONS.under_review).toEqual(['enacted', 'rejected']);
  });

  it('enacted can only be deprecated', () => {
    expect(CONSTRAINT_LIFECYCLE_TRANSITIONS.enacted).toEqual(['deprecated']);
  });

  it('rejected is terminal', () => {
    expect(CONSTRAINT_LIFECYCLE_TRANSITIONS.rejected).toEqual([]);
  });

  it('deprecated is terminal', () => {
    expect(CONSTRAINT_LIFECYCLE_TRANSITIONS.deprecated).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ConstraintCandidate
// ---------------------------------------------------------------------------

describe('ConstraintCandidateSchema', () => {
  const validCandidate: ConstraintCandidate = {
    candidate_id: '550e8400-e29b-41d4-a716-446655440062',
    constraint_id: 'custom-balance-positive',
    schema_id: 'BillingEntry',
    expression: 'amount_micro > 0',
    severity: 'error',
    type_signature: { amount_micro: 'string' },
    fields: ['amount_micro'],
    description: 'Billing entry amount must be positive.',
  };

  it('accepts a valid candidate', () => {
    expect(Value.Check(ConstraintCandidateSchema, validCandidate)).toBe(true);
  });

  it('accepts candidate with dry_run_result', () => {
    expect(Value.Check(ConstraintCandidateSchema, {
      ...validCandidate,
      dry_run_result: { valid: true, errors: [] },
    })).toBe(true);
  });

  it('accepts candidate with failed dry_run', () => {
    expect(Value.Check(ConstraintCandidateSchema, {
      ...validCandidate,
      dry_run_result: { valid: false, errors: ['Unknown function: nonexistent()'] },
    })).toBe(true);
  });

  it('rejects empty expression', () => {
    expect(Value.Check(ConstraintCandidateSchema, {
      ...validCandidate,
      expression: '',
    })).toBe(false);
  });

  it('rejects empty fields array', () => {
    expect(Value.Check(ConstraintCandidateSchema, {
      ...validCandidate,
      fields: [],
    })).toBe(false);
  });

  it('rejects missing description', () => {
    const { description: _, ...without } = validCandidate;
    expect(Value.Check(ConstraintCandidateSchema, without)).toBe(false);
  });

  it('accepts all severity levels', () => {
    for (const severity of ['error', 'warning', 'info']) {
      expect(Value.Check(ConstraintCandidateSchema, {
        ...validCandidate,
        severity,
      })).toBe(true);
    }
  });

  it('rejects invalid severity', () => {
    expect(Value.Check(ConstraintCandidateSchema, {
      ...validCandidate,
      severity: 'critical',
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ConstraintLifecycleEvent
// ---------------------------------------------------------------------------

describe('ConstraintLifecycleEventSchema', () => {
  const validEvent: ConstraintLifecycleEvent = {
    event_id: '550e8400-e29b-41d4-a716-446655440060',
    constraint_id: 'custom-balance-check',
    proposal_id: '550e8400-e29b-41d4-a716-446655440061',
    from_status: 'proposed',
    to_status: 'under_review',
    occurred_at: '2026-02-15T10:00:00Z',
    contract_version: '7.6.0',
  };

  it('accepts a valid event', () => {
    expect(Value.Check(ConstraintLifecycleEventSchema, validEvent)).toBe(true);
  });

  it('accepts event with enacted_by', () => {
    expect(Value.Check(ConstraintLifecycleEventSchema, {
      ...validEvent,
      from_status: 'under_review',
      to_status: 'enacted',
      enacted_by: 'agent-governor',
    })).toBe(true);
  });

  it('rejects invalid uuid for event_id', () => {
    expect(Value.Check(ConstraintLifecycleEventSchema, {
      ...validEvent,
      event_id: 'not-a-uuid',
    })).toBe(false);
  });

  it('rejects empty constraint_id', () => {
    expect(Value.Check(ConstraintLifecycleEventSchema, {
      ...validEvent,
      constraint_id: '',
    })).toBe(false);
  });

  it('rejects invalid contract_version', () => {
    expect(Value.Check(ConstraintLifecycleEventSchema, {
      ...validEvent,
      contract_version: 'invalid',
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Evaluator builtin: constraint_lifecycle_valid
// ---------------------------------------------------------------------------

describe('Evaluator: constraint_lifecycle_valid', () => {
  const validTransitions: [string, string][] = [
    ['proposed', 'under_review'],
    ['proposed', 'rejected'],
    ['under_review', 'enacted'],
    ['under_review', 'rejected'],
    ['enacted', 'deprecated'],
  ];

  for (const [from, to] of validTransitions) {
    it(`${from} → ${to} is valid`, () => {
      expect(evaluateConstraint(
        { event: { from_status: from, to_status: to } },
        'constraint_lifecycle_valid(event)',
      )).toBe(true);
    });
  }

  const invalidTransitions: [string, string][] = [
    ['rejected', 'proposed'],
    ['deprecated', 'enacted'],
    ['enacted', 'proposed'],
    ['enacted', 'under_review'],
    ['proposed', 'enacted'], // skip under_review
    ['proposed', 'deprecated'],
    ['under_review', 'deprecated'], // must enact first
  ];

  for (const [from, to] of invalidTransitions) {
    it(`${from} → ${to} is invalid`, () => {
      expect(evaluateConstraint(
        { event: { from_status: from, to_status: to } },
        'constraint_lifecycle_valid(event)',
      )).toBe(false);
    });
  }

  it('same-status transition is invalid', () => {
    expect(evaluateConstraint(
      { event: { from_status: 'enacted', to_status: 'enacted' } },
      'constraint_lifecycle_valid(event)',
    )).toBe(false);
  });

  it('returns false for missing fields', () => {
    expect(evaluateConstraint(
      { event: { from_status: 'proposed' } },
      'constraint_lifecycle_valid(event)',
    )).toBe(false);
  });

  it('returns false for unknown statuses', () => {
    expect(evaluateConstraint(
      { event: { from_status: 'active', to_status: 'inactive' } },
      'constraint_lifecycle_valid(event)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration: GovernanceProposal → ConstraintLifecycle bridge
// ---------------------------------------------------------------------------

describe('Integration: governance proposal to constraint lifecycle', () => {
  it('constraint_addition proposal drives lifecycle event', () => {
    // A proposal to add a constraint produces a lifecycle event
    const event: ConstraintLifecycleEvent = {
      event_id: '550e8400-e29b-41d4-a716-446655440070',
      constraint_id: 'new-balance-check',
      proposal_id: '550e8400-e29b-41d4-a716-446655440071',
      from_status: 'under_review',
      to_status: 'enacted',
      enacted_by: 'governance-executor',
      occurred_at: '2026-02-20T14:00:00Z',
      contract_version: '7.6.0',
    };

    // Schema validates
    expect(Value.Check(ConstraintLifecycleEventSchema, event)).toBe(true);

    // Transition is valid
    expect(evaluateConstraint(
      { event },
      'constraint_lifecycle_valid(event)',
    )).toBe(true);
  });

  it('constraint_removal proposal drives deprecation', () => {
    const event: ConstraintLifecycleEvent = {
      event_id: '550e8400-e29b-41d4-a716-446655440072',
      constraint_id: 'old-balance-check',
      proposal_id: '550e8400-e29b-41d4-a716-446655440073',
      from_status: 'enacted',
      to_status: 'deprecated',
      occurred_at: '2026-02-21T10:00:00Z',
      contract_version: '7.6.0',
    };

    expect(Value.Check(ConstraintLifecycleEventSchema, event)).toBe(true);
    expect(evaluateConstraint(
      { event },
      'constraint_lifecycle_valid(event)',
    )).toBe(true);
  });
});
