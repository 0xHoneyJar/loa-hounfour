/**
 * Tests for constraint namespace validation (v7.8.0, DR-F4).
 */
import { describe, it, expect } from 'vitest';
import { detectReservedNameCollisions } from '../../src/utilities/constraint-validation.js';
import { RESERVED_EVALUATOR_NAMES } from '../../src/constraints/evaluator.js';

describe('detectReservedNameCollisions', () => {
  it('returns empty array when no collisions exist', () => {
    const fields = ['amount', 'expires_at', 'personality_id'];
    const result = detectReservedNameCollisions(fields, 'TestSchema');
    expect(result).toEqual([]);
  });

  it('detects collision with builtin function name', () => {
    const fields = ['amount', 'now', 'status'];
    const result = detectReservedNameCollisions(fields, 'TestSchema');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ field: 'now', source: 'TestSchema' });
  });

  it('detects collision with language keyword', () => {
    const fields = ['length', 'value'];
    const result = detectReservedNameCollisions(fields, 'TestSchema');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ field: 'length', source: 'TestSchema' });
  });

  it('detects multiple collisions', () => {
    const fields = ['type_of', 'name', 'every', 'bigint_sum'];
    const result = detectReservedNameCollisions(fields, 'BadSchema');
    expect(result).toHaveLength(3);
    const collisionFields = result.map(c => c.field);
    expect(collisionFields).toContain('type_of');
    expect(collisionFields).toContain('every');
    expect(collisionFields).toContain('bigint_sum');
  });

  it('preserves source in collision report', () => {
    const fields = ['now'];
    const result = detectReservedNameCollisions(fields, 'EconomicBoundary');
    expect(result[0].source).toBe('EconomicBoundary');
  });

  it('handles empty fields array', () => {
    const result = detectReservedNameCollisions([], 'EmptySchema');
    expect(result).toEqual([]);
  });

  it('reports all reserved names as collisions when tested', () => {
    // Verify that every reserved name is actually caught
    const allReserved = [...RESERVED_EVALUATOR_NAMES];
    const result = detectReservedNameCollisions(allReserved, 'AllReserved');
    expect(result).toHaveLength(allReserved.length);
  });
});
