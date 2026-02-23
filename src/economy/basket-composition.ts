/**
 * Basket Composition — point-in-time snapshot of the SDR basket.
 *
 * Records the weight distribution across models at a moment in time.
 * Like the IMF's SDR basket, the composition changes as the system
 * learns from its own decisions via performance feedback.
 *
 * @see DR-F2 — Static routing weights (no rebalancing event)
 * @see FAANG parallel: Netflix CDN traffic steering proportions
 * @since v7.8.0 (Sprint 3)
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Basket Composition Entry
// ---------------------------------------------------------------------------

export const BasketCompositionEntrySchema = Type.Object(
  {
    model_id: Type.String({
      minLength: 1,
      description: 'Model identifier in the basket.',
    }),
    weight: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Share of routing allocation (0-1).',
    }),
    quality_yield: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Observed quality yield at time of composition.',
    }),
    sample_count: Type.Integer({
      minimum: 0,
      description: 'Number of observations backing this entry.',
    }),
  },
  {
    $id: 'BasketCompositionEntry',
    additionalProperties: false,
    description: 'A single model entry in a basket composition snapshot.',
  },
);

export type BasketCompositionEntry = Static<typeof BasketCompositionEntrySchema>;

// ---------------------------------------------------------------------------
// Basket Composition
// ---------------------------------------------------------------------------

export const BasketCompositionSchema = Type.Object(
  {
    composition_id: Type.String({
      format: 'uuid',
      description: 'Unique identifier for this composition snapshot.',
    }),
    entries: Type.Array(BasketCompositionEntrySchema, {
      minItems: 1,
      description: 'Model entries in the basket.',
    }),
    total_models: Type.Integer({
      minimum: 1,
      description: 'Number of models in the basket.',
    }),
    computed_at: Type.String({
      format: 'date-time',
      description: 'When this composition was computed.',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol version.',
    }),
  },
  {
    $id: 'BasketComposition',
    additionalProperties: false,
    description:
      'Point-in-time snapshot of the SDR basket — the weight distribution ' +
      'across models at a moment in time.',
  },
);

export type BasketComposition = Static<typeof BasketCompositionSchema>;
