/**
 * v7.0.0 Integration Tests — Cross-domain coordination scenarios.
 *
 * Exercises end-to-end flows across the coordination layer:
 * - Saga lifecycle validation
 * - Delegation outcome recording
 * - Monetary policy solvency
 * - Permission boundary evaluation
 * - Governance proposal lifecycle
 *
 * @see SDD §2 — v7.0.0 Coordination Layer
 * @since v7.0.0 (Sprint 4)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// Schemas
import { BridgeTransferSagaSchema, SAGA_TRANSITIONS, type SagaStatus } from '../../src/economy/bridge-transfer-saga.js';
import { DelegationOutcomeSchema } from '../../src/governance/delegation-outcome.js';
import { MonetaryPolicySchema } from '../../src/economy/monetary-policy.js';
import { PermissionBoundarySchema } from '../../src/governance/permission-boundary.js';
import { GovernanceProposalSchema, PROPOSAL_STATUS_TRANSITIONS, type ProposalStatus } from '../../src/governance/governance-proposal.js';

// Version
import { CONTRACT_VERSION } from '../../src/version.js';

// ---------------------------------------------------------------------------
// Cross-registry transfer via saga
// ---------------------------------------------------------------------------

describe('Integration: cross-registry transfer saga', () => {
  const saga = {
    saga_id: '550e8400-e29b-41d4-a716-446655440000',
    bridge_id: '550e8400-e29b-41d4-a716-446655440001',
    source_registry: '550e8400-e29b-41d4-a716-446655440002',
    target_registry: '550e8400-e29b-41d4-a716-446655440003',
    saga_type: 'atomic',
    status: 'initiated',
    steps: [
      { step_id: 'step-001', step_type: 'reserve', participant: 'agent-A', status: 'pending', amount_micro: '5000000', started_at: null, completed_at: null },
      { step_id: 'step-002', step_type: 'transfer', participant: 'agent-B', status: 'pending', amount_micro: '5000000', started_at: null, completed_at: null },
      { step_id: 'step-003', step_type: 'settle', participant: 'agent-A', status: 'pending', amount_micro: '5000000', started_at: null, completed_at: null },
    ],
    compensation_steps: [],
    timeout: { total_seconds: 300, per_step_seconds: 60 },
    participants: [
      { agent_id: 'agent-A', role: 'initiator', registry_id: '550e8400-e29b-41d4-a716-446655440002', trust_scopes: { scopes: { billing: 'trusted' }, default_level: 'verified' } },
      { agent_id: 'agent-B', role: 'counterparty', registry_id: '550e8400-e29b-41d4-a716-446655440003', trust_scopes: { scopes: { billing: 'verified' }, default_level: 'basic' } },
    ],
    initiated_at: '2026-01-15T10:00:00Z',
    settled_at: null,
    contract_version: '7.0.0',
  };

  it('validates saga schema', () => {
    expect(Value.Check(BridgeTransferSagaSchema, saga)).toBe(true);
  });

  it('validates saga amount conservation via evaluator', () => {
    // All steps transfer the same amount — conservation holds
    expect(evaluateConstraint(
      { saga },
      'saga_amount_conserved(saga)',
    )).toBe(true);
  });

  it('validates saga step sequencing via evaluator', () => {
    expect(evaluateConstraint(
      { saga },
      'saga_steps_sequential(saga)',
    )).toBe(true);
  });

  it('state machine follows valid transitions', () => {
    let current: SagaStatus = 'initiated';
    const path: SagaStatus[] = ['reserving', 'transferring', 'settling', 'settled'];
    for (const next of path) {
      expect(SAGA_TRANSITIONS[current], `${current} → ${next}`).toContain(next);
      current = next;
    }
    // Terminal state
    expect(SAGA_TRANSITIONS[current]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Delegation decision with dissent
// ---------------------------------------------------------------------------

describe('Integration: delegation outcome with dissent', () => {
  const outcome = {
    outcome_id: '550e8400-e29b-41d4-a716-446655440010',
    tree_node_id: 'node-root',
    outcome_type: 'majority',
    result: { decision: 'increase_ceiling' },
    votes: [
      { voter_id: 'agent-alpha', vote: 'agree', result: { decision: 'increase_ceiling' }, confidence: 0.9, reasoning: 'Aligned with strategy' },
      { voter_id: 'agent-beta', vote: 'agree', result: { decision: 'increase_ceiling' }, confidence: 0.7 },
      { voter_id: 'agent-gamma', vote: 'disagree', result: { decision: 'maintain_ceiling' }, confidence: 0.8, reasoning: 'Risk too high' },
    ],
    consensus_achieved: true,
    consensus_threshold: 0.6,
    dissent_records: [{
      dissenter_id: 'agent-gamma',
      dissent_type: 'minority_report',
      proposed_alternative: { decision: 'maintain_ceiling' },
      severity: 'warning',
      reasoning: 'The proposed change increases systemic risk without adequate safeguards.',
      acknowledged: false,
    }],
    resolved_at: '2026-01-15T12:00:00Z',
    contract_version: '7.0.0',
  };

  it('validates outcome schema', () => {
    expect(Value.Check(DelegationOutcomeSchema, outcome)).toBe(true);
  });

  it('validates consensus via evaluator', () => {
    expect(evaluateConstraint(
      { outcome },
      'outcome_consensus_valid(outcome)',
    )).toBe(true);
  });

  it('preserves dissent records for audit', () => {
    expect(outcome.dissent_records).toHaveLength(1);
    expect(outcome.dissent_records[0].dissenter_id).toBe('agent-gamma');
    expect(outcome.dissent_records[0].severity).toBe('warning');
    expect(outcome.dissent_records[0].dissent_type).toBe('minority_report');
  });
});

// ---------------------------------------------------------------------------
// Monetary policy solvency check
// ---------------------------------------------------------------------------

describe('Integration: monetary policy solvency', () => {
  const policy = {
    policy_id: '550e8400-e29b-41d4-a716-446655440020',
    registry_id: '550e8400-e29b-41d4-a716-446655440021',
    minting_policy_id: 'mp-treasury',
    conservation_ceiling: '100000000000',
    coupling_invariant: 'bigint_gte(collateral, bigint_sub(conservation_ceiling, current_supply))',
    collateral_ratio_bps: 15000,
    review_trigger: { trigger_type: 'epoch_boundary', epoch_interval: 30 },
    last_reviewed_at: '2026-01-01T00:00:00Z',
    contract_version: '7.0.0',
  };

  it('validates monetary policy schema', () => {
    expect(Value.Check(MonetaryPolicySchema, policy)).toBe(true);
  });

  it('monetary_policy_solvent passes for supply within ceiling', () => {
    expect(evaluateConstraint(
      { policy, supply: '50000000000' },
      'monetary_policy_solvent(policy, supply)',
    )).toBe(true);
  });

  it('monetary_policy_solvent fails for supply exceeding ceiling', () => {
    expect(evaluateConstraint(
      { policy, supply: '150000000000' },
      'monetary_policy_solvent(policy, supply)',
    )).toBe(false);
  });

  it('constraint expressions validate correctly', () => {
    // ceiling must be positive
    expect(evaluateConstraint(
      { conservation_ceiling: policy.conservation_ceiling },
      'bigint_gt(conservation_ceiling, 0)',
    )).toBe(true);

    // collateral ratio >= 100%
    expect(evaluateConstraint(
      { collateral_ratio_bps: policy.collateral_ratio_bps },
      'collateral_ratio_bps >= 10000',
    )).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Permission boundary evaluation
// ---------------------------------------------------------------------------

describe('Integration: permission boundary evaluation', () => {
  const boundary = {
    boundary_id: '550e8400-e29b-41d4-a716-446655440030',
    scope: 'billing',
    permitted_if: "trust_scopes.scopes.billing == 'verified' || trust_scopes.scopes.billing == 'trusted'",
    reporting: { required: true, report_to: 'audit-agent', frequency: 'per_action', format: 'audit_trail' },
    revocation: { trigger: 'violation_count', violation_threshold: 3 },
    severity: 'advisory',
    contract_version: '7.0.0',
  };

  it('validates permission boundary schema', () => {
    expect(Value.Check(PermissionBoundarySchema, boundary)).toBe(true);
  });

  it('permission_boundary_active validates complete boundary', () => {
    expect(evaluateConstraint(
      { boundary },
      'permission_boundary_active(boundary)',
    )).toBe(true);
  });

  it('constraint expressions validate structural integrity', () => {
    expect(evaluateConstraint(
      { reporting: boundary.reporting },
      'reporting != null',
    )).toBe(true);

    expect(evaluateConstraint(
      { revocation: boundary.revocation },
      'revocation != null',
    )).toBe(true);

    expect(evaluateConstraint(
      { scope: boundary.scope },
      "scope != ''",
    )).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Governance proposal lifecycle
// ---------------------------------------------------------------------------

describe('Integration: governance proposal lifecycle', () => {
  const proposal = {
    proposal_id: '550e8400-e29b-41d4-a716-446655440040',
    registry_id: '550e8400-e29b-41d4-a716-446655440041',
    proposer_id: 'agent-alpha',
    title: 'Increase conservation ceiling',
    description: 'Raise ceiling from 100B to 150B micro-units to accommodate growth.',
    changes: [{
      change_type: 'parameter_update',
      target: 'MonetaryPolicy.conservation_ceiling',
      current_value: '100000000000',
      proposed_value: '150000000000',
      justification: 'Registry growth requires higher ceiling.',
    }],
    status: 'ratified',
    voting: {
      quorum_required: 0.5,
      votes_cast: [
        { voter_id: 'agent-alpha', vote: 'approve', weight: 0.3, reasoning: 'Growth is necessary' },
        { voter_id: 'agent-beta', vote: 'approve', weight: 0.4 },
        { voter_id: 'agent-gamma', vote: 'reject', weight: 0.3, reasoning: 'Risk too high' },
      ],
      voting_opened_at: '2026-01-10T00:00:00Z',
      voting_closed_at: '2026-01-15T00:00:00Z',
    },
    ratified_at: '2026-01-15T00:00:00Z',
    contract_version: '7.0.0',
  };

  it('validates governance proposal schema', () => {
    expect(Value.Check(GovernanceProposalSchema, proposal)).toBe(true);
  });

  it('proposal_quorum_met validates quorum', () => {
    // Total weight: 0.3 + 0.4 + 0.3 = 1.0 >= 0.5
    expect(evaluateConstraint(
      { proposal },
      'proposal_quorum_met(proposal)',
    )).toBe(true);
  });

  it('state machine follows valid transitions', () => {
    let current: ProposalStatus = 'proposed';
    const path: ProposalStatus[] = ['voting', 'ratified'];
    for (const next of path) {
      expect(PROPOSAL_STATUS_TRANSITIONS[current], `${current} → ${next}`).toContain(next);
      current = next;
    }
    // Terminal state
    expect(PROPOSAL_STATUS_TRANSITIONS[current]).toEqual([]);
  });

  it('constraint expressions validate structural requirements', () => {
    expect(evaluateConstraint(
      { changes: proposal.changes },
      'changes.length > 0',
    )).toBe(true);

    expect(evaluateConstraint(
      { status: proposal.status, ratified_at: proposal.ratified_at },
      "status != 'ratified' || ratified_at != null",
    )).toBe(true);

    expect(evaluateConstraint(
      { voting: proposal.voting },
      'voting.quorum_required > 0',
    )).toBe(true);

    expect(evaluateConstraint(
      { changes: proposal.changes },
      "changes.every(c => c.justification != '')",
    )).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Version consistency
// ---------------------------------------------------------------------------

describe('contract version', () => {
  it('CONTRACT_VERSION matches current version', () => {
    expect(CONTRACT_VERSION).toBe('7.8.0');
  });
});
