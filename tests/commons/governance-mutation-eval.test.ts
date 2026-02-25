/**
 * Tests for evaluateGovernanceMutation() utility.
 *
 * @see Bridgebuilder Finding F6 — Authorization at the mutation boundary
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import { evaluateGovernanceMutation } from '../../src/commons/governance-mutation-eval.js';
import type { GovernanceMutation } from '../../src/commons/governed-resource.js';
import type { AccessPolicy } from '../../src/schemas/conversation.js';

const baseMutation: GovernanceMutation = {
  mutation_id: '550e8400-e29b-41d4-a716-446655440000',
  expected_version: 0,
  mutated_at: '2026-02-25T10:00:00Z',
  actor_id: 'billing-service',
};

describe('evaluateGovernanceMutation', () => {
  describe('no access policy (open access)', () => {
    it('authorizes when no policy is provided', () => {
      const result = evaluateGovernanceMutation(baseMutation);
      expect(result.authorized).toBe(true);
      expect(result.actor_id).toBe('billing-service');
      expect(result.reason).toContain('No access policy');
    });

    it('authorizes with undefined policy', () => {
      const result = evaluateGovernanceMutation(baseMutation, undefined);
      expect(result.authorized).toBe(true);
    });
  });

  describe('role_based policy', () => {
    const rolePolicy: AccessPolicy = {
      type: 'role_based',
      roles: ['admin', 'billing-service'],
    };

    it('authorizes when actor role matches', () => {
      const result = evaluateGovernanceMutation(
        baseMutation,
        rolePolicy,
        { role: 'billing-service' },
      );
      expect(result.authorized).toBe(true);
      expect(result.policy_result).toBeDefined();
      expect(result.policy_result!.allowed).toBe(true);
    });

    it('denies when actor role does not match', () => {
      const result = evaluateGovernanceMutation(
        baseMutation,
        rolePolicy,
        { role: 'viewer' },
      );
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('billing-service');
      expect(result.reason).toContain('not in permitted roles');
    });

    it('denies when no role provided', () => {
      const result = evaluateGovernanceMutation(baseMutation, rolePolicy);
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('No role provided');
    });
  });

  describe('none policy', () => {
    const nonePolicy: AccessPolicy = { type: 'none' };

    it('denies all mutations', () => {
      const result = evaluateGovernanceMutation(
        baseMutation,
        nonePolicy,
        { role: 'admin' },
      );
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Access type is none');
    });
  });

  describe('read_only policy', () => {
    const readOnlyPolicy: AccessPolicy = { type: 'read_only' };

    it('denies write mutations (mutations are always write)', () => {
      const result = evaluateGovernanceMutation(baseMutation, readOnlyPolicy);
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('write');
      expect(result.reason).toContain('not permitted');
    });
  });

  describe('reputation_gated policy', () => {
    const repPolicy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_score: 0.7,
    };

    it('authorizes when reputation meets threshold', () => {
      const result = evaluateGovernanceMutation(
        baseMutation,
        repPolicy,
        { reputation_score: 0.85 },
      );
      expect(result.authorized).toBe(true);
    });

    it('denies when reputation below threshold', () => {
      const result = evaluateGovernanceMutation(
        baseMutation,
        repPolicy,
        { reputation_score: 0.3 },
      );
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('below minimum');
    });

    it('denies when no reputation context', () => {
      const result = evaluateGovernanceMutation(baseMutation, repPolicy);
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('No reputation context');
    });
  });

  describe('compound policy', () => {
    const compoundPolicy: AccessPolicy = {
      type: 'compound',
      operator: 'AND',
      policies: [
        { type: 'role_based', roles: ['admin'] },
        { type: 'reputation_gated', min_reputation_score: 0.5 },
      ],
    };

    it('authorizes when all sub-policies pass', () => {
      const result = evaluateGovernanceMutation(
        baseMutation,
        compoundPolicy,
        { role: 'admin', reputation_score: 0.8 },
      );
      expect(result.authorized).toBe(true);
    });

    it('denies when one sub-policy fails', () => {
      const result = evaluateGovernanceMutation(
        baseMutation,
        compoundPolicy,
        { role: 'viewer', reputation_score: 0.8 },
      );
      expect(result.authorized).toBe(false);
    });
  });

  describe('actor_id passthrough', () => {
    it('preserves actor_id in result', () => {
      const mutation = { ...baseMutation, actor_id: 'agent-gamma' };
      const result = evaluateGovernanceMutation(mutation);
      expect(result.actor_id).toBe('agent-gamma');
    });
  });
});
