/**
 * Tests for ReservationArithmetic constraint file (FR-5).
 *
 * Validates constraint file structure and ROUNDING_BIAS export.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUNDING_BIAS, type RoundingBias } from '../../src/vocabulary/reservation-tier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('ReservationArithmetic constraint file', () => {
  const constraintPath = join(__dirname, '..', '..', 'constraints', 'ReservationArithmetic.constraints.json');
  const constraint = JSON.parse(readFileSync(constraintPath, 'utf-8'));

  it('has correct schema_id', () => {
    expect(constraint.schema_id).toBe('ReservationArithmetic');
  });

  it('has contract_version 5.3.0', () => {
    expect(constraint.contract_version).toBe('5.3.0');
  });

  it('has expression_version 1.0', () => {
    expect(constraint.expression_version).toBe('1.0');
  });

  it('has ceil-division-bias constraint', () => {
    const c = constraint.constraints.find((c: { id: string }) => c.id === 'ceil-division-bias');
    expect(c).toBeDefined();
    expect(c.severity).toBe('error');
    expect(c.institutional_context).toBeDefined();
  });

  it('has floor-check-inclusive constraint (SKP-003)', () => {
    const c = constraint.constraints.find((c: { id: string }) => c.id === 'floor-check-inclusive');
    expect(c).toBeDefined();
    expect(c.severity).toBe('error');
    expect(c.message).toContain('<=');
  });
});

describe('ROUNDING_BIAS constant', () => {
  it('exports ROUNDING_BIAS as rights_holder', () => {
    expect(ROUNDING_BIAS).toBe('rights_holder');
  });

  it('has correct type', () => {
    const bias: RoundingBias = ROUNDING_BIAS;
    expect(bias).toBe('rights_holder');
  });
});
