/**
 * Tests for GovernanceError discriminated union (6 types).
 *
 * @see SDD §4.6 — Governance Error Taxonomy (FR-1.8)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  InvariantViolationSchema,
  InvalidTransitionSchema,
  GuardFailureSchema,
  EvaluationErrorSchema,
  HashDiscontinuityErrorSchema,
  PartialApplicationSchema,
  GovernanceErrorSchema,
  type GovernanceError,
} from '../../src/commons/error-taxonomy.js';

const baseFields = {
  error_code: 'GOV_001',
  message: 'Test error message',
  affected_fields: ['balance'],
  timestamp: '2026-02-25T10:00:00Z',
};

describe('GovernanceError discriminated union', () => {
  describe('InvariantViolation', () => {
    const valid = {
      type: 'INVARIANT_VIOLATION' as const,
      invariant_id: 'CL-01',
      expression: "bigint_sum([balance, reserved, consumed]) == original_allocation",
      retryable: false as const,
      ...baseFields,
    };

    it('accepts valid invariant violation', () => {
      expect(Value.Check(InvariantViolationSchema, valid)).toBe(true);
    });

    it('has retryable: false (literal)', () => {
      expect(Value.Check(InvariantViolationSchema, { ...valid, retryable: true })).toBe(false);
    });

    it('validates via union', () => {
      expect(Value.Check(GovernanceErrorSchema, valid)).toBe(true);
    });

    it('has $id "InvariantViolation"', () => {
      expect(InvariantViolationSchema.$id).toBe('InvariantViolation');
    });
  });

  describe('InvalidTransition', () => {
    const valid = {
      type: 'INVALID_TRANSITION' as const,
      from_state: 'cold',
      to_state: 'authoritative',
      retryable: false as const,
      ...baseFields,
    };

    it('accepts valid invalid transition', () => {
      expect(Value.Check(InvalidTransitionSchema, valid)).toBe(true);
    });

    it('has retryable: false (literal)', () => {
      expect(Value.Check(InvalidTransitionSchema, { ...valid, retryable: true })).toBe(false);
    });

    it('validates via union', () => {
      expect(Value.Check(GovernanceErrorSchema, valid)).toBe(true);
    });
  });

  describe('GuardFailure', () => {
    const valid = {
      type: 'GUARD_FAILURE' as const,
      guard_expression: "sample_count >= min_sample_count",
      retryable: true,
      ...baseFields,
    };

    it('accepts valid guard failure (retryable true)', () => {
      expect(Value.Check(GuardFailureSchema, valid)).toBe(true);
    });

    it('accepts guard failure (retryable false)', () => {
      expect(Value.Check(GuardFailureSchema, { ...valid, retryable: false })).toBe(true);
    });

    it('validates via union', () => {
      expect(Value.Check(GovernanceErrorSchema, valid)).toBe(true);
    });
  });

  describe('EvaluationError', () => {
    const valid = {
      type: 'EVALUATION_ERROR' as const,
      expression: "bigint_sum(invalid)",
      eval_error: 'TypeError: expected array argument',
      retryable: false as const,
      ...baseFields,
    };

    it('accepts valid evaluation error', () => {
      expect(Value.Check(EvaluationErrorSchema, valid)).toBe(true);
    });

    it('validates via union', () => {
      expect(Value.Check(GovernanceErrorSchema, valid)).toBe(true);
    });
  });

  describe('HashDiscontinuityError', () => {
    const valid = {
      type: 'HASH_DISCONTINUITY' as const,
      entry_index: 5,
      expected_hash: 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      actual_hash: 'sha256:b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      retryable: false as const,
      ...baseFields,
    };

    it('accepts valid hash discontinuity error', () => {
      expect(Value.Check(HashDiscontinuityErrorSchema, valid)).toBe(true);
    });

    it('rejects invalid hash format', () => {
      expect(Value.Check(HashDiscontinuityErrorSchema, {
        ...valid,
        expected_hash: 'md5:abc123',
      })).toBe(false);
    });

    it('validates via union', () => {
      expect(Value.Check(GovernanceErrorSchema, valid)).toBe(true);
    });
  });

  describe('PartialApplication', () => {
    const valid = {
      type: 'PARTIAL_APPLICATION' as const,
      expected_version: 5,
      actual_version: 7,
      retryable: true as const,
      ...baseFields,
    };

    it('accepts valid partial application (CAS mismatch)', () => {
      expect(Value.Check(PartialApplicationSchema, valid)).toBe(true);
    });

    it('has retryable: true (literal)', () => {
      expect(Value.Check(PartialApplicationSchema, { ...valid, retryable: false })).toBe(false);
    });

    it('validates via union', () => {
      expect(Value.Check(GovernanceErrorSchema, valid)).toBe(true);
    });
  });

  describe('discriminant field', () => {
    it('rejects unknown type', () => {
      expect(Value.Check(GovernanceErrorSchema, {
        type: 'UNKNOWN_ERROR',
        retryable: false,
        ...baseFields,
      })).toBe(false);
    });

    it('rejects missing type', () => {
      expect(Value.Check(GovernanceErrorSchema, {
        retryable: false,
        ...baseFields,
      })).toBe(false);
    });
  });

  describe('shared base fields', () => {
    const valid = {
      type: 'INVARIANT_VIOLATION' as const,
      invariant_id: 'CL-01',
      expression: 'true',
      retryable: false as const,
      ...baseFields,
    };

    it('accepts with audit_entry_id', () => {
      expect(Value.Check(GovernanceErrorSchema, {
        ...valid,
        audit_entry_id: '550e8400-e29b-41d4-a716-446655440000',
      })).toBe(true);
    });

    it('rejects empty error_code', () => {
      expect(Value.Check(GovernanceErrorSchema, {
        ...valid,
        error_code: '',
      })).toBe(false);
    });

    it('rejects message over 2000 chars', () => {
      expect(Value.Check(GovernanceErrorSchema, {
        ...valid,
        message: 'x'.repeat(2001),
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('GovernanceError has $id', () => {
      expect(GovernanceErrorSchema.$id).toBe('GovernanceError');
    });
  });
});
