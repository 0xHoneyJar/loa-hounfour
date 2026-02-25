/**
 * Tests for Invariant schema.
 *
 * @see SDD §4.2 — ConservationLaw (FR-1.2)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { InvariantSchema, type Invariant } from '../../src/commons/invariant.js';

describe('Invariant', () => {
  describe('valid instances', () => {
    it('accepts a full invariant with all fields', () => {
      const inv: Invariant = {
        invariant_id: 'CL-01',
        name: 'Lot conservation',
        expression: "bigint_sum([balance, reserved, consumed]) == original_allocation",
        severity: 'error',
        description: 'Balance + reserved + consumed must equal original allocation.',
      };
      expect(Value.Check(InvariantSchema, inv)).toBe(true);
    });

    it('accepts minimal invariant without description', () => {
      const inv: Invariant = {
        invariant_id: 'I-1',
        name: 'Non-negativity',
        expression: "balance >= 0",
        severity: 'warning',
      };
      expect(Value.Check(InvariantSchema, inv)).toBe(true);
    });

    it.each(['error', 'warning', 'info'] as const)(
      'accepts severity "%s"',
      (severity) => {
        expect(Value.Check(InvariantSchema, {
          invariant_id: 'I-1',
          name: 'Test',
          expression: 'true',
          severity,
        })).toBe(true);
      },
    );

    it('accepts multi-digit invariant_id', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'REP-0001',
        name: 'Multi-digit',
        expression: 'true',
        severity: 'info',
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects missing invariant_id', () => {
      expect(Value.Check(InvariantSchema, {
        name: 'Test',
        expression: 'true',
        severity: 'error',
      })).toBe(false);
    });

    it('rejects invalid invariant_id pattern', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'lowercase-1',
        name: 'Bad ID',
        expression: 'true',
        severity: 'error',
      })).toBe(false);
    });

    it('rejects empty name', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'I-1',
        name: '',
        expression: 'true',
        severity: 'error',
      })).toBe(false);
    });

    it('rejects empty expression', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'I-1',
        name: 'Test',
        expression: '',
        severity: 'error',
      })).toBe(false);
    });

    it('rejects unknown severity', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'I-1',
        name: 'Test',
        expression: 'true',
        severity: 'fatal',
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'I-1',
        name: 'Test',
        expression: 'true',
        severity: 'error',
        extra: true,
      })).toBe(false);
    });

    it('rejects description over 1000 chars', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'I-1',
        name: 'Test',
        expression: 'true',
        severity: 'error',
        description: 'x'.repeat(1001),
      })).toBe(false);
    });

    it('rejects name over 255 chars', () => {
      expect(Value.Check(InvariantSchema, {
        invariant_id: 'I-1',
        name: 'x'.repeat(256),
        expression: 'true',
        severity: 'error',
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "Invariant"', () => {
      expect(InvariantSchema.$id).toBe('Invariant');
    });

    it('has additionalProperties false', () => {
      expect(InvariantSchema.additionalProperties).toBe(false);
    });
  });
});
