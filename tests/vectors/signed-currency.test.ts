import { describe, it, expect } from 'vitest';
import {
  subtractMicroSigned,
  negateMicro,
  isNegativeMicro,
} from '../../src/vocabulary/currency.js';

describe('Signed MicroUSD Arithmetic (v3.2.0)', () => {
  describe('subtractMicroSigned', () => {
    it('allows negative results', () => {
      expect(subtractMicroSigned('100', '200')).toBe('-100');
    });

    it('positive result when a > b', () => {
      expect(subtractMicroSigned('500', '200')).toBe('300');
    });

    it('zero result when a === b', () => {
      expect(subtractMicroSigned('100', '100')).toBe('0');
    });

    it('handles large amounts without precision loss', () => {
      expect(subtractMicroSigned('1000000', '999999999999999999')).toBe('-999999999998999999');
    });

    it('handles negative inputs', () => {
      expect(subtractMicroSigned('-100', '200')).toBe('-300');
    });

    it('subtracting negative is addition', () => {
      expect(subtractMicroSigned('100', '-200')).toBe('300');
    });

    it('both negative', () => {
      expect(subtractMicroSigned('-100', '-200')).toBe('100');
    });

    it('throws on invalid input', () => {
      expect(() => subtractMicroSigned('abc', '100')).toThrow();
    });
  });

  describe('negateMicro', () => {
    it('negates positive to negative', () => {
      expect(negateMicro('100')).toBe('-100');
    });

    it('negates negative to positive', () => {
      expect(negateMicro('-100')).toBe('100');
    });

    it('zero stays zero', () => {
      expect(negateMicro('0')).toBe('0');
    });

    it('handles large amounts', () => {
      expect(negateMicro('999999999999999999')).toBe('-999999999999999999');
    });
  });

  describe('isNegativeMicro', () => {
    it('returns true for negative amounts', () => {
      expect(isNegativeMicro('-100')).toBe(true);
    });

    it('returns false for positive amounts', () => {
      expect(isNegativeMicro('100')).toBe(false);
    });

    it('returns false for zero', () => {
      expect(isNegativeMicro('0')).toBe(false);
    });

    it('throws on invalid input', () => {
      expect(() => isNegativeMicro('abc')).toThrow();
    });
  });
});
