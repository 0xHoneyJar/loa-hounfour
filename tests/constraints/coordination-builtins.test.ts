/**
 * Tests for v7.0.0 coordination evaluator builtins:
 * saga_amount_conserved, saga_steps_sequential, outcome_consensus_valid.
 *
 * @see SDD §2.2-2.3 — Coordination schemas
 * @since v7.0.0 (Sprint 2)
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';
import { EVALUATOR_BUILTIN_SPECS } from '../../src/constraints/evaluator-spec.js';

// ---------------------------------------------------------------------------
// Builtin count (Sprint 2: 23 → 26)
// ---------------------------------------------------------------------------

describe('EVALUATOR_BUILTINS count (Sprint 2 — 3 new coordination builtins)', () => {
  it('EVALUATOR_BUILTINS contains 26 functions', () => {
    expect(EVALUATOR_BUILTINS).toHaveLength(26);
  });

  it('EVALUATOR_BUILTIN_SPECS has 26 entries', () => {
    expect(EVALUATOR_BUILTIN_SPECS.size).toBe(26);
  });

  it('new builtins are registered', () => {
    expect(EVALUATOR_BUILTINS).toContain('saga_amount_conserved');
    expect(EVALUATOR_BUILTINS).toContain('saga_steps_sequential');
    expect(EVALUATOR_BUILTINS).toContain('outcome_consensus_valid');
  });

  it('new builtins have specs', () => {
    expect(EVALUATOR_BUILTIN_SPECS.has('saga_amount_conserved')).toBe(true);
    expect(EVALUATOR_BUILTIN_SPECS.has('saga_steps_sequential')).toBe(true);
    expect(EVALUATOR_BUILTIN_SPECS.has('outcome_consensus_valid')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// saga_amount_conserved
// ---------------------------------------------------------------------------

describe('saga_amount_conserved', () => {
  it('balanced transfer steps return true', () => {
    const saga = {
      steps: [
        { step_id: 's1', step_type: 'transfer', status: 'completed', amount_micro: '1000' },
        { step_id: 's2', step_type: 'transfer', status: 'completed', amount_micro: '500' },
      ],
      compensation_steps: [],
    };
    expect(evaluateConstraint({ saga }, 'saga_amount_conserved(saga)')).toBe(true);
  });

  it('compensation steps restore balance', () => {
    const saga = {
      steps: [
        { step_id: 's1', step_type: 'transfer', status: 'completed', amount_micro: '1000' },
      ],
      compensation_steps: [
        { step_id: 'c1', step_type: 'transfer', status: 'completed', amount_micro: '1000' },
      ],
    };
    expect(evaluateConstraint({ saga }, 'saga_amount_conserved(saga)')).toBe(true);
  });

  it('empty saga is vacuously true', () => {
    const saga = { steps: [], compensation_steps: [] };
    expect(evaluateConstraint({ saga }, 'saga_amount_conserved(saga)')).toBe(true);
  });

  it('only counts completed steps', () => {
    const saga = {
      steps: [
        { step_id: 's1', step_type: 'transfer', status: 'completed', amount_micro: '1000' },
        { step_id: 's2', step_type: 'transfer', status: 'pending', amount_micro: '9999999' },
      ],
      compensation_steps: [],
    };
    expect(evaluateConstraint({ saga }, 'saga_amount_conserved(saga)')).toBe(true);
  });

  it('non-object saga returns false', () => {
    expect(evaluateConstraint({ saga: 'not-an-object' }, 'saga_amount_conserved(saga)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saga_steps_sequential
// ---------------------------------------------------------------------------

describe('saga_steps_sequential', () => {
  it('unique step IDs return true', () => {
    const saga = {
      steps: [
        { step_id: 's1' },
        { step_id: 's2' },
        { step_id: 's3' },
      ],
    };
    expect(evaluateConstraint({ saga }, 'saga_steps_sequential(saga)')).toBe(true);
  });

  it('duplicate step IDs return false', () => {
    const saga = {
      steps: [
        { step_id: 's1' },
        { step_id: 's2' },
        { step_id: 's1' },
      ],
    };
    expect(evaluateConstraint({ saga }, 'saga_steps_sequential(saga)')).toBe(false);
  });

  it('empty steps return true', () => {
    const saga = { steps: [] };
    expect(evaluateConstraint({ saga }, 'saga_steps_sequential(saga)')).toBe(true);
  });

  it('single step returns true', () => {
    const saga = { steps: [{ step_id: 's1' }] };
    expect(evaluateConstraint({ saga }, 'saga_steps_sequential(saga)')).toBe(true);
  });

  it('non-object saga returns false', () => {
    expect(evaluateConstraint({ saga: null }, 'saga_steps_sequential(saga)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// outcome_consensus_valid
// ---------------------------------------------------------------------------

describe('outcome_consensus_valid', () => {
  it('valid unanimous outcome', () => {
    const outcome = {
      outcome_type: 'unanimous',
      votes: [{ vote: 'agree' }, { vote: 'agree' }, { vote: 'agree' }],
      consensus_threshold: 1.0,
      consensus_achieved: true,
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(true);
  });

  it('invalid unanimous with disagree', () => {
    const outcome = {
      outcome_type: 'unanimous',
      votes: [{ vote: 'agree' }, { vote: 'disagree' }],
      consensus_threshold: 1.0,
      consensus_achieved: true,
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(false);
  });

  it('valid majority outcome', () => {
    const outcome = {
      outcome_type: 'majority',
      votes: [{ vote: 'agree' }, { vote: 'agree' }, { vote: 'disagree' }],
      consensus_threshold: 0.5,
      consensus_achieved: true,
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(true);
  });

  it('invalid majority — below threshold', () => {
    const outcome = {
      outcome_type: 'majority',
      votes: [{ vote: 'agree' }, { vote: 'disagree' }, { vote: 'disagree' }],
      consensus_threshold: 0.5,
      consensus_achieved: false,
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(false);
  });

  it('valid deadlock', () => {
    const outcome = {
      outcome_type: 'deadlock',
      votes: [{ vote: 'agree' }, { vote: 'disagree' }],
      consensus_threshold: 0.75,
      consensus_achieved: false,
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(true);
  });

  it('invalid deadlock — meets threshold', () => {
    const outcome = {
      outcome_type: 'deadlock',
      votes: [{ vote: 'agree' }, { vote: 'agree' }, { vote: 'agree' }],
      consensus_threshold: 0.5,
      consensus_achieved: false,
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(false);
  });

  it('valid escalation with escalated_to', () => {
    const outcome = {
      outcome_type: 'escalation',
      votes: [{ vote: 'disagree' }],
      consensus_threshold: 1.0,
      consensus_achieved: false,
      escalated_to: 'admin-agent',
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(true);
  });

  it('invalid escalation — missing escalated_to', () => {
    const outcome = {
      outcome_type: 'escalation',
      votes: [{ vote: 'disagree' }],
      consensus_threshold: 1.0,
      consensus_achieved: false,
    };
    expect(evaluateConstraint({ outcome }, 'outcome_consensus_valid(outcome)')).toBe(false);
  });

  it('non-object outcome returns false', () => {
    expect(evaluateConstraint({ outcome: 'bad' }, 'outcome_consensus_valid(outcome)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Spec examples cross-check (all 26 builtins)
// ---------------------------------------------------------------------------

describe('All 26 builtin spec examples evaluate correctly', () => {
  it('every spec example matches expected result', () => {
    for (const [name, spec] of EVALUATOR_BUILTIN_SPECS) {
      for (const example of spec.examples) {
        const result = evaluateConstraint(example.context, example.expression);
        expect(result, `${name}: ${example.description}`).toBe(example.expected);
      }
    }
  });
});
