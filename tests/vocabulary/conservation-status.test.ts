import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import {
  ConservationStatusSchema,
  CONSERVATION_STATUSES,
  type ConservationStatus,
} from '../../src/vocabulary/conservation-status.js';

describe('ConservationStatusSchema', () => {
  it('has $id "ConservationStatus"', () => {
    expect(ConservationStatusSchema.$id).toBe('ConservationStatus');
  });

  it('validates "conserved"', () => {
    expect(validate(ConservationStatusSchema, 'conserved').valid).toBe(true);
  });

  it('validates "violated"', () => {
    expect(validate(ConservationStatusSchema, 'violated').valid).toBe(true);
  });

  it('validates "unverifiable"', () => {
    expect(validate(ConservationStatusSchema, 'unverifiable').valid).toBe(true);
  });

  it('rejects invalid string', () => {
    expect(validate(ConservationStatusSchema, 'unknown').valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validate(ConservationStatusSchema, '').valid).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(validate(ConservationStatusSchema, 42).valid).toBe(false);
    expect(validate(ConservationStatusSchema, true).valid).toBe(false);
    expect(validate(ConservationStatusSchema, null).valid).toBe(false);
  });

  it('exports all 3 statuses in CONSERVATION_STATUSES', () => {
    expect(CONSERVATION_STATUSES).toHaveLength(3);
    expect(CONSERVATION_STATUSES).toContain('conserved');
    expect(CONSERVATION_STATUSES).toContain('violated');
    expect(CONSERVATION_STATUSES).toContain('unverifiable');
  });

  it('Static type is assignable from all valid literals', () => {
    const a: ConservationStatus = 'conserved';
    const b: ConservationStatus = 'violated';
    const c: ConservationStatus = 'unverifiable';
    expect([a, b, c]).toHaveLength(3);
  });
});
