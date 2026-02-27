import { type Static } from '@sinclair/typebox';
/**
 * Routing resolution schema for model selection outcomes.
 * Records how a model request was resolved and why.
 */
export declare const RoutingResolutionSchema: import("@sinclair/typebox").TObject<{
    resolved_model: import("@sinclair/typebox").TString;
    original_request_model: import("@sinclair/typebox").TString;
    resolution_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"fallback">, import("@sinclair/typebox").TLiteral<"budget_downgrade">, import("@sinclair/typebox").TLiteral<"capability_match">]>;
    reason: import("@sinclair/typebox").TString;
    latency_ms: import("@sinclair/typebox").TInteger;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RoutingResolution = Static<typeof RoutingResolutionSchema>;
//# sourceMappingURL=routing-resolution.d.ts.map