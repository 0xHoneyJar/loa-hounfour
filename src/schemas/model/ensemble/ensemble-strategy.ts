import { Type, type Static } from '@sinclair/typebox';

/**
 * Ensemble strategy types for multi-model coordination
 */
export const EnsembleStrategySchema = Type.Union(
  [
    Type.Literal('first_complete'),
    Type.Literal('best_of_n'),
    Type.Literal('consensus'),
  ],
  { $id: 'EnsembleStrategy' }
);

export type EnsembleStrategy = Static<typeof EnsembleStrategySchema>;
