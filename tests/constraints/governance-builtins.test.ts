/**
 * Tests for governance evaluator builtins (Sprint 3 — S3-T2, S3-T4, S3-T6).
 *
 * Covers: monetary_policy_solvent, permission_boundary_active, proposal_quorum_met
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';
import { EVALUATOR_BUILTIN_SPECS } from '../../src/constraints/evaluator-spec.js';

// ---------------------------------------------------------------------------
// monetary_policy_solvent
// ---------------------------------------------------------------------------

describe('monetary_policy_solvent', () => {
  it('returns true when supply is within ceiling', () => {
    const policy = { conservation_ceiling: '1000000' };
    expect(evaluateConstraint(
      { policy, supply: '500000' },
      'monetary_policy_solvent(policy, supply)',
    )).toBe(true);
  });

  it('returns false when supply exceeds ceiling', () => {
    const policy = { conservation_ceiling: '1000000' };
    expect(evaluateConstraint(
      { policy, supply: '1500000' },
      'monetary_policy_solvent(policy, supply)',
    )).toBe(false);
  });

  it('returns true when supply equals ceiling', () => {
    const policy = { conservation_ceiling: '1000000' };
    expect(evaluateConstraint(
      { policy, supply: '1000000' },
      'monetary_policy_solvent(policy, supply)',
    )).toBe(true);
  });

  it('handles zero supply (solvent)', () => {
    const policy = { conservation_ceiling: '1000000' };
    expect(evaluateConstraint(
      { policy, supply: '0' },
      'monetary_policy_solvent(policy, supply)',
    )).toBe(true);
  });

  it('returns false for null policy', () => {
    expect(evaluateConstraint(
      { policy: null, supply: '500000' },
      'monetary_policy_solvent(policy, supply)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// permission_boundary_active
// ---------------------------------------------------------------------------

describe('permission_boundary_active', () => {
  it('returns true for complete boundary', () => {
    const boundary = {
      scope: 'billing',
      permitted_if: "trust_scopes.scopes.billing == 'verified'",
      reporting: { required: true, report_to: 'audit-agent' },
      revocation: { trigger: 'manual' },
    };
    expect(evaluateConstraint(
      { boundary },
      'permission_boundary_active(boundary)',
    )).toBe(true);
  });

  it('returns false when scope is missing', () => {
    const boundary = {
      permitted_if: 'true',
      reporting: { required: true },
      revocation: { trigger: 'manual' },
    };
    expect(evaluateConstraint(
      { boundary },
      'permission_boundary_active(boundary)',
    )).toBe(false);
  });

  it('returns false when reporting is missing', () => {
    const boundary = {
      scope: 'billing',
      permitted_if: 'true',
      revocation: { trigger: 'manual' },
    };
    expect(evaluateConstraint(
      { boundary },
      'permission_boundary_active(boundary)',
    )).toBe(false);
  });

  it('returns false for null boundary', () => {
    expect(evaluateConstraint(
      { boundary: null },
      'permission_boundary_active(boundary)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// proposal_quorum_met
// ---------------------------------------------------------------------------

describe('proposal_quorum_met', () => {
  it('returns true when weighted votes meet quorum', () => {
    const proposal = {
      voting: {
        quorum_required: 0.5,
        votes_cast: [
          { voter_id: 'a', vote: 'approve', weight: 0.3 },
          { voter_id: 'b', vote: 'reject', weight: 0.3 },
        ],
      },
    };
    // total weight = 0.6 >= 0.5 ✓
    expect(evaluateConstraint(
      { proposal },
      'proposal_quorum_met(proposal)',
    )).toBe(true);
  });

  it('returns false when weighted votes are below quorum', () => {
    const proposal = {
      voting: {
        quorum_required: 0.8,
        votes_cast: [
          { voter_id: 'a', vote: 'approve', weight: 0.3 },
          { voter_id: 'b', vote: 'approve', weight: 0.2 },
        ],
      },
    };
    // total weight = 0.5 < 0.8
    expect(evaluateConstraint(
      { proposal },
      'proposal_quorum_met(proposal)',
    )).toBe(false);
  });

  it('returns true when quorum is exactly met', () => {
    const proposal = {
      voting: {
        quorum_required: 0.5,
        votes_cast: [
          { voter_id: 'a', vote: 'approve', weight: 0.5 },
        ],
      },
    };
    expect(evaluateConstraint(
      { proposal },
      'proposal_quorum_met(proposal)',
    )).toBe(true);
  });

  it('returns false for empty votes_cast', () => {
    const proposal = {
      voting: {
        quorum_required: 0.5,
        votes_cast: [],
      },
    };
    expect(evaluateConstraint(
      { proposal },
      'proposal_quorum_met(proposal)',
    )).toBe(false);
  });

  it('returns false for null proposal', () => {
    expect(evaluateConstraint(
      { proposal: null },
      'proposal_quorum_met(proposal)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// proposal_weights_normalized (Bridge iteration 2)
// ---------------------------------------------------------------------------

describe('proposal_weights_normalized', () => {
  it('returns true when weights sum to 1.0', () => {
    const proposal = {
      voting: {
        votes_cast: [
          { voter_id: 'a', weight: 0.3 },
          { voter_id: 'b', weight: 0.4 },
          { voter_id: 'c', weight: 0.3 },
        ],
      },
    };
    expect(evaluateConstraint(
      { proposal },
      'proposal_weights_normalized(proposal)',
    )).toBe(true);
  });

  it('returns false when weights do not sum to 1.0', () => {
    const proposal = {
      voting: {
        votes_cast: [
          { voter_id: 'a', weight: 0.5 },
          { voter_id: 'b', weight: 0.6 },
        ],
      },
    };
    expect(evaluateConstraint(
      { proposal },
      'proposal_weights_normalized(proposal)',
    )).toBe(false);
  });

  it('returns true for empty votes', () => {
    const proposal = {
      voting: {
        votes_cast: [],
      },
    };
    expect(evaluateConstraint(
      { proposal },
      'proposal_weights_normalized(proposal)',
    )).toBe(true);
  });

  it('returns false for null proposal', () => {
    expect(evaluateConstraint(
      { proposal: null },
      'proposal_weights_normalized(proposal)',
    )).toBe(false);
  });

  it('tolerates minor floating-point drift within 0.001', () => {
    const proposal = {
      voting: {
        votes_cast: [
          { voter_id: 'a', weight: 0.1 },
          { voter_id: 'b', weight: 0.2 },
          { voter_id: 'c', weight: 0.3 },
          { voter_id: 'd', weight: 0.4 },
        ],
      },
    };
    // 0.1 + 0.2 + 0.3 + 0.4 may not be exactly 1.0 in IEEE 754
    expect(evaluateConstraint(
      { proposal },
      'proposal_weights_normalized(proposal)',
    )).toBe(true);
  });

  it('returns false when weights are significantly off', () => {
    const proposal = {
      voting: {
        votes_cast: [
          { voter_id: 'a', weight: 0.3 },
          { voter_id: 'b', weight: 0.3 },
        ],
      },
    };
    // sum = 0.6 — way below 1.0
    expect(evaluateConstraint(
      { proposal },
      'proposal_weights_normalized(proposal)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Registry and specs
// ---------------------------------------------------------------------------

describe('All 39 builtins in registry (v7.7.0)', () => {
  it('EVALUATOR_BUILTINS contains 39 functions', () => {
    expect(EVALUATOR_BUILTINS).toHaveLength(39);
  });

  it('includes monetary_policy_solvent', () => {
    expect(EVALUATOR_BUILTINS).toContain('monetary_policy_solvent');
  });

  it('includes permission_boundary_active', () => {
    expect(EVALUATOR_BUILTINS).toContain('permission_boundary_active');
  });

  it('includes proposal_quorum_met', () => {
    expect(EVALUATOR_BUILTINS).toContain('proposal_quorum_met');
  });

  it('EVALUATOR_BUILTIN_SPECS has 39 entries', () => {
    expect(EVALUATOR_BUILTIN_SPECS.size).toBe(39);
  });

  it('spec examples execute correctly for monetary_policy_solvent', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('monetary_policy_solvent')!;
    for (const example of spec.examples) {
      expect(
        evaluateConstraint(example.context, example.expression),
        `Failed: ${example.description}`,
      ).toBe(example.expected);
    }
  });

  it('spec examples execute correctly for permission_boundary_active', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('permission_boundary_active')!;
    for (const example of spec.examples) {
      expect(
        evaluateConstraint(example.context, example.expression),
        `Failed: ${example.description}`,
      ).toBe(example.expected);
    }
  });

  it('spec examples execute correctly for proposal_quorum_met', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('proposal_quorum_met')!;
    for (const example of spec.examples) {
      expect(
        evaluateConstraint(example.context, example.expression),
        `Failed: ${example.description}`,
      ).toBe(example.expected);
    }
  });
});
