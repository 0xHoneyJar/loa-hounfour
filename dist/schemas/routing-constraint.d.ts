import { type Static } from '@sinclair/typebox';
/**
 * Routing constraint for agent task dispatch.
 *
 * Constrains which agents/providers can handle a task based on
 * capabilities, cost limits, health requirements, and trust levels.
 *
 * Evaluation semantics: all present fields are AND-combined.
 * Absent fields impose no constraint (open by default).
 *
 * @since v4.0.0
 */
export declare const RoutingConstraintSchema: import("@sinclair/typebox").TObject<{
    /** Required capabilities the handler must advertise. */
    required_capabilities: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    /** Maximum cost in micro-USD the caller is willing to pay. */
    max_cost_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    /** Minimum health score (0.0-1.0) the handler must report. */
    min_health: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    /** Allowlist of provider identifiers. Empty = any provider. */
    allowed_providers: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    /** Minimum trust level required. */
    trust_level: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"authenticated">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">]>>;
    /** Minimum reputation score (0.0-1.0) the handler must hold. */
    min_reputation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    /** Contract version for constraint interpretation. */
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RoutingConstraint = Static<typeof RoutingConstraintSchema>;
//# sourceMappingURL=routing-constraint.d.ts.map