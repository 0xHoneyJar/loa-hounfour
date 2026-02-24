/**
 * Tests for ConservationLaw schema.
 *
 * @see SDD §4.2 — ConservationLaw (FR-1.2)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { ConservationLawSchema, type ConservationLaw } from '../../src/commons/conservation-law.js';

describe('ConservationLaw', () => {
  const validInvariant = {
    invariant_id: 'CL-01',
    name: 'Lot conservation',
    expression: "bigint_sum([balance, reserved, consumed]) == original_allocation",
    severity: 'error' as const,
  };

  describe('valid instances', () => {
    it('accepts strict enforcement with invariants', () => {
      const law: ConservationLaw = {
        invariants: [validInvariant],
        enforcement: 'strict',
        scope: 'per-entry',
      };
      expect(Value.Check(ConservationLawSchema, law)).toBe(true);
    });

    it('accepts advisory enforcement with empty invariants', () => {
      const law: ConservationLaw = {
        invariants: [],
        enforcement: 'advisory',
        scope: 'aggregate',
      };
      expect(Value.Check(ConservationLawSchema, law)).toBe(true);
    });

    it('accepts strict enforcement with empty invariants (structurally valid)', () => {
      // Note: constraint file SKP-001 rejects this, but schema-level accepts it
      const law: ConservationLaw = {
        invariants: [],
        enforcement: 'strict',
        scope: 'per-entry',
      };
      expect(Value.Check(ConservationLawSchema, law)).toBe(true);
    });

    it('accepts multiple invariants', () => {
      const law: ConservationLaw = {
        invariants: [
          validInvariant,
          {
            invariant_id: 'CL-02',
            name: 'Non-negativity',
            expression: "bigint_gte(balance, '0')",
            severity: 'error',
          },
          {
            invariant_id: 'CL-03',
            name: 'Receivable bounded',
            expression: "bigint_gte(original_allocation, reserved)",
            severity: 'error',
            description: 'Receivable must not exceed allocation.',
          },
        ],
        enforcement: 'strict',
        scope: 'per-entry',
      };
      expect(Value.Check(ConservationLawSchema, law)).toBe(true);
    });

    it.each(['strict', 'advisory'] as const)(
      'accepts enforcement "%s"',
      (enforcement) => {
        expect(Value.Check(ConservationLawSchema, {
          invariants: [],
          enforcement,
          scope: 'per-entry',
        })).toBe(true);
      },
    );

    it.each(['per-entry', 'aggregate'] as const)(
      'accepts scope "%s"',
      (scope) => {
        expect(Value.Check(ConservationLawSchema, {
          invariants: [],
          enforcement: 'advisory',
          scope,
        })).toBe(true);
      },
    );
  });

  describe('invalid instances', () => {
    it('rejects unknown enforcement', () => {
      expect(Value.Check(ConservationLawSchema, {
        invariants: [],
        enforcement: 'lenient',
        scope: 'per-entry',
      })).toBe(false);
    });

    it('rejects unknown scope', () => {
      expect(Value.Check(ConservationLawSchema, {
        invariants: [],
        enforcement: 'strict',
        scope: 'cross-resource',
      })).toBe(false);
    });

    it('rejects missing enforcement', () => {
      expect(Value.Check(ConservationLawSchema, {
        invariants: [],
        scope: 'per-entry',
      })).toBe(false);
    });

    it('rejects missing scope', () => {
      expect(Value.Check(ConservationLawSchema, {
        invariants: [],
        enforcement: 'strict',
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(ConservationLawSchema, {
        invariants: [],
        enforcement: 'advisory',
        scope: 'per-entry',
        extra: true,
      })).toBe(false);
    });

    it('rejects invalid invariant in array', () => {
      expect(Value.Check(ConservationLawSchema, {
        invariants: [{ bad: true }],
        enforcement: 'strict',
        scope: 'per-entry',
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "ConservationLaw"', () => {
      expect(ConservationLawSchema.$id).toBe('ConservationLaw');
    });

    it('has additionalProperties false', () => {
      expect(ConservationLawSchema.additionalProperties).toBe(false);
    });
  });
});
