/**
 * Tests for ConstraintType vocabulary and ConstraintTypeSignature schema (S2-T1).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  ConstraintTypeSchema,
  ConstraintTypeSignatureSchema,
  CONSTRAINT_TYPES,
  type ConstraintType,
  type ConstraintTypeSignature,
} from '../../src/constraints/constraint-types.js';

describe('ConstraintTypeSchema', () => {
  const validTypes: ConstraintType[] = [
    'boolean', 'bigint', 'bigint_coercible', 'string', 'number', 'array', 'object', 'unknown',
  ];

  for (const type of validTypes) {
    it(`accepts "${type}"`, () => {
      expect(Value.Check(ConstraintTypeSchema, type)).toBe(true);
    });
  }

  it('rejects unknown types', () => {
    expect(Value.Check(ConstraintTypeSchema, 'integer')).toBe(false);
    expect(Value.Check(ConstraintTypeSchema, 'float')).toBe(false);
    expect(Value.Check(ConstraintTypeSchema, '')).toBe(false);
  });

  it('has correct $id', () => {
    expect(ConstraintTypeSchema.$id).toBe('ConstraintType');
  });
});

describe('CONSTRAINT_TYPES', () => {
  it('contains exactly 8 types', () => {
    expect(CONSTRAINT_TYPES).toHaveLength(8);
  });

  it('matches schema union members', () => {
    for (const type of CONSTRAINT_TYPES) {
      expect(Value.Check(ConstraintTypeSchema, type)).toBe(true);
    }
  });
});

describe('ConstraintTypeSignatureSchema', () => {
  it('accepts valid signature', () => {
    const sig: ConstraintTypeSignature = {
      input_schema: 'AgentIdentity',
      output_type: 'boolean',
      field_types: {
        'trust_scopes': 'object',
        'delegation_authority': 'array',
      },
    };
    expect(Value.Check(ConstraintTypeSignatureSchema, sig)).toBe(true);
  });

  it('rejects missing input_schema', () => {
    const bad = {
      output_type: 'boolean',
      field_types: {},
    };
    expect(Value.Check(ConstraintTypeSignatureSchema, bad)).toBe(false);
  });

  it('rejects empty input_schema', () => {
    const bad = {
      input_schema: '',
      output_type: 'boolean',
      field_types: {},
    };
    expect(Value.Check(ConstraintTypeSignatureSchema, bad)).toBe(false);
  });

  it('rejects invalid output_type', () => {
    const bad = {
      input_schema: 'Test',
      output_type: 'integer',
      field_types: {},
    };
    expect(Value.Check(ConstraintTypeSignatureSchema, bad)).toBe(false);
  });

  it('accepts empty field_types', () => {
    const sig: ConstraintTypeSignature = {
      input_schema: 'Test',
      output_type: 'boolean',
      field_types: {},
    };
    expect(Value.Check(ConstraintTypeSignatureSchema, sig)).toBe(true);
  });

  it('has correct $id', () => {
    expect(ConstraintTypeSignatureSchema.$id).toBe('ConstraintTypeSignature');
  });
});
