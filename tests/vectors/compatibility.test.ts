import { describe, it, expect } from 'vitest';
import { validateCompatibility } from '../../src/validators/compatibility.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../../src/version.js';

describe('Version Compatibility (v5.3.0)', () => {
  it('exact match is fully compatible', () => {
    const result = validateCompatibility('5.3.0');
    expect(result.compatible).toBe(true);
    expect('warning' in result).toBe(false);
  });

  it('patch difference is fully compatible', () => {
    const result = validateCompatibility('5.3.1');
    expect(result.compatible).toBe(true);
  });

  it('same major at MIN_SUPPORTED_VERSION is compatible with minor mismatch warning', () => {
    const result = validateCompatibility('5.0.0');
    expect(result.compatible).toBe(true);
    expect('warning' in result && result.warning).toBeTruthy();
    expect((result as { warning: string }).warning).toContain('Minor version mismatch');
  });

  it('previous minor version is compatible with warning', () => {
    const result = validateCompatibility('5.2.0');
    expect(result.compatible).toBe(true);
    expect('warning' in result && result.warning).toContain('Minor version mismatch');
  });

  it('below MIN_SUPPORTED_VERSION is incompatible', () => {
    const result = validateCompatibility('4.9.0');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('below minimum supported');
  });

  it('old major below MIN is incompatible', () => {
    const result = validateCompatibility('4.0.0');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('below minimum supported');
  });

  it('very old major is incompatible', () => {
    const result = validateCompatibility('1.0.0');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('below minimum supported');
  });

  it('future major version is incompatible', () => {
    const result = validateCompatibility('6.0.0');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('future major version');
  });

  it('future minor version is compatible with warning', () => {
    const result = validateCompatibility('5.4.0');
    expect(result.compatible).toBe(true);
    expect('warning' in result && result.warning).toContain('Minor version mismatch');
  });

  it('invalid format is incompatible', () => {
    const result = validateCompatibility('not-a-version');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('Invalid contract version format');
  });

  it('empty string is incompatible', () => {
    const result = validateCompatibility('');
    expect(result.compatible).toBe(false);
  });

  // Version canary — if these constants change, update the hardcoded test values above
  it('version constants match expected values', () => {
    expect(CONTRACT_VERSION).toBe('5.3.0');
    expect(MIN_SUPPORTED_VERSION).toBe('5.0.0');
  });
});
