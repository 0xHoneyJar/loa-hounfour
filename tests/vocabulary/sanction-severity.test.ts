/**
 * Tests for SanctionSeverity graduated vocabulary (v5.1.0).
 *
 * S4-T1: Schema, ladder, lookup, comparison.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  SanctionSeveritySchema,
  SANCTION_SEVERITY_LADDER,
  getSeverityEntry,
  compareSeverity,
  type SanctionSeverityLevel,
} from '../../src/vocabulary/sanction-severity.js';

describe('SanctionSeveritySchema', () => {
  it('accepts warning', () => {
    expect(Value.Check(SanctionSeveritySchema, 'warning')).toBe(true);
  });

  it('accepts rate_limited', () => {
    expect(Value.Check(SanctionSeveritySchema, 'rate_limited')).toBe(true);
  });

  it('accepts pool_restricted', () => {
    expect(Value.Check(SanctionSeveritySchema, 'pool_restricted')).toBe(true);
  });

  it('accepts suspended', () => {
    expect(Value.Check(SanctionSeveritySchema, 'suspended')).toBe(true);
  });

  it('rejects terminated (not a graduated severity)', () => {
    expect(Value.Check(SanctionSeveritySchema, 'terminated')).toBe(false);
  });

  it('rejects unknown values', () => {
    expect(Value.Check(SanctionSeveritySchema, 'unknown')).toBe(false);
    expect(Value.Check(SanctionSeveritySchema, '')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(SanctionSeveritySchema, 42)).toBe(false);
    expect(Value.Check(SanctionSeveritySchema, null)).toBe(false);
  });

  it('has correct $id', () => {
    expect(SanctionSeveritySchema.$id).toBe('SanctionSeverity');
  });
});

describe('SANCTION_SEVERITY_LADDER', () => {
  it('contains exactly 4 entries', () => {
    expect(SANCTION_SEVERITY_LADDER).toHaveLength(4);
  });

  it('has monotonically increasing levels', () => {
    for (let i = 1; i < SANCTION_SEVERITY_LADDER.length; i++) {
      expect(SANCTION_SEVERITY_LADDER[i].level).toBeGreaterThan(SANCTION_SEVERITY_LADDER[i - 1].level);
    }
  });

  it('all entries have required fields', () => {
    for (const entry of SANCTION_SEVERITY_LADDER) {
      expect(typeof entry.severity).toBe('string');
      expect(typeof entry.level).toBe('number');
      expect(typeof entry.default_duration_seconds).toBe('number');
      expect(typeof entry.effect).toBe('string');
      expect(entry.default_duration_seconds).toBeGreaterThanOrEqual(0);
    }
  });

  it('warning has 24h default duration', () => {
    const warning = SANCTION_SEVERITY_LADDER.find(e => e.severity === 'warning');
    expect(warning?.default_duration_seconds).toBe(86400);
  });

  it('suspended has 0 (indefinite) default duration', () => {
    const suspended = SANCTION_SEVERITY_LADDER.find(e => e.severity === 'suspended');
    expect(suspended?.default_duration_seconds).toBe(0);
  });
});

describe('getSeverityEntry', () => {
  it('returns correct entry for each severity', () => {
    expect(getSeverityEntry('warning').level).toBe(1);
    expect(getSeverityEntry('rate_limited').level).toBe(2);
    expect(getSeverityEntry('pool_restricted').level).toBe(3);
    expect(getSeverityEntry('suspended').level).toBe(4);
  });

  it('throws for unknown severity', () => {
    expect(() => getSeverityEntry('unknown' as SanctionSeverityLevel)).toThrow('Unknown severity level');
  });
});

describe('compareSeverity', () => {
  it('returns negative when a < b', () => {
    expect(compareSeverity('warning', 'suspended')).toBeLessThan(0);
  });

  it('returns positive when a > b', () => {
    expect(compareSeverity('suspended', 'warning')).toBeGreaterThan(0);
  });

  it('returns zero when equal', () => {
    expect(compareSeverity('rate_limited', 'rate_limited')).toBe(0);
  });

  it('correct ordering: warning < rate_limited < pool_restricted < suspended', () => {
    expect(compareSeverity('warning', 'rate_limited')).toBeLessThan(0);
    expect(compareSeverity('rate_limited', 'pool_restricted')).toBeLessThan(0);
    expect(compareSeverity('pool_restricted', 'suspended')).toBeLessThan(0);
  });
});
