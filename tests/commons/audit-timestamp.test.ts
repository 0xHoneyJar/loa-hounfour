/**
 * Tests for audit timestamp validation.
 *
 * @see SDD §5.2 — Audit Timestamp Validation
 * @see PRD FR-5 — Audit Trail Domain Separation
 */
import { describe, it, expect } from 'vitest';
import { validateAuditTimestamp } from '../../src/commons/audit-timestamp.js';

/** Fixed reference time: 2026-02-28T12:00:00.000Z */
const REFERENCE_NOW = new Date('2026-02-28T12:00:00.000Z').getTime();

describe('validateAuditTimestamp', () => {
  describe('valid timestamps', () => {
    it('accepts valid ISO 8601 UTC timestamp', () => {
      const result = validateAuditTimestamp('2026-02-28T12:00:00Z', { now: REFERENCE_NOW });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('2026-02-28T12:00:00.000Z');
      expect(result.error).toBeUndefined();
    });

    it('accepts timestamp with milliseconds', () => {
      const result = validateAuditTimestamp('2026-02-28T12:00:00.123Z', { now: REFERENCE_NOW });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('2026-02-28T12:00:00.123Z');
    });

    it('accepts timestamp with positive offset', () => {
      const result = validateAuditTimestamp('2026-02-28T17:30:00+05:30', { now: REFERENCE_NOW });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('2026-02-28T12:00:00.000Z');
    });

    it('accepts timestamp with negative offset', () => {
      const result = validateAuditTimestamp('2026-02-28T04:00:00-08:00', { now: REFERENCE_NOW });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('2026-02-28T12:00:00.000Z');
    });

    it('accepts Unix epoch exactly', () => {
      const result = validateAuditTimestamp('1970-01-01T00:00:00Z', { now: REFERENCE_NOW });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('1970-01-01T00:00:00.000Z');
    });

    it('accepts timestamp within 24h future', () => {
      // 23 hours into the future
      const future = new Date(REFERENCE_NOW + 23 * 3600 * 1000).toISOString();
      const result = validateAuditTimestamp(future, { now: REFERENCE_NOW });
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid timestamps', () => {
    it('rejects empty string', () => {
      const result = validateAuditTimestamp('', { now: REFERENCE_NOW });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects non-ISO format', () => {
      const result = validateAuditTimestamp('Feb 28, 2026 12:00:00', { now: REFERENCE_NOW });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ISO 8601');
    });

    it('rejects epoch number as string', () => {
      const result = validateAuditTimestamp('1234567890', { now: REFERENCE_NOW });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ISO 8601');
    });

    it('rejects date without time', () => {
      const result = validateAuditTimestamp('2026-02-28', { now: REFERENCE_NOW });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ISO 8601');
    });

    it('rejects pre-epoch timestamp', () => {
      const result = validateAuditTimestamp('1969-12-31T23:59:59Z', { now: REFERENCE_NOW });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('epoch');
    });

    it('rejects timestamp more than 24h in the future', () => {
      // 25 hours into the future
      const farFuture = new Date(REFERENCE_NOW + 25 * 3600 * 1000).toISOString();
      const result = validateAuditTimestamp(farFuture, { now: REFERENCE_NOW });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('24 hours');
    });

    it('rejects timestamp without timezone', () => {
      const result = validateAuditTimestamp('2026-02-28T12:00:00', { now: REFERENCE_NOW });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ISO 8601');
    });
  });

  describe('injectable now', () => {
    it('uses provided now for future check', () => {
      const fixedNow = new Date('2030-01-01T00:00:00Z').getTime();
      // 2029-12-31 is in the past relative to fixedNow
      const result = validateAuditTimestamp('2029-12-31T23:00:00Z', { now: fixedNow });
      expect(result.valid).toBe(true);
    });

    it('uses Date.now() when now is not provided', () => {
      // Current time should be valid
      const result = validateAuditTimestamp(new Date().toISOString());
      expect(result.valid).toBe(true);
    });
  });

  describe('normalization', () => {
    it('normalizes to canonical toISOString format', () => {
      const result = validateAuditTimestamp('2026-02-28T12:00:00+00:00', { now: REFERENCE_NOW });
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('2026-02-28T12:00:00.000Z');
    });

    it('returns empty string for invalid input', () => {
      const result = validateAuditTimestamp('invalid', { now: REFERENCE_NOW });
      expect(result.normalized).toBe('');
    });
  });
});
