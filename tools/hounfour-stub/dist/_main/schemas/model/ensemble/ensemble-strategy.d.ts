import { type Static } from '@sinclair/typebox';
/**
 * Ensemble strategy types for multi-model coordination
 *
 * @governance registry-extensible
 */
export declare const EnsembleStrategySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"dialogue">]>;
export type EnsembleStrategy = Static<typeof EnsembleStrategySchema>;
//# sourceMappingURL=ensemble-strategy.d.ts.map