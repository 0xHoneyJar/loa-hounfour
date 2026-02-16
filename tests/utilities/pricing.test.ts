/**
 * Tests for computeCostMicro() and verifyPricingConservation().
 *
 * SDD §4.1 — BigInt arithmetic, ceil rounding, zero handling.
 * SDD §4.2 — Conservation invariant.
 * IMP-004 — Error contracts: TypeError for invalid inputs.
 */
import { describe, it, expect } from 'vitest';
import {
  computeCostMicro,
  computeCostMicroSafe,
  verifyPricingConservation,
  parseMicroUSD,
  type PricingInput,
  type UsageInput,
} from '../../src/utilities/pricing.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GPT4_PRICING: PricingInput = {
  input_per_million_micro: '30000000',    // $30/M tokens
  output_per_million_micro: '60000000',   // $60/M tokens
};

const CLAUDE_PRICING: PricingInput = {
  input_per_million_micro: '15000000',    // $15/M tokens
  output_per_million_micro: '75000000',   // $75/M tokens
};

const THINKING_PRICING: PricingInput = {
  input_per_million_micro: '15000000',
  output_per_million_micro: '75000000',
  thinking_per_million_micro: '15000000', // thinking same as input
};

// ---------------------------------------------------------------------------
// computeCostMicro — basic cases
// ---------------------------------------------------------------------------

