import { describe, it, expect } from 'vitest';
import { validateCompatibility } from '../../src/validators/compatibility.js';

describe('Version Compatibility (v3.0.0)', () => {
  it('exact match is fully compatible', () => {
    const result = validateCompatibility('3.0.0');
    expect(result.compatible).toBe(true);
    expect('warning' in result).toBe(false);
  });

  it('patch difference is fully compatible', () => {
    const result = validateCompatibility('3.0.1');
    expect(result.compatible).toBe(true);
  });

  it('cross-major within support window is compatible with warning', () => {
    const result = validateCompatibility('2.4.0');
    expect(result.compatible).toBe(true);
    expect('warning' in result && result.warning).toBeTruthy();
    expect((result as { warning: string }).warning).toContain('Cross-major');
  });

  it('cross-major at exact MIN_SUPPORTED_VERSION is compatible', () => {
    const result = validateCompatibility('2.4.0');
    expect(result.compatible).toBe(true);
  });

  it('cross-major above MIN_SUPPORTED_VERSION is compatible', () => {
    const result = validateCompatibility('2.5.0');
    expect(result.compatible).toBe(true);
    expect('warning' in result && result.warning).toBeTruthy();
  });

  it('below MIN_SUPPORTED_VERSION is incompatible', () => {
    const result = validateCompatibility('2.3.0');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('below minimum supported');
  });

  it('old major below MIN is incompatible', () => {
    const result = validateCompatibility('1.0.0');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('below minimum supported');
  });

  it('future major version is incompatible', () => {
    const result = validateCompatibility('4.0.0');
    expect(result.compatible).toBe(false);
    expect('error' in result && result.error).toContain('future major version');
  });

  it('same major, different minor is compatible with warning', () => {
    const result = validateCompatibility('3.1.0');
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
});
