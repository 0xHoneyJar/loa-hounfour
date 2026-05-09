import { Type } from '@sinclair/typebox';
/**
 * Ensemble strategy types for multi-model coordination
 *
 * @governance registry-extensible
 */
export const EnsembleStrategySchema = Type.Union([
    Type.Literal('first_complete'),
    Type.Literal('best_of_n'),
    Type.Literal('consensus'),
    Type.Literal('sequential'),
    Type.Literal('dialogue'),
], {
    $id: 'EnsembleStrategy',
    $comment: 'Multi-model coordination strategies.',
});
//# sourceMappingURL=ensemble-strategy.js.map