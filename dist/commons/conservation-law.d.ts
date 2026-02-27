/**
 * ConservationLaw schema — defines invariants that must hold for a governed resource.
 *
 * Conservation laws declare named expressions that are evaluated before/after
 * state transitions. The enforcement mode controls whether violations halt
 * or warn.
 *
 * @see SDD §4.2 — ConservationLaw (FR-1.2)
 * @see constraints/GRAMMAR.md — Expression grammar for invariant expressions
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Conservation law with named invariant expressions and enforcement policy.
 *
 * Constraint (SKP-001): strict enforcement requires non-empty invariants.
 */
export declare const ConservationLawSchema: import("@sinclair/typebox").TObject<{
    invariants: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        invariant_id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        expression: import("@sinclair/typebox").TString;
        severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"info">]>;
        description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    enforcement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"advisory">]>;
    scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"per-entry">, import("@sinclair/typebox").TLiteral<"aggregate">]>;
}>;
export type ConservationLaw = Static<typeof ConservationLawSchema>;
//# sourceMappingURL=conservation-law.d.ts.map