/**
 * Tests for MicroUSDC branded type (S1-T1, S1-T2, S1-T3).
 *
 * Validates constructor, reader, serializer, converter, wire schema,
 * and property-based round-trip.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  microUSDC,
  readMicroUSDC,
  serializeMicroUSDC,
  deserializeMicroUSDC,
  microUSDToUSDC,
  microUSDCToUSD,
  type MicroUSDC,
} from '../../src/economy/branded-types.js';
import { microUSD } from '../../src/economy/branded-types.js';
import { MicroUSDCSchema } from '../../src/vocabulary/currency.js';
import { validate } from '../../src/validators/index.js';

describe('MicroUSDC', () => {
  describe('Constructor (microUSDC)', () => {
    it('accepts zero', () => {
      expect(microUSDC(0n)).toBe(0n);
    });

    it('accepts positive values', () => {
      expect(microUSDC(1000000n)).toBe(1000000n);
    });

    it('throws RangeError for negative values', () => {
      expect(() => microUSDC(-1n)).toThrow(RangeError);
      expect(() => microUSDC(-1n)).toThrow('non-negative');
    });

    it('accepts large values (1M USDC)', () => {
      const oneMillion = 1_000_000_000_000n; // 1M USDC in micro-units
      expect(microUSDC(oneMillion)).toBe(oneMillion);
    });
  });

  describe('Reader (readMicroUSDC)', () => {
    it('reads valid bigint', () => {
      expect(readMicroUSDC(42n)).toBe(42n);
    });

    it('reads valid string', () => {
      expect(readMicroUSDC('1000000')).toBe(1000000n);
    });

    it('returns undefined for negative bigint', () => {
      expect(readMicroUSDC(-1n)).toBeUndefined();
    });

    it('returns undefined for non-numeric string', () => {
      expect(readMicroUSDC('abc')).toBeUndefined();
    });

    it('returns undefined for negative string', () => {
      expect(readMicroUSDC('-100')).toBeUndefined();
    });

    it('returns undefined for null', () => {
      expect(readMicroUSDC(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(readMicroUSDC(undefined)).toBeUndefined();
    });

    it('returns undefined for number (not bigint)', () => {
      expect(readMicroUSDC(42)).toBeUndefined();
    });
  });

  describe('Serialization', () => {
    it('serializes to string', () => {
      expect(serializeMicroUSDC(microUSDC(42n))).toBe('42');
    });

    it('serializes zero', () => {
      expect(serializeMicroUSDC(microUSDC(0n))).toBe('0');
    });

    it('deserializes from string', () => {
      expect(deserializeMicroUSDC('1000000')).toBe(1000000n);
    });

    it('round-trips correctly', () => {
      const original = microUSDC(1234567n);
      expect(deserializeMicroUSDC(serializeMicroUSDC(original))).toBe(original);
    });

    it('rejects non-numeric string', () => {
      expect(() => deserializeMicroUSDC('abc')).toThrow(RangeError);
    });

    it('rejects negative string', () => {
      expect(() => deserializeMicroUSDC('-1')).toThrow(RangeError);
    });

    it('rejects empty string', () => {
      expect(() => deserializeMicroUSDC('')).toThrow(RangeError);
    });

    it('rejects decimal string', () => {
      expect(() => deserializeMicroUSDC('1.5')).toThrow(RangeError);
    });
  });

  describe('Conversion', () => {
    it('microUSDToUSDC preserves numeric value', () => {
      const usd = microUSD(5000000n);
      const usdc = microUSDToUSDC(usd);
      expect(usdc).toBe(5000000n);
    });

    it('microUSDCToUSD preserves numeric value', () => {
      const usdc = microUSDC(5000000n);
      const usd = microUSDCToUSD(usdc);
      expect(usd).toBe(5000000n);
    });

    it('round-trip conversion preserves value', () => {
      const original = microUSD(1234567n);
      const usdc = microUSDToUSDC(original);
      const backToUsd = microUSDCToUSD(usdc);
      expect(backToUsd).toBe(original);
    });
  });

  describe('Wire Schema (MicroUSDCSchema)', () => {
    it('validates positive integer strings', () => {
      expect(validate(MicroUSDCSchema, '1000000').valid).toBe(true);
    });

    it('validates zero string', () => {
      expect(validate(MicroUSDCSchema, '0').valid).toBe(true);
    });

    it('rejects negative strings', () => {
      expect(validate(MicroUSDCSchema, '-1').valid).toBe(false);
    });

    it('rejects decimal strings', () => {
      expect(validate(MicroUSDCSchema, '1.5').valid).toBe(false);
    });

    it('rejects non-numeric strings', () => {
      expect(validate(MicroUSDCSchema, 'abc').valid).toBe(false);
    });
  });

  describe('Property-based tests', () => {
    const arbMicroUSDC = fc.bigInt({ min: 0n, max: 10n ** 15n }).map(v => microUSDC(v));

    it('serialization round-trip', () => {
      fc.assert(
        fc.property(arbMicroUSDC, (v) => {
          expect(deserializeMicroUSDC(serializeMicroUSDC(v))).toBe(v);
        }),
      );
    });

    it('reader accepts all valid bigint values', () => {
      fc.assert(
        fc.property(arbMicroUSDC, (v) => {
          expect(readMicroUSDC(v)).toBe(v);
        }),
      );
    });

    it('conversion round-trip preserves value', () => {
      fc.assert(
        fc.property(arbMicroUSDC, (v) => {
          const asUSD = microUSDCToUSD(v);
          const backToUSDC = microUSDToUSDC(asUSD);
          expect(backToUSDC).toBe(v);
        }),
      );
    });
  });
});
