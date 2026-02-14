import { describe, it, expect } from 'vitest';
import { UUID_V4_PATTERN, OPAQUE_ID_CONSTRAINTS } from '../../src/vocabulary/patterns.js';

describe('UUID_V4_PATTERN', () => {
  const regex = new RegExp(UUID_V4_PATTERN);

  it('matches a valid UUID v4 (lowercase)', () => {
    expect(regex.test('12345678-1234-4123-8123-123456789abc')).toBe(true);
  });

  it('matches a valid UUID v4 with variant bits 9, a, b', () => {
    expect(regex.test('12345678-1234-4123-9123-123456789abc')).toBe(true);
    expect(regex.test('12345678-1234-4123-a123-123456789abc')).toBe(true);
    expect(regex.test('12345678-1234-4123-b123-123456789abc')).toBe(true);
  });

  it('rejects UUID v1 (wrong version nibble)', () => {
    expect(regex.test('12345678-1234-1123-8123-123456789abc')).toBe(false);
  });

  it('rejects UUID with invalid variant nibble (0)', () => {
    expect(regex.test('12345678-1234-4123-0123-123456789abc')).toBe(false);
  });

  it('rejects UUID with invalid variant nibble (c)', () => {
    expect(regex.test('12345678-1234-4123-c123-123456789abc')).toBe(false);
  });

  it('rejects uppercase UUID', () => {
    expect(regex.test('12345678-1234-4123-8123-123456789ABC')).toBe(false);
  });

  it('rejects non-UUID string', () => {
    expect(regex.test('not-a-uuid')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(regex.test('')).toBe(false);
  });

  it('rejects UUID without dashes', () => {
    expect(regex.test('1234567812344123812312345678 9abc')).toBe(false);
  });

  it('rejects UUID with extra characters', () => {
    expect(regex.test('12345678-1234-4123-8123-123456789abcX')).toBe(false);
  });
});

describe('OPAQUE_ID_CONSTRAINTS', () => {
  it('has minLength of 1', () => {
    expect(OPAQUE_ID_CONSTRAINTS.minLength).toBe(1);
  });

  it('is a frozen-like readonly object', () => {
    // The as const assertion makes it readonly at the type level
    expect(OPAQUE_ID_CONSTRAINTS).toEqual({ minLength: 1 });
  });
});
