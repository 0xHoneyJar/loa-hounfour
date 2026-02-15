import { describe, it, expect } from 'vitest';
import {
  addMicro,
  subtractMicro,
  multiplyBps,
  compareMicro,
  ZERO_MICRO,
} from '../../src/vocabulary/currency.js';

describe('Centralized MicroUSD Arithmetic (BB-C4-ADV-006)', () => {
  describe('addMicro', () => {
    it('adds two amounts', () => {
      expect(addMicro('100', '200')).toBe('300');
    });

    it('handles zero', () => {
      expect(addMicro('500', ZERO_MICRO)).toBe('500');
      expect(addMicro(ZERO_MICRO, '500')).toBe('500');
      expect(addMicro(ZERO_MICRO, ZERO_MICRO)).toBe('0');
    });

    it('handles large numbers without precision loss', () => {
      // parseInt('999999999999999999') = 1000000000000000000 (precision loss!)
      // BigInt must not lose precision here
      expect(addMicro('999999999999999999', '1')).toBe('1000000000000000000');
    });

    it('handles very large numbers (> Number.MAX_SAFE_INTEGER)', () => {
      const big = '9007199254740993'; // > Number.MAX_SAFE_INTEGER
      expect(addMicro(big, '1')).toBe('9007199254740994');
    });

    it('throws on non-numeric string', () => {
      expect(() => addMicro('abc', '100')).toThrow('integer string');
    });

    it('accepts negative numbers (signed MicroUSD)', () => {
      expect(addMicro('-100', '200')).toBe('100');
    });

    it('throws on decimal', () => {
      expect(() => addMicro('10.5', '100')).toThrow('integer string');
    });
  });

  describe('subtractMicro', () => {
    it('subtracts two amounts', () => {
      expect(subtractMicro('500', '200')).toBe('300');
    });

    it('returns zero when equal', () => {
      expect(subtractMicro('1000', '1000')).toBe('0');
    });

    it('throws on underflow', () => {
      expect(() => subtractMicro('100', '200')).toThrow('Underflow');
    });

    it('throws on underflow with zero', () => {
      expect(() => subtractMicro(ZERO_MICRO, '1')).toThrow('Underflow');
    });

    it('handles large numbers', () => {
      expect(subtractMicro('1000000000000000000', '999999999999999999')).toBe('1');
    });

    it('throws on non-numeric string', () => {
      expect(() => subtractMicro('abc', '100')).toThrow('integer string');
    });
  });

  describe('multiplyBps', () => {
    it('1x multiplier (10000 bps)', () => {
      expect(multiplyBps('1000000', 10000)).toBe('1000000');
    });

    it('1.5x multiplier (15000 bps)', () => {
      expect(multiplyBps('1000000', 15000)).toBe('1500000');
    });

    it('2.5x multiplier (25000 bps)', () => {
      expect(multiplyBps('10000', 25000)).toBe('25000');
    });

    it('0x multiplier (0 bps)', () => {
      expect(multiplyBps('1000000', 0)).toBe('0');
    });

    it('handles zero amount', () => {
      expect(multiplyBps(ZERO_MICRO, 15000)).toBe('0');
    });

    it('truncates (does not round)', () => {
      // 333 * 10000 / 10000 = 333 (exact)
      expect(multiplyBps('333', 10000)).toBe('333');
      // 1 * 3333 / 10000 = 0.3333 → truncated to 0
      expect(multiplyBps('1', 3333)).toBe('0');
      // 3 * 3334 / 10000 = 1.0002 → truncated to 1
      expect(multiplyBps('3', 3334)).toBe('1');
    });

    it('handles large amount with multiplier', () => {
      expect(multiplyBps('999999999999999999', 10000)).toBe('999999999999999999');
    });

    it('throws on negative bps', () => {
      expect(() => multiplyBps('100', -1)).toThrow('non-negative integer');
    });

    it('throws on fractional bps', () => {
      expect(() => multiplyBps('100', 1.5)).toThrow('non-negative integer');
    });

    it('throws on non-numeric amount', () => {
      expect(() => multiplyBps('abc', 10000)).toThrow('integer string');
    });
  });

  describe('compareMicro', () => {
    it('returns 0 for equal amounts', () => {
      expect(compareMicro('1000', '1000')).toBe(0);
    });

    it('returns -1 when a < b', () => {
      expect(compareMicro('100', '200')).toBe(-1);
    });

    it('returns 1 when a > b', () => {
      expect(compareMicro('200', '100')).toBe(1);
    });

    it('compares zeros', () => {
      expect(compareMicro(ZERO_MICRO, ZERO_MICRO)).toBe(0);
    });

    it('compares large numbers correctly', () => {
      expect(compareMicro('9007199254740993', '9007199254740992')).toBe(1);
    });

    it('throws on non-numeric string', () => {
      expect(() => compareMicro('abc', '100')).toThrow('integer string');
    });
  });

  describe('ZERO_MICRO', () => {
    it('is the string "0"', () => {
      expect(ZERO_MICRO).toBe('0');
    });
  });
});
