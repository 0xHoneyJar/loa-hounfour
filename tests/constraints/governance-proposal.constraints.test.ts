/**
 * Round-trip tests for GovernanceProposal constraint expressions (Sprint 3).
 *
 * Verifies every expression in GovernanceProposal.constraints.json evaluates
 * correctly against valid and invalid context data.
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('GovernanceProposal constraint expressions', () => {
  describe('proposal-has-changes', () => {
    it('passes when changes array has items', () => {
      expect(evaluateConstraint(
        { changes: [{ change_type: 'parameter_update', target: 'x', justification: 'y' }] },
        'changes.length > 0',
      )).toBe(true);
    });

    it('fails when changes array is empty', () => {
      expect(evaluateConstraint(
        { changes: [] },
        'changes.length > 0',
      )).toBe(false);
    });
  });

  describe('proposal-ratified-has-timestamp', () => {
    it('passes when status is ratified and ratified_at is set', () => {
      expect(evaluateConstraint(
        { status: 'ratified', ratified_at: '2026-01-15T00:00:00Z' },
        "status != 'ratified' || ratified_at != null",
      )).toBe(true);
    });

    it('passes when status is not ratified (implication vacuously true)', () => {
      expect(evaluateConstraint(
        { status: 'proposed', ratified_at: null },
        "status != 'ratified' || ratified_at != null",
      )).toBe(true);
    });

    it('fails when status is ratified but ratified_at is null', () => {
      expect(evaluateConstraint(
        { status: 'ratified', ratified_at: null },
        "status != 'ratified' || ratified_at != null",
      )).toBe(false);
    });
  });

  describe('proposal-voting-has-quorum', () => {
    it('passes when quorum_required > 0', () => {
      expect(evaluateConstraint(
        { voting: { quorum_required: 0.5 } },
        'voting.quorum_required > 0',
      )).toBe(true);
    });

    it('fails when quorum_required is 0', () => {
      expect(evaluateConstraint(
        { voting: { quorum_required: 0 } },
        'voting.quorum_required > 0',
      )).toBe(false);
    });
  });

  describe('proposal-changes-have-justification', () => {
    it('passes when all changes have non-empty justification', () => {
      expect(evaluateConstraint(
        { changes: [
          { justification: 'Reason A' },
          { justification: 'Reason B' },
        ]},
        "changes.every(c => c.justification != '')",
      )).toBe(true);
    });

    it('fails when any change has empty justification', () => {
      expect(evaluateConstraint(
        { changes: [
          { justification: 'Reason A' },
          { justification: '' },
        ]},
        "changes.every(c => c.justification != '')",
      )).toBe(false);
    });
  });

  describe('proposal-proposer-non-empty', () => {
    it('passes when proposer_id is non-empty', () => {
      expect(evaluateConstraint(
        { proposer_id: 'agent-alpha' },
        "proposer_id != ''",
      )).toBe(true);
    });

    it('fails when proposer_id is empty', () => {
      expect(evaluateConstraint(
        { proposer_id: '' },
        "proposer_id != ''",
      )).toBe(false);
    });
  });
});
