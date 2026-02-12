/**
 * Budget golden vector test runner.
 *
 * Validates 56 cross-language test vectors covering:
 * - basic-pricing: core formula + remainder accumulation
 * - streaming-cancel: partial response billing
 * - extreme-tokens: numeric boundaries + overflow + BigInt + serialization
 * - price-change-boundary: price table versioning
 * - provider-correction: reconciliation adjustments
 *
 * Formula: cost_micro = floor(tokens * price_micro_per_million / 1_000_000)
 *
 * @see SDD 4.3 — Integer Budget System
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Reference implementation (mirrors src/hounfour/pricing.ts) ──────────

function calculateCostMicro(
  tokens: number,
  priceMicroPerMillion: number,
): { cost_micro: number; remainder_micro: number } {
  const product = tokens * priceMicroPerMillion;
  if (product > Number.MAX_SAFE_INTEGER) {
    throw new Error(`BUDGET_OVERFLOW: tokens(${tokens}) * price(${priceMicroPerMillion}) exceeds MAX_SAFE_INTEGER`);
  }
  return {
    cost_micro: Math.floor(product / 1_000_000),
    remainder_micro: product % 1_000_000,
  };
}

function calculateCostMicroBigInt(
  tokens: bigint,
  priceMicroPerMillion: bigint,
): { cost_micro: bigint; remainder_micro: bigint } {
  const product = tokens * priceMicroPerMillion;
  return {
    cost_micro: product / 1_000_000n,
    remainder_micro: product % 1_000_000n,
  };
}

class RemainderAccumulator {
  private remainders = new Map<string, number>();

  carry(scopeKey: string, remainderMicro: number): number {
    const current = this.remainders.get(scopeKey) ?? 0;
    const total = current + remainderMicro;
    const extra = Math.floor(total / 1_000_000);
    this.remainders.set(scopeKey, total % 1_000_000);
    return extra;
  }

  get(scopeKey: string): number {
    return this.remainders.get(scopeKey) ?? 0;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

const VECTORS_DIR = join(__dirname, '../../vectors/budget');

function loadVectors(filename: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Budget Golden Vectors', () => {
  // ── basic-pricing.json ──────────────────────────────────────────────

  describe('basic-pricing: single cost', () => {
    const data = loadVectors('basic-pricing.json') as {
      single_cost_vectors: Array<{
        id: string; tokens: number; price_micro_per_million: number;
        expected_cost_micro: number; expected_remainder_micro: number; note: string;
      }>;
    };

    for (const v of data.single_cost_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        const result = calculateCostMicro(v.tokens, v.price_micro_per_million);
        expect(result.cost_micro).toBe(v.expected_cost_micro);
        expect(result.remainder_micro).toBe(v.expected_remainder_micro);
      });
    }
  });

  describe('basic-pricing: total cost', () => {
    const data = loadVectors('basic-pricing.json') as {
      total_cost_vectors: Array<{
        id: string; note: string;
        input: {
          prompt_tokens: number; completion_tokens: number; reasoning_tokens: number;
          pricing: { input_micro_per_million: number; output_micro_per_million: number; reasoning_micro_per_million?: number };
        };
        expected: {
          input_cost_micro: number; output_cost_micro: number;
          reasoning_cost_micro: number; total_cost_micro: number;
        };
      }>;
    };

    for (const v of data.total_cost_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        const input = calculateCostMicro(v.input.prompt_tokens, v.input.pricing.input_micro_per_million);
        const output = calculateCostMicro(v.input.completion_tokens, v.input.pricing.output_micro_per_million);
        const reasoning = v.input.pricing.reasoning_micro_per_million
          ? calculateCostMicro(v.input.reasoning_tokens, v.input.pricing.reasoning_micro_per_million)
          : { cost_micro: 0, remainder_micro: 0 };

        expect(input.cost_micro).toBe(v.expected.input_cost_micro);
        expect(output.cost_micro).toBe(v.expected.output_cost_micro);
        expect(reasoning.cost_micro).toBe(v.expected.reasoning_cost_micro);
        expect(input.cost_micro + output.cost_micro + reasoning.cost_micro).toBe(v.expected.total_cost_micro);
      });
    }
  });

  describe('basic-pricing: remainder accumulator sequences', () => {
    const data = loadVectors('basic-pricing.json') as {
      remainder_accumulator_sequences: Array<{
        id: string; note: string; scope_key: string;
        steps: Array<{
          tokens: number; price_micro_per_million: number;
          expected_carry: number; expected_accumulated: number;
        }>;
      }>;
    };

    for (const seq of data.remainder_accumulator_sequences) {
      it(`${seq.id}: ${seq.note}`, () => {
        const acc = new RemainderAccumulator();
        for (const step of seq.steps) {
          const { remainder_micro } = calculateCostMicro(step.tokens, step.price_micro_per_million);
          const carry = acc.carry(seq.scope_key, remainder_micro);
          expect(carry).toBe(step.expected_carry);
          expect(acc.get(seq.scope_key)).toBe(step.expected_accumulated);
        }
      });
    }
  });

  // ── streaming-cancel.json ───────────────────────────────────────────

  describe('streaming-cancel: total cost', () => {
    const data = loadVectors('streaming-cancel.json') as {
      total_cost_vectors: Array<{
        id: string; note: string;
        input: {
          prompt_tokens: number; completion_tokens: number; reasoning_tokens: number;
          pricing: { input_micro_per_million: number; output_micro_per_million: number; reasoning_micro_per_million?: number };
          billing_method: string;
        };
        expected: {
          input_cost_micro: number; output_cost_micro: number;
          reasoning_cost_micro: number; total_cost_micro: number;
          input_remainder_micro?: number;
        };
      }>;
    };

    for (const v of data.total_cost_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        const input = calculateCostMicro(v.input.prompt_tokens, v.input.pricing.input_micro_per_million);
        const output = calculateCostMicro(v.input.completion_tokens, v.input.pricing.output_micro_per_million);
        const reasoning = v.input.pricing.reasoning_micro_per_million
          ? calculateCostMicro(v.input.reasoning_tokens, v.input.pricing.reasoning_micro_per_million)
          : { cost_micro: 0, remainder_micro: 0 };

        expect(input.cost_micro).toBe(v.expected.input_cost_micro);
        expect(output.cost_micro).toBe(v.expected.output_cost_micro);
        expect(reasoning.cost_micro).toBe(v.expected.reasoning_cost_micro);
        expect(input.cost_micro + output.cost_micro + reasoning.cost_micro).toBe(v.expected.total_cost_micro);

        if (v.expected.input_remainder_micro !== undefined) {
          expect(input.remainder_micro).toBe(v.expected.input_remainder_micro);
        }
      });
    }
  });

  // ── extreme-tokens.json ─────────────────────────────────────────────

  describe('extreme-tokens: safe boundary values', () => {
    const data = loadVectors('extreme-tokens.json') as {
      single_cost_vectors: Array<{
        id: string; tokens: number; price_micro_per_million: number;
        expected_cost_micro: number; expected_remainder_micro: number; note: string;
      }>;
    };

    for (const v of data.single_cost_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        const result = calculateCostMicro(v.tokens, v.price_micro_per_million);
        expect(result.cost_micro).toBe(v.expected_cost_micro);
        expect(result.remainder_micro).toBe(v.expected_remainder_micro);
      });
    }
  });

  describe('extreme-tokens: overflow detection', () => {
    const data = loadVectors('extreme-tokens.json') as {
      overflow_vectors: Array<{
        id: string; tokens: number; price_micro_per_million: number;
        expected_error: string; note: string;
      }>;
    };

    for (const v of data.overflow_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        expect(() => calculateCostMicro(v.tokens, v.price_micro_per_million))
          .toThrow(/BUDGET_OVERFLOW/);
      });
    }
  });

  describe('extreme-tokens: BigInt calculations', () => {
    const data = loadVectors('extreme-tokens.json') as {
      bigint_vectors: Array<{
        id: string; tokens: string; price_micro_per_million: string;
        expected_cost_micro: string; expected_remainder_micro: string; note: string;
      }>;
    };

    for (const v of data.bigint_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        const result = calculateCostMicroBigInt(
          BigInt(v.tokens),
          BigInt(v.price_micro_per_million),
        );
        expect(result.cost_micro).toBe(BigInt(v.expected_cost_micro));
        expect(result.remainder_micro).toBe(BigInt(v.expected_remainder_micro));
      });
    }
  });

  describe('extreme-tokens: string serialization roundtrip', () => {
    const data = loadVectors('extreme-tokens.json') as {
      serialization_vectors: Array<{
        id: string; micro_usd_string: string; note: string;
      }>;
    };

    for (const v of data.serialization_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        // Parse as BigInt
        const parsed = BigInt(v.micro_usd_string);
        // Serialize back to string
        const serialized = parsed.toString();
        // Roundtrip must be exact
        expect(serialized).toBe(v.micro_usd_string);
        // String must match micro-USD pattern
        expect(v.micro_usd_string).toMatch(/^[0-9]+$/);
      });
    }
  });

  // ── price-change-boundary.json ──────────────────────────────────────

  describe('price-change-boundary: price comparison', () => {
    const data = loadVectors('price-change-boundary.json') as {
      price_comparison_vectors: Array<{
        id: string; note: string; tokens: number;
        old_price: { version: number; micro_per_million: number };
        new_price: { version: number; micro_per_million: number };
        expected_old_cost_micro: number; expected_new_cost_micro: number;
      }>;
    };

    for (const v of data.price_comparison_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        const oldResult = calculateCostMicro(v.tokens, v.old_price.micro_per_million);
        const newResult = calculateCostMicro(v.tokens, v.new_price.micro_per_million);
        expect(oldResult.cost_micro).toBe(v.expected_old_cost_micro);
        expect(newResult.cost_micro).toBe(v.expected_new_cost_micro);
        // Version monotonicity
        expect(v.new_price.version).toBeGreaterThan(v.old_price.version);
      });
    }
  });

  describe('price-change-boundary: total cost comparison', () => {
    const data = loadVectors('price-change-boundary.json') as {
      total_cost_comparison_vectors: Array<{
        id: string; note: string;
        input: { prompt_tokens: number; completion_tokens: number; reasoning_tokens: number };
        old_pricing: { version: number; input_micro_per_million: number; output_micro_per_million: number };
        new_pricing: { version: number; input_micro_per_million: number; output_micro_per_million: number };
        expected_old: { input_cost_micro: number; output_cost_micro: number; total_cost_micro: number };
        expected_new: { input_cost_micro: number; output_cost_micro: number; total_cost_micro: number };
      }>;
    };

    for (const v of data.total_cost_comparison_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        const oldInput = calculateCostMicro(v.input.prompt_tokens, v.old_pricing.input_micro_per_million);
        const oldOutput = calculateCostMicro(v.input.completion_tokens, v.old_pricing.output_micro_per_million);
        expect(oldInput.cost_micro).toBe(v.expected_old.input_cost_micro);
        expect(oldOutput.cost_micro).toBe(v.expected_old.output_cost_micro);
        expect(oldInput.cost_micro + oldOutput.cost_micro).toBe(v.expected_old.total_cost_micro);

        const newInput = calculateCostMicro(v.input.prompt_tokens, v.new_pricing.input_micro_per_million);
        const newOutput = calculateCostMicro(v.input.completion_tokens, v.new_pricing.output_micro_per_million);
        expect(newInput.cost_micro).toBe(v.expected_new.input_cost_micro);
        expect(newOutput.cost_micro).toBe(v.expected_new.output_cost_micro);
        expect(newInput.cost_micro + newOutput.cost_micro).toBe(v.expected_new.total_cost_micro);
      });
    }
  });

  describe('price-change-boundary: idempotency', () => {
    const data = loadVectors('price-change-boundary.json') as {
      idempotency_vectors: Array<{
        id: string; note: string; tokens?: number;
        price_micro_per_million?: number; idempotent: boolean;
        expected_cost_micro?: number;
        old_price?: { version: number; micro_per_million: number };
        new_price?: { version: number; micro_per_million: number };
        expected_old_cost_micro?: number; expected_new_cost_micro?: number;
      }>;
    };

    for (const v of data.idempotency_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        if (v.idempotent && v.tokens !== undefined && v.price_micro_per_million !== undefined) {
          // Same price version → same cost every time
          const r1 = calculateCostMicro(v.tokens, v.price_micro_per_million);
          const r2 = calculateCostMicro(v.tokens, v.price_micro_per_million);
          expect(r1.cost_micro).toBe(r2.cost_micro);
          expect(r1.cost_micro).toBe(v.expected_cost_micro);
        } else if (!v.idempotent && v.old_price && v.new_price && v.tokens !== undefined) {
          // Different price version → different cost
          const r1 = calculateCostMicro(v.tokens, v.old_price.micro_per_million);
          const r2 = calculateCostMicro(v.tokens, v.new_price.micro_per_million);
          expect(r1.cost_micro).toBe(v.expected_old_cost_micro);
          expect(r2.cost_micro).toBe(v.expected_new_cost_micro);
          expect(r1.cost_micro).not.toBe(r2.cost_micro);
        }
      });
    }
  });

  // ── provider-correction.json ────────────────────────────────────────

  describe('provider-correction: reconciliation', () => {
    const data = loadVectors('provider-correction.json') as {
      correction_vectors: Array<{
        id: string; note: string;
        estimated: { completion_tokens: number; price_micro_per_million: number; cost_micro: number } | null;
        actual: { completion_tokens: number; price_micro_per_million: number; cost_micro: number } | null;
        expected_correction_micro: number; billing_method: string;
      }>;
    };

    for (const v of data.correction_vectors) {
      it(`${v.id}: ${v.note}`, () => {
        // Verify estimated cost matches calculation
        if (v.estimated) {
          const estResult = calculateCostMicro(v.estimated.completion_tokens, v.estimated.price_micro_per_million);
          expect(estResult.cost_micro).toBe(v.estimated.cost_micro);
        }

        // Verify actual cost matches calculation
        if (v.actual) {
          const actResult = calculateCostMicro(v.actual.completion_tokens, v.actual.price_micro_per_million);
          expect(actResult.cost_micro).toBe(v.actual.cost_micro);
        }

        // Verify correction
        const estimatedCost = v.estimated?.cost_micro ?? 0;
        const actualCost = v.actual?.cost_micro ?? estimatedCost;
        expect(actualCost - estimatedCost).toBe(v.expected_correction_micro);
      });
    }
  });

  // ── Cross-file invariants ───────────────────────────────────────────

  describe('cross-file invariants', () => {
    it('total vectors across all files >= 50', () => {
      const basic = loadVectors('basic-pricing.json') as Record<string, unknown[]>;
      const streaming = loadVectors('streaming-cancel.json') as Record<string, unknown[]>;
      const extreme = loadVectors('extreme-tokens.json') as Record<string, unknown[]>;
      const priceChange = loadVectors('price-change-boundary.json') as Record<string, unknown[]>;
      const correction = loadVectors('provider-correction.json') as Record<string, unknown[]>;

      const count =
        (basic.single_cost_vectors?.length ?? 0) +
        (basic.total_cost_vectors?.length ?? 0) +
        (basic.remainder_accumulator_sequences?.length ?? 0) +
        (streaming.total_cost_vectors?.length ?? 0) +
        (extreme.single_cost_vectors?.length ?? 0) +
        (extreme.overflow_vectors?.length ?? 0) +
        (extreme.bigint_vectors?.length ?? 0) +
        (extreme.serialization_vectors?.length ?? 0) +
        (priceChange.price_comparison_vectors?.length ?? 0) +
        (priceChange.total_cost_comparison_vectors?.length ?? 0) +
        (priceChange.idempotency_vectors?.length ?? 0) +
        (correction.correction_vectors?.length ?? 0);

      expect(count).toBeGreaterThanOrEqual(50);
    });

    it('all vector IDs are unique across files', () => {
      const files = [
        'basic-pricing.json',
        'streaming-cancel.json',
        'extreme-tokens.json',
        'price-change-boundary.json',
        'provider-correction.json',
      ];

      const allIds = new Set<string>();
      for (const file of files) {
        const data = loadVectors(file) as Record<string, unknown>;
        for (const [, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            for (const item of value) {
              if (typeof item === 'object' && item !== null && 'id' in item) {
                const id = (item as { id: string }).id;
                expect(allIds.has(id)).toBe(false);
                allIds.add(id);
              }
            }
          }
        }
      }
    });

    it('cost_micro = floor(tokens * price / 1_000_000) for all single-cost vectors', () => {
      const basic = loadVectors('basic-pricing.json') as {
        single_cost_vectors: Array<{ tokens: number; price_micro_per_million: number; expected_cost_micro: number }>;
      };

      for (const v of basic.single_cost_vectors) {
        expect(Math.floor(v.tokens * v.price_micro_per_million / 1_000_000)).toBe(v.expected_cost_micro);
      }
    });

    it('remainder_micro = (tokens * price) % 1_000_000 for all single-cost vectors', () => {
      const basic = loadVectors('basic-pricing.json') as {
        single_cost_vectors: Array<{ tokens: number; price_micro_per_million: number; expected_remainder_micro: number }>;
      };

      for (const v of basic.single_cost_vectors) {
        expect((v.tokens * v.price_micro_per_million) % 1_000_000).toBe(v.expected_remainder_micro);
      }
    });
  });
});
