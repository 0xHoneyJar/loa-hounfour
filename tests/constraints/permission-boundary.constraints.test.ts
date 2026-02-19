/**
 * Round-trip tests for PermissionBoundary constraint expressions (Sprint 3).
 *
 * Verifies every expression in PermissionBoundary.constraints.json evaluates
 * correctly against valid and invalid context data.
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('PermissionBoundary constraint expressions', () => {
  describe('permission-boundary-has-reporting', () => {
    it('passes when reporting is present', () => {
      expect(evaluateConstraint(
        { reporting: { required: true, report_to: 'audit-agent' } },
        'reporting != null',
      )).toBe(true);
    });

    it('fails when reporting is null', () => {
      expect(evaluateConstraint(
        { reporting: null },
        'reporting != null',
      )).toBe(false);
    });
  });

  describe('permission-boundary-has-revocation', () => {
    it('passes when revocation is present', () => {
      expect(evaluateConstraint(
        { revocation: { trigger: 'manual' } },
        'revocation != null',
      )).toBe(true);
    });

    it('fails when revocation is null', () => {
      expect(evaluateConstraint(
        { revocation: null },
        'revocation != null',
      )).toBe(false);
    });
  });

  describe('permission-scope-unique', () => {
    it('passes when scope is non-empty', () => {
      expect(evaluateConstraint(
        { scope: 'billing' },
        "scope != ''",
      )).toBe(true);
    });

    it('fails when scope is empty', () => {
      expect(evaluateConstraint(
        { scope: '' },
        "scope != ''",
      )).toBe(false);
    });
  });
});
