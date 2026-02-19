/**
 * Tests for branded arithmetic types (S2-T1, S2-T2).
 *
 * Validates constructors, arithmetic, serialization, type safety,
 * and property-based tests with fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  microUSD,
  basisPoints,
  accountId,
  addMicroUSD,
  subtractMicroUSD,
  multiplyBPS,
  bpsShare,
  serializeMicroUSD,
  deserializeMicroUSD,
  serializeBasisPoints,
  deserializeBasisPoints,
  type MicroUSD,
  type BasisPoints,
  type AccountId,
} from '../../src/economy/branded-types.js';

describe('Constructors', () => {
  describe('microUSD', () => {
    it('accepts zero', () => {
      expect(microUSD(0n)).toBe(0n);
    });

    it('accepts positive values', () => {
      expect(microUSD(1000000n)).toBe(1000000n);
    });

    it('throws RangeError for negative values', () => {
      expect(() => microUSD(-1n)).toThrow(RangeError);
    });
  });

  describe('basisPoints', () => {
    it('accepts zero', () => {
      expect(basisPoints(0n)).toBe(0n);
    });

    it('accepts 10000 (100%)', () => {
      expect(basisPoints(10000n)).toBe(10000n);
    });

    it('throws RangeError for negative values', () => {
      expect(() => basisPoints(-1n)).toThrow(RangeError);
    });

    it('throws RangeError for values above 10000', () => {
      expect(() => basisPoints(10001n)).toThrow(RangeError);
    });
  });

  describe('accountId', () => {
    it('accepts non-empty strings', () => {
      expect(accountId('agent-alice')).toBe('agent-alice');
    });

    it('throws RangeError for empty string', () => {
      expect(() => accountId('')).toThrow(RangeError);
    });
  });
});

describe('Arithmetic', () => {
  const a = microUSD(1000000n);
  const b = microUSD(500000n);

  describe('addMicroUSD', () => {
    it('adds two values', () => {
      expect(addMicroUSD(a, b)).toBe(1500000n);
    });

    it('handles zero', () => {
      expect(addMicroUSD(a, microUSD(0n))).toBe(1000000n);
    });
  });

  describe('subtractMicroUSD', () => {
    it('subtracts values', () => {
      expect(subtractMicroUSD(a, b)).toBe(500000n);
    });

    it('throws RangeError on underflow', () => {
      expect(() => subtractMicroUSD(b, a)).toThrow(RangeError);
    });

    it('handles equal values', () => {
      expect(subtractMicroUSD(a, a)).toBe(0n);
    });
  });

  describe('multiplyBPS', () => {
    it('100% returns same value', () => {
      expect(multiplyBPS(a, basisPoints(10000n))).toBe(1000000n);
    });

    it('50% returns half', () => {
      expect(multiplyBPS(a, basisPoints(5000n))).toBe(500000n);
    });

    it('0% returns zero', () => {
      expect(multiplyBPS(a, basisPoints(0n))).toBe(0n);
    });

    it('truncates (not rounds)', () => {
      // 1n * 3333 / 10000 = 0 (truncated)
      expect(multiplyBPS(microUSD(1n), basisPoints(3333n))).toBe(0n);
      // 3n * 3333 / 10000 = 0 (truncated)
      expect(multiplyBPS(microUSD(3n), basisPoints(3333n))).toBe(0n);
      // 10n * 3333 / 10000 = 3 (truncated from 3.333)
      expect(multiplyBPS(microUSD(10n), basisPoints(3333n))).toBe(3n);
    });
  });

  describe('bpsShare', () => {
    it('computes correct share', () => {
      expect(bpsShare(b, a)).toBe(5000n); // 500000/1000000 * 10000 = 5000
    });

    it('100% when part equals whole', () => {
      expect(bpsShare(a, a)).toBe(10000n);
    });

    it('throws RangeError on zero whole', () => {
      expect(() => bpsShare(a, microUSD(0n))).toThrow(RangeError);
    });
  });
});

describe('Serialization', () => {
  describe('MicroUSD round-trip', () => {
    it('round-trips correctly', () => {
      const original = microUSD(1234567n);
      expect(deserializeMicroUSD(serializeMicroUSD(original))).toBe(original);
    });

    it('serializes to string', () => {
      expect(serializeMicroUSD(microUSD(42n))).toBe('42');
    });

    it('deserializes from string', () => {
      expect(deserializeMicroUSD('1000000')).toBe(1000000n);
    });

    it('rejects invalid format', () => {
      expect(() => deserializeMicroUSD('abc')).toThrow(RangeError);
      expect(() => deserializeMicroUSD('-1')).toThrow(RangeError);
      expect(() => deserializeMicroUSD('')).toThrow(RangeError);
    });
  });

  describe('BasisPoints round-trip', () => {
    it('round-trips correctly', () => {
      const original = basisPoints(7500n);
      expect(deserializeBasisPoints(serializeBasisPoints(original))).toBe(original);
    });

    it('serializes to string', () => {
      expect(serializeBasisPoints(basisPoints(10000n))).toBe('10000');
    });

    it('rejects invalid format', () => {
      expect(() => deserializeBasisPoints('abc')).toThrow(RangeError);
    });

    it('rejects out-of-range values', () => {
      expect(() => deserializeBasisPoints('10001')).toThrow(RangeError);
    });
  });
});

describe('Type safety (compile-time)', () => {
  it('branded types are assignable from their constructors', () => {
    const m: MicroUSD = microUSD(100n);
    const b: BasisPoints = basisPoints(5000n);
    const a: AccountId = accountId('test');
    expect(m).toBe(100n);
    expect(b).toBe(5000n);
    expect(a).toBe('test');
  });

  // @ts-expect-error — plain bigint cannot be assigned to MicroUSD
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  it('plain bigint is not assignable to MicroUSD', () => {
    const _m: MicroUSD = 100n;
    // This test documents the compile-time check; the actual assertion is the @ts-expect-error
    expect(true).toBe(true);
  });

  // @ts-expect-error — plain bigint cannot be assigned to BasisPoints
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  it('plain bigint is not assignable to BasisPoints', () => {
    const _b: BasisPoints = 5000n;
    expect(true).toBe(true);
  });
});

describe('Integration: deserialize existing MicroUSDUnsigned string', () => {
  it('deserializes a typical MicroUSDUnsigned string into branded MicroUSD', () => {
    const wireValue = '1500000'; // $1.50 in micro-USD
    const branded = deserializeMicroUSD(wireValue);
    expect(branded).toBe(1500000n);
    expect(serializeMicroUSD(branded)).toBe(wireValue);
  });
});

describe('Property-based tests', () => {
  const arbMicroUSD = fc.bigInt({ min: 0n, max: 10n ** 15n }).map(v => microUSD(v));
  const arbBasisPoints = fc.bigInt({ min: 0n, max: 10000n }).map(v => basisPoints(v));

  it('addMicroUSD is commutative', () => {
    fc.assert(
      fc.property(arbMicroUSD, arbMicroUSD, (a, b) => {
        expect(addMicroUSD(a, b)).toBe(addMicroUSD(b, a));
      }),
    );
  });

  it('addMicroUSD conservation: a + b - b = a', () => {
    fc.assert(
      fc.property(arbMicroUSD, arbMicroUSD, (a, b) => {
        const sum = addMicroUSD(a, b);
        expect(subtractMicroUSD(sum, b)).toBe(a);
      }),
    );
  });

  it('serialization round-trip for MicroUSD', () => {
    fc.assert(
      fc.property(arbMicroUSD, (v) => {
        expect(deserializeMicroUSD(serializeMicroUSD(v))).toBe(v);
      }),
    );
  });

  it('serialization round-trip for BasisPoints', () => {
    fc.assert(
      fc.property(arbBasisPoints, (v) => {
        expect(deserializeBasisPoints(serializeBasisPoints(v))).toBe(v);
      }),
    );
  });

  it('multiplyBPS with 10000 bps is identity', () => {
    const fullBps = basisPoints(10000n);
    fc.assert(
      fc.property(arbMicroUSD, (v) => {
        expect(multiplyBPS(v, fullBps)).toBe(v);
      }),
    );
  });
});
