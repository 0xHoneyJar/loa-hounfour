/**
 * Tests for BasketComposition schemas (v7.8.0, DR-F2 — dynamic rebalancing).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  BasketCompositionEntrySchema,
  BasketCompositionSchema,
} from '../../src/economy/basket-composition.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// ---------------------------------------------------------------------------
// BasketCompositionEntry
// ---------------------------------------------------------------------------

describe('BasketCompositionEntrySchema', () => {
  it('accepts valid entry', () => {
    expect(Value.Check(BasketCompositionEntrySchema, {
      model_id: 'gpt-5.2',
      weight: 0.5,
      quality_yield: 0.85,
      sample_count: 100,
    })).toBe(true);
  });

  it('rejects weight > 1', () => {
    expect(Value.Check(BasketCompositionEntrySchema, {
      model_id: 'gpt-5.2',
      weight: 1.5,
      quality_yield: 0.85,
      sample_count: 100,
    })).toBe(false);
  });

  it('rejects empty model_id', () => {
    expect(Value.Check(BasketCompositionEntrySchema, {
      model_id: '',
      weight: 0.5,
      quality_yield: 0.85,
      sample_count: 100,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BasketComposition
// ---------------------------------------------------------------------------

const validComposition = {
  composition_id: '550e8400-e29b-41d4-a716-446655440100',
  entries: [
    { model_id: 'gpt-5.2', weight: 0.6, quality_yield: 0.85, sample_count: 200 },
    { model_id: 'claude-opus-4', weight: 0.4, quality_yield: 0.90, sample_count: 150 },
  ],
  total_models: 2,
  computed_at: '2026-02-23T16:00:00Z',
  contract_version: '7.8.0',
};

describe('BasketCompositionSchema', () => {
  it('accepts valid composition', () => {
    expect(Value.Check(BasketCompositionSchema, validComposition)).toBe(true);
  });

  it('rejects empty entries array', () => {
    expect(Value.Check(BasketCompositionSchema, {
      ...validComposition,
      entries: [],
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(BasketCompositionSchema, {
      ...validComposition,
      extra: true,
    })).toBe(false);
  });

  it('has $id BasketComposition', () => {
    expect(BasketCompositionSchema.$id).toBe('BasketComposition');
  });
});

// ---------------------------------------------------------------------------
// basket_weights_normalized builtin
// ---------------------------------------------------------------------------

describe('basket_weights_normalized evaluator builtin', () => {
  it('passes for normalized weights (sum = 1.0)', () => {
    expect(evaluateConstraint(
      {
        this: {
          entries: [
            { model_id: 'a', weight: 0.6 },
            { model_id: 'b', weight: 0.4 },
          ],
        },
      },
      'basket_weights_normalized(this)',
    )).toBe(true);
  });

  it('fails for non-normalized weights (sum > 1.0)', () => {
    expect(evaluateConstraint(
      {
        this: {
          entries: [
            { model_id: 'a', weight: 0.6 },
            { model_id: 'b', weight: 0.6 },
          ],
        },
      },
      'basket_weights_normalized(this)',
    )).toBe(false);
  });

  it('fails for empty entries', () => {
    expect(evaluateConstraint(
      { this: { entries: [] } },
      'basket_weights_normalized(this)',
    )).toBe(false);
  });

  it('passes for single model with weight 1.0', () => {
    expect(evaluateConstraint(
      {
        this: {
          entries: [{ model_id: 'solo', weight: 1.0 }],
        },
      },
      'basket_weights_normalized(this)',
    )).toBe(true);
  });

  it('passes within tolerance (0.001)', () => {
    expect(evaluateConstraint(
      {
        this: {
          entries: [
            { model_id: 'a', weight: 0.333 },
            { model_id: 'b', weight: 0.333 },
            { model_id: 'c', weight: 0.334 },
          ],
        },
      },
      'basket_weights_normalized(this)',
    )).toBe(true);
  });
});
