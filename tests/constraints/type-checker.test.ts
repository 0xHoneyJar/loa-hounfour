/**
 * Tests for the static type checker (S2-T2).
 */
import { describe, it, expect } from 'vitest';
import {
  typeCheckConstraintFile,
  type SchemaRegistryEntry,
} from '../../src/constraints/type-checker.js';

function makeRegistry(entries: Array<{ id: string; fields: Record<string, string> }>): Map<string, SchemaRegistryEntry> {
  const map = new Map<string, SchemaRegistryEntry>();
  for (const entry of entries) {
    const fieldMap = new Map(Object.entries(entry.fields)) as Map<string, any>;
    map.set(entry.id, { schema_id: entry.id, fields: fieldMap });
  }
  return map;
}

describe('typeCheckConstraintFile', () => {
  const registry = makeRegistry([
    { id: 'TestSchema', fields: { name: 'string', amount_micro: 'bigint_coercible', count: 'number' } },
  ]);

  it('passes valid constraint file with type signatures', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'TestSchema',
        constraints: [
          {
            id: 'test-1',
            expression: 'name != null',
            type_signature: {
              input_schema: 'TestSchema',
              output_type: 'boolean',
              field_types: { name: 'string' },
            },
          },
        ],
      },
      registry,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('errors on unknown schema_id', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'UnknownSchema',
        constraints: [],
      },
      registry,
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('not found in registry');
  });

  it('errors on input_schema mismatch', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'TestSchema',
        constraints: [
          {
            id: 'test-bad-input',
            expression: 'true',
            type_signature: {
              input_schema: 'WrongSchema',
              output_type: 'boolean',
              field_types: {},
            },
          },
        ],
      },
      registry,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('does not match');
  });

  it('errors on non-boolean output_type', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'TestSchema',
        constraints: [
          {
            id: 'test-bad-output',
            expression: 'true',
            type_signature: {
              output_type: 'string',
              field_types: {},
            },
          },
        ],
      },
      registry,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("must be 'boolean'");
  });

  it('warns on constraint without type_signature', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'TestSchema',
        constraints: [
          {
            id: 'test-no-sig',
            expression: 'true',
          },
        ],
      },
      registry,
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('no type_signature');
  });

  it('warns on unknown root field path', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'TestSchema',
        constraints: [
          {
            id: 'test-unknown-field',
            expression: 'unknown_field != null',
            type_signature: {
              field_types: { unknown_field: 'string' },
            },
          },
        ],
      },
      registry,
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.message.includes('not found in schema'))).toBe(true);
  });

  it('accepts schema reference types in field_types', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'TestSchema',
        constraints: [
          {
            id: 'test-schema-ref',
            expression: 'true',
            type_signature: {
              field_types: { name: 'AgentIdentity' },
            },
          },
        ],
      },
      registry,
    );
    // Schema references (uppercase) should not error
    expect(result.valid).toBe(true);
  });

  it('handles multiple constraints with mixed validity', () => {
    const result = typeCheckConstraintFile(
      {
        schema_id: 'TestSchema',
        constraints: [
          {
            id: 'good-1',
            expression: 'name != null',
            type_signature: { field_types: { name: 'string' } },
          },
          {
            id: 'bad-1',
            expression: 'true',
            type_signature: { output_type: 'number', field_types: {} },
          },
          {
            id: 'good-2',
            expression: 'count > 0',
            type_signature: { field_types: { count: 'number' } },
          },
        ],
      },
      registry,
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].constraint_id).toBe('bad-1');
  });

  it('passes with empty registry if schema_id not checked', () => {
    const emptyRegistry = new Map<string, SchemaRegistryEntry>();
    const result = typeCheckConstraintFile(
      {
        schema_id: 'NoSchema',
        constraints: [
          {
            id: 'test-1',
            expression: 'true',
            type_signature: { field_types: { x: 'string' } },
          },
        ],
      },
      emptyRegistry,
    );
    // Only error is for unknown schema
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('not found in registry');
  });

  it('handles constraint files with no constraints', () => {
    const result = typeCheckConstraintFile(
      { schema_id: 'TestSchema', constraints: [] },
      registry,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