describe('computeCostMicro', () => {
  describe('basic calculations', () => {
    it('computes GPT-4 standard pricing (1000 input, 500 output)', () => {
      // 1000 * 30000000 / 1000000 = 30000
      // 500 * 60000000 / 1000000 = 30000
      // total = 60000
      expect(computeCostMicro(GPT4_PRICING, { prompt_tokens: 1000, completion_tokens: 500 }))
        .toBe('60000');
    });

    it('computes Claude pricing (2000 input, 800 output)', () => {
      // 2000 * 15000000 / 1000000 = 30000
      // 800 * 75000000 / 1000000 = 60000
      // total = 90000
      expect(computeCostMicro(CLAUDE_PRICING, { prompt_tokens: 2000, completion_tokens: 800 }))
        .toBe('90000');
    });

    it('includes thinking tokens when present', () => {
      const usage: UsageInput = {
        prompt_tokens: 100,
        completion_tokens: 50,
        reasoning_tokens: 200,
      };
      // 100*15000000 + 50*75000000 + 200*15000000 = 1500000000 + 3750000000 + 3000000000 = 8250000000
      // ceil(8250000000 / 1000000) = 8250
      expect(computeCostMicro(THINKING_PRICING, usage)).toBe('8250');
    });
  });

  // ---------------------------------------------------------------------------
  // Zero handling
  // ---------------------------------------------------------------------------

  describe('zero handling', () => {
    it('returns "0" for zero tokens', () => {
      expect(computeCostMicro(GPT4_PRICING, { prompt_tokens: 0, completion_tokens: 0 }))
        .toBe('0');
    });

    it('returns "0" for zero pricing rates', () => {
      const zeroPricing: PricingInput = {
        input_per_million_micro: '0',
        output_per_million_micro: '0',
      };
      expect(computeCostMicro(zeroPricing, { prompt_tokens: 1000, completion_tokens: 500 }))
        .toBe('0');
    });

    it('handles one-sided zero (output only)', () => {
      expect(computeCostMicro(GPT4_PRICING, { prompt_tokens: 0, completion_tokens: 100 }))
        .toBe('6000');
    });
  });

  // ---------------------------------------------------------------------------
  // Ceil rounding
  // ---------------------------------------------------------------------------

  describe('ceil rounding', () => {
    it('rounds up sub-micro fractions', () => {
      // 1 token * 30000000 / 1000000 = 30 (exact)
      expect(computeCostMicro(GPT4_PRICING, { prompt_tokens: 1, completion_tokens: 0 }))
        .toBe('30');
    });

    it('ceil-rounds when not exact division', () => {
      const pricing: PricingInput = {
        input_per_million_micro: '1',  // 1 micro per million tokens
        output_per_million_micro: '0',
      };
      // 1 * 1 = 1. ceil(1/1000000) = 1 (ceil division rounds up)
      expect(computeCostMicro(pricing, { prompt_tokens: 1, completion_tokens: 0 }))
        .toBe('1');
    });

    it('exact division does not round', () => {
      // 1000000 tokens * 1 micro / 1000000 = 1 (exact)
      const pricing: PricingInput = {
        input_per_million_micro: '1',
        output_per_million_micro: '0',
      };
      expect(computeCostMicro(pricing, { prompt_tokens: 1000000, completion_tokens: 0 }))
        .toBe('1');
    });
  });

  // ---------------------------------------------------------------------------
  // BigInt boundary tests
  // ---------------------------------------------------------------------------

  describe('BigInt boundaries', () => {
    it('handles MAX_SAFE_INTEGER tokens', () => {
      const pricing: PricingInput = {
        input_per_million_micro: '30000000',
        output_per_million_micro: '0',
      };
      const result = computeCostMicro(pricing, {
        prompt_tokens: Number.MAX_SAFE_INTEGER,
        completion_tokens: 0,
      });
      // 9007199254740991 * 30000000 / 1000000 = 270215977642229730
      expect(result).toBe('270215977642229730');
    });

    it('handles large pricing rates', () => {
      const expensivePricing: PricingInput = {
        input_per_million_micro: '999999999999',
        output_per_million_micro: '0',
      };
      const result = computeCostMicro(expensivePricing, { prompt_tokens: 1000, completion_tokens: 0 });
      // 1000 * 999999999999 = 999999999999000, ceil(999999999999000/1000000) = 1000000000 (ceil rounds up from 999999.999999)
      expect(result).toBe('1000000000');
    });
  });

  // ---------------------------------------------------------------------------
  // Property-based tests
  // ---------------------------------------------------------------------------

  describe('properties', () => {
    it('monotonicity: more tokens → more cost', () => {
      const cost1 = computeCostMicro(GPT4_PRICING, { prompt_tokens: 100, completion_tokens: 50 });
      const cost2 = computeCostMicro(GPT4_PRICING, { prompt_tokens: 200, completion_tokens: 50 });
      expect(BigInt(cost2)).toBeGreaterThan(BigInt(cost1));
    });

    it('zero identity: zero pricing + any tokens = 0', () => {
      const zeroPricing: PricingInput = {
        input_per_million_micro: '0',
        output_per_million_micro: '0',
      };
      expect(computeCostMicro(zeroPricing, { prompt_tokens: 999999, completion_tokens: 999999 }))
        .toBe('0');
    });

    it('commutativity: input/output symmetric rates yield same cost when swapped', () => {
      const symmetricPricing: PricingInput = {
        input_per_million_micro: '10000000',
        output_per_million_micro: '10000000',
      };
      const cost1 = computeCostMicro(symmetricPricing, { prompt_tokens: 100, completion_tokens: 200 });
      const cost2 = computeCostMicro(symmetricPricing, { prompt_tokens: 200, completion_tokens: 100 });
      expect(cost1).toBe(cost2);
    });

    it('ceil guarantee: computed cost * MILLION >= raw numerator', () => {
      const cost = computeCostMicro(GPT4_PRICING, { prompt_tokens: 7, completion_tokens: 3 });
      // 7 * 30000000 + 3 * 60000000 = 210000000 + 180000000 = 390000000
      // ceil(390000000/1000000) = 390
      const costBig = BigInt(cost) * 1000000n;
      expect(costBig).toBeGreaterThanOrEqual(390000000n);
    });
  });

  // ---------------------------------------------------------------------------
  // Error contracts (IMP-004)
  // ---------------------------------------------------------------------------

  describe('error contracts', () => {
    it('throws TypeError for non-numeric pricing string', () => {
      const bad: PricingInput = {
        input_per_million_micro: 'abc',
        output_per_million_micro: '0',
      };
      expect(() => computeCostMicro(bad, { prompt_tokens: 1, completion_tokens: 0 }))
        .toThrow(TypeError);
    });

    it('throws TypeError for negative pricing string', () => {
      const bad: PricingInput = {
        input_per_million_micro: '-100',
        output_per_million_micro: '0',
      };
      expect(() => computeCostMicro(bad, { prompt_tokens: 1, completion_tokens: 0 }))
        .toThrow(TypeError);
    });

    it('throws TypeError for negative tokens', () => {
      expect(() => computeCostMicro(GPT4_PRICING, { prompt_tokens: -1, completion_tokens: 0 }))
        .toThrow(TypeError);
    });

    it('throws TypeError for NaN tokens', () => {
      expect(() => computeCostMicro(GPT4_PRICING, { prompt_tokens: NaN, completion_tokens: 0 }))
        .toThrow(TypeError);
    });

    it('throws TypeError for non-integer tokens', () => {
      expect(() => computeCostMicro(GPT4_PRICING, { prompt_tokens: 1.5, completion_tokens: 0 }))
        .toThrow(TypeError);
    });

    it('throws TypeError for empty pricing string', () => {
      const bad: PricingInput = {
        input_per_million_micro: '',
        output_per_million_micro: '0',
      };
      expect(() => computeCostMicro(bad, { prompt_tokens: 1, completion_tokens: 0 }))
        .toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // computeCostMicroSafe
  // ---------------------------------------------------------------------------

  describe('computeCostMicroSafe', () => {
    it('returns ok: true with valid inputs', () => {
      const result = computeCostMicroSafe(GPT4_PRICING, { prompt_tokens: 100, completion_tokens: 50 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        // 100*30000000 + 50*60000000 = 3000000000 + 3000000000 = 6000000000, /1000000 = 6000
        expect(result.cost).toBe('6000');
      }
    });

    it('returns ok: false with invalid inputs', () => {
      const bad: PricingInput = {
        input_per_million_micro: 'invalid',
        output_per_million_micro: '0',
      };
      const result = computeCostMicroSafe(bad, { prompt_tokens: 1, completion_tokens: 0 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Invalid pricing string');
      }
    });

    it('never throws', () => {
      const badCases: Array<[PricingInput, UsageInput]> = [
        [{ input_per_million_micro: 'abc', output_per_million_micro: '0' }, { prompt_tokens: 1, completion_tokens: 0 }],
        [GPT4_PRICING, { prompt_tokens: -1, completion_tokens: 0 }],
        [GPT4_PRICING, { prompt_tokens: NaN, completion_tokens: 0 }],
      ];
      for (const [pricing, usage] of badCases) {
        const result = computeCostMicroSafe(pricing, usage);
        expect(result.ok).toBe(false);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// verifyPricingConservation
// ---------------------------------------------------------------------------

describe('verifyPricingConservation', () => {
  it('returns conserved: true when cost matches computed', () => {
    const computed = computeCostMicro(GPT4_PRICING, { prompt_tokens: 1000, completion_tokens: 500 });
    const result = verifyPricingConservation(
      { cost_micro: computed, pricing_snapshot: GPT4_PRICING },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.conserved).toBe(true);
    expect(result.delta).toBe('0');
    expect(result.computed).toBe(computed);
  });

  it('returns conserved: false when cost differs', () => {
    const result = verifyPricingConservation(
      { cost_micro: '99999', pricing_snapshot: GPT4_PRICING },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.conserved).toBe(false);
    expect(result.delta).not.toBe('0');
  });

  it('calculates correct delta', () => {
    // computed = 60000
    const result = verifyPricingConservation(
      { cost_micro: '60100', pricing_snapshot: GPT4_PRICING },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.delta).toBe('100');
    expect(result.computed).toBe('60000');
  });

  it('returns conserved: false when no pricing_snapshot', () => {
    const result = verifyPricingConservation(
      { cost_micro: '60000' },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.conserved).toBe(false);
    expect(result.status).toBe('unverifiable');
    expect(result.reason).toContain('Missing pricing_snapshot');
  });

  it('handles negative delta (billing less than computed)', () => {
    const result = verifyPricingConservation(
      { cost_micro: '50000', pricing_snapshot: GPT4_PRICING },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.conserved).toBe(false);
    expect(result.delta).toBe('-10000');
  });

  it('works with thinking tokens', () => {
    const usage: UsageInput = {
      prompt_tokens: 100,
      completion_tokens: 50,
      reasoning_tokens: 200,
    };
    const computed = computeCostMicro(THINKING_PRICING, usage);
    const result = verifyPricingConservation(
      { cost_micro: computed, pricing_snapshot: THINKING_PRICING },
      usage,
    );
    expect(result.conserved).toBe(true);
  });

  it('works with zero cost', () => {
    const result = verifyPricingConservation(
      { cost_micro: '0', pricing_snapshot: GPT4_PRICING },
      { prompt_tokens: 0, completion_tokens: 0 },
    );
    expect(result.conserved).toBe(true);
    expect(result.delta).toBe('0');
    expect(result.status).toBe('conserved');
  });

  // v5.2.0 — Tristate ConservationResult tests
  describe('tristate status (v5.2.0)', () => {
    it('returns status: "conserved" when delta is zero', () => {
      const computed = computeCostMicro(GPT4_PRICING, { prompt_tokens: 1000, completion_tokens: 500 });
      const result = verifyPricingConservation(
        { cost_micro: computed, pricing_snapshot: GPT4_PRICING },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );
      expect(result.status).toBe('conserved');
      expect(result.conserved).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns status: "violated" when delta is non-zero', () => {
      const result = verifyPricingConservation(
        { cost_micro: '99999', pricing_snapshot: GPT4_PRICING },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );
      expect(result.status).toBe('violated');
      expect(result.conserved).toBe(false);
      expect(result.reason).toContain('Billing delta');
    });

    it('returns status: "unverifiable" when pricing_snapshot missing', () => {
      const result = verifyPricingConservation(
        { cost_micro: '60000' },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );
      expect(result.status).toBe('unverifiable');
      expect(result.conserved).toBe(false);
      expect(result.reason).toContain('Missing pricing_snapshot');
    });

    it('violated reason includes billing and computed amounts', () => {
      const result = verifyPricingConservation(
        { cost_micro: '60100', pricing_snapshot: GPT4_PRICING },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );
      expect(result.reason).toContain('billed=60100');
      expect(result.reason).toContain('computed=60000');
    });

    it('conserved result has no reason field', () => {
      const computed = computeCostMicro(CLAUDE_PRICING, { prompt_tokens: 2000, completion_tokens: 800 });
      const result = verifyPricingConservation(
        { cost_micro: computed, pricing_snapshot: CLAUDE_PRICING },
        { prompt_tokens: 2000, completion_tokens: 800 },
      );
      expect(result.status).toBe('conserved');
      expect(result.reason).toBeUndefined();
    });

    it('violated with negative delta includes reason', () => {
      const result = verifyPricingConservation(
        { cost_micro: '50000', pricing_snapshot: GPT4_PRICING },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );
      expect(result.status).toBe('violated');
      expect(result.reason).toBeDefined();
    });

    it('backward compat: conserved boolean matches status', () => {
      const computed = computeCostMicro(GPT4_PRICING, { prompt_tokens: 100, completion_tokens: 50 });
      const conservedResult = verifyPricingConservation(
        { cost_micro: computed, pricing_snapshot: GPT4_PRICING },
        { prompt_tokens: 100, completion_tokens: 50 },
      );
      expect(conservedResult.conserved).toBe(true);
      expect(conservedResult.status).toBe('conserved');

      const violatedResult = verifyPricingConservation(
        { cost_micro: '999', pricing_snapshot: GPT4_PRICING },
        { prompt_tokens: 100, completion_tokens: 50 },
      );
      expect(violatedResult.conserved).toBe(false);
      expect(violatedResult.status).toBe('violated');
    });

    it('zero delta with thinking tokens returns conserved', () => {
      const usage: UsageInput = {
        prompt_tokens: 500,
        completion_tokens: 200,
        reasoning_tokens: 100,
      };
      const computed = computeCostMicro(THINKING_PRICING, usage);
      const result = verifyPricingConservation(
        { cost_micro: computed, pricing_snapshot: THINKING_PRICING },
        usage,
      );
      expect(result.status).toBe('conserved');
    });

    it('unverifiable result has zero delta and computed', () => {
      const result = verifyPricingConservation(
        { cost_micro: '100000' },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );
      expect(result.status).toBe('unverifiable');
      expect(result.delta).toBe('0');
      expect(result.computed).toBe('0');
    });
  });
});

// ---------------------------------------------------------------------------
// parseMicroUSD (exported for reservation utilities, v5.2.0)
// ---------------------------------------------------------------------------

describe('parseMicroUSD', () => {
  it('parses positive integer string', () => {
    expect(parseMicroUSD('1000000')).toBe(1000000n);
  });

  it('parses negative integer string', () => {
    expect(parseMicroUSD('-500')).toBe(-500n);
  });

  it('parses zero', () => {
    expect(parseMicroUSD('0')).toBe(0n);
  });

  it('throws TypeError for non-numeric string', () => {
    expect(() => parseMicroUSD('abc')).toThrow(TypeError);
  });

  it('throws TypeError for empty string', () => {
    expect(() => parseMicroUSD('')).toThrow(TypeError);
  });

  it('throws TypeError for decimal string', () => {
    expect(() => parseMicroUSD('1.5')).toThrow(TypeError);
  });

  it('throws TypeError for string with spaces', () => {
    expect(() => parseMicroUSD(' 100 ')).toThrow(TypeError);
  });
});
