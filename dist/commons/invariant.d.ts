/**
 * Invariant schema — constraint DSL expressions for governed resources.
 *
 * Invariant expressions use the existing 42-builtin constraint DSL
 * (v1.0/v2.0) defined in `constraints/GRAMMAR.md`. Variable binding
 * resolves field paths against the GovernedResource<T> instance.
 *
 * @see SDD §4.2 — ConservationLaw (FR-1.2)
 * @see constraints/GRAMMAR.md — Expression grammar
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * A single named invariant with a constraint DSL expression.
 *
 * Expression variables bind to field paths on the resource:
 * - Resource-specific fields: `balance`, `lot_id`, `freshness_score`
 * - Governance fields: `conservation_law.*`, `audit_trail.*`, `version`
 * - No temporal operators (invariants evaluate against a single snapshot)
 */
export declare const InvariantSchema: import("@sinclair/typebox").TObject<{
    invariant_id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    expression: import("@sinclair/typebox").TString;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"info">]>;
    description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type Invariant = Static<typeof InvariantSchema>;
//# sourceMappingURL=invariant.d.ts.map