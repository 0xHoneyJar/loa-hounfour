/**
 * Cross-field validator tests for CommonsDividend source_performance_ids (BB-V4-DEEP-003).
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';

const VALID_COMMONS_DIVIDEND = {
  dividend_id: 'div1',
  pool_id: 'p1',
  total_micro: '10000000',
  governance: 'algorithmic',
  period_start: '2026-01-01T00:00:00Z',
  period_end: '2026-02-01T00:00:00Z',
  contract_version: '4.4.0',
};

describe('CommonsDividend source_performance_ids cross-field validation', () => {
  it('warns when source_performance_ids is missing', () => {
    const result = validate(CommonsDividendSchema, VALID_COMMONS_DIVIDEND);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('dividend should link to source performance records'))).toBe(true);
  });

  it('no provenance warning when source_performance_ids is present', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      source_performance_ids: ['r1', 'r2'],
    };
    const result = validate(CommonsDividendSchema, doc);
    expect(result.valid).toBe(true);
    const hasProvenanceWarning = result.valid === true && result.warnings?.some((w) => w.includes('dividend should link to source performance records'));
    expect(hasProvenanceWarning).toBeFalsy();
  });

  it('warns about distributed dividend without provenance', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      distribution: {
        recipients: [
          { address: 'wallet-a1', role: 'provider', share_bps: 5000, amount_micro: '5000000' },
          { address: 'wallet-a2', role: 'platform', share_bps: 5000, amount_micro: '5000000' },
        ],
      },
    };
    const result = validate(CommonsDividendSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('distributed dividend without provenance'))).toBe(true);
  });

  it('no provenance warning when distribution has source_performance_ids', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      source_performance_ids: ['r1'],
      distribution: {
        recipients: [
          { address: 'wallet-a1', role: 'provider', share_bps: 10000, amount_micro: '10000000' },
        ],
      },
    };
    const result = validate(CommonsDividendSchema, doc);
    expect(result.valid).toBe(true);
    const hasProvenanceWarning = result.valid === true && result.warnings?.some((w) => w.includes('distributed dividend without provenance'));
    expect(hasProvenanceWarning).toBeFalsy();
  });

  it('schema accepts optional source_performance_ids field', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      source_performance_ids: ['perf-1', 'perf-2'],
    };
    const result = validate(CommonsDividendSchema, doc, { crossField: false });
    expect(result.valid).toBe(true);
  });

  it('rejects when distribution amount_micro sum does not equal total_micro (BB-C8-I1-CMP-007)', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      source_performance_ids: ['r1'],
      distribution: {
        recipients: [
          { address: 'wallet-a1', role: 'provider', share_bps: 5000, amount_micro: '6000000' },
          { address: 'wallet-a2', role: 'platform', share_bps: 5000, amount_micro: '5000000' },
        ],
      },
    };
    const result = validate(CommonsDividendSchema, doc);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('distribution amount_micro sum'))).toBe(true);
    }
  });

  it('rejects negative amount_micro in distribution recipients (BB-C8-I2-COR-005)', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      source_performance_ids: ['r1'],
      distribution: {
        recipients: [
          { address: 'wallet-a1', role: 'provider', share_bps: 5000, amount_micro: '15000000' },
          { address: 'wallet-a2', role: 'platform', share_bps: 5000, amount_micro: '-5000000' },
        ],
      },
    };
    const result = validate(CommonsDividendSchema, doc);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('non-negative'))).toBe(true);
    }
  });

  it('schema rejects empty source_performance_ids array', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      source_performance_ids: [],
    };
    const result = validate(CommonsDividendSchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
  });

  it('schema rejects source_performance_ids with empty string', () => {
    const doc = {
      ...VALID_COMMONS_DIVIDEND,
      source_performance_ids: [''],
    };
    const result = validate(CommonsDividendSchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
  });
});
