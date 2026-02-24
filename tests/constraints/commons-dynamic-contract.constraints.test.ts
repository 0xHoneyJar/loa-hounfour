/**
 * Constraint evaluation tests for DynamicContract and ContractNegotiation.
 *
 * @see SDD §4.9 — Dynamic Contracts (FR-4)
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('ContractNegotiation constraints', () => {
  describe('negotiation-expires-after-negotiated', () => {
    const expression = 'is_after(expires_at, negotiated_at)';

    it('passes when expires_at is after negotiated_at', () => {
      expect(evaluateConstraint({
        expires_at: '2026-02-25T11:00:00Z',
        negotiated_at: '2026-02-25T10:00:00Z',
      }, expression)).toBe(true);
    });

    it('fails when expires_at equals negotiated_at', () => {
      expect(evaluateConstraint({
        expires_at: '2026-02-25T10:00:00Z',
        negotiated_at: '2026-02-25T10:00:00Z',
      }, expression)).toBe(false);
    });

    it('fails when expires_at is before negotiated_at', () => {
      expect(evaluateConstraint({
        expires_at: '2026-02-25T09:00:00Z',
        negotiated_at: '2026-02-25T10:00:00Z',
      }, expression)).toBe(false);
    });
  });

  describe('negotiation-nonce-present', () => {
    const expression = 'len(nonce) >= 16';

    it('passes for 16-character nonce', () => {
      expect(evaluateConstraint({ nonce: 'a'.repeat(16) }, expression)).toBe(true);
    });

    it('passes for 64-character nonce', () => {
      expect(evaluateConstraint({ nonce: 'a'.repeat(64) }, expression)).toBe(true);
    });

    it('fails for 15-character nonce', () => {
      expect(evaluateConstraint({ nonce: 'a'.repeat(15) }, expression)).toBe(false);
    });

    it('fails for empty nonce', () => {
      expect(evaluateConstraint({ nonce: '' }, expression)).toBe(false);
    });
  });
});
