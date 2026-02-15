import { describe, it, expect } from 'vitest';
import { SCHEMA_STABILITY_LEVELS, isExperimentalSchema } from '../../src/vocabulary/schema-stability.js';
import { StakePositionSchema } from '../../src/schemas/stake-position.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';
import { MutualCreditSchema } from '../../src/schemas/mutual-credit.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';

describe('SCHEMA_STABILITY_LEVELS', () => {
  it('has experimental, stable, and deprecated levels', () => {
    expect(Object.keys(SCHEMA_STABILITY_LEVELS)).toEqual(['experimental', 'stable', 'deprecated']);
  });

  it('each level has required metadata fields', () => {
    for (const level of Object.values(SCHEMA_STABILITY_LEVELS)) {
      expect(level).toHaveProperty('label');
      expect(level).toHaveProperty('description');
      expect(level).toHaveProperty('breaking_change_policy');
      expect(level).toHaveProperty('removal_timeline');
    }
  });
});

describe('isExperimentalSchema', () => {
  it('returns true for StakePosition (x-experimental: true)', () => {
    expect(isExperimentalSchema(StakePositionSchema)).toBe(true);
  });

  it('returns true for CommonsDividend (x-experimental: true)', () => {
    expect(isExperimentalSchema(CommonsDividendSchema)).toBe(true);
  });

  it('returns true for MutualCredit (x-experimental: true)', () => {
    expect(isExperimentalSchema(MutualCreditSchema)).toBe(true);
  });

  it('returns false for BillingEntry (no x-experimental)', () => {
    expect(isExperimentalSchema(BillingEntrySchema)).toBe(false);
  });

  it('returns false for a schema without the flag', () => {
    const fakeSchema = { type: 'object', properties: {} };
    expect(isExperimentalSchema(fakeSchema)).toBe(false);
  });

  it('returns false when x-experimental is not exactly true', () => {
    const fakeSchema = { type: 'object', 'x-experimental': 'yes' };
    expect(isExperimentalSchema(fakeSchema)).toBe(false);
  });
});
