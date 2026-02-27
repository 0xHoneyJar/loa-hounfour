/**
 * Economic Performance Events — the feedback loop that closes the membrane.
 *
 * After an access decision is made (EconomicBoundary) and a model invocation
 * occurs, these schemas capture what happened and feed it back into the trust
 * layer. Without this, the membrane is unidirectional — a wall with a door.
 *
 * The PerformanceQualityBridge is the return path: it translates economic
 * outcomes into QualityEvents that the reputation system can process. This
 * is how the membrane becomes bidirectional.
 *
 * @see DR-F1 — Unidirectional membrane gap
 * @see FAANG parallel: Google ad auction click-through → quality score feedback
 * @since v7.8.0 (Sprint 2)
 */
import { type Static } from '@sinclair/typebox';
export declare const PerformanceOutcomeTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cost_within_budget">, import("@sinclair/typebox").TLiteral<"cost_exceeded">, import("@sinclair/typebox").TLiteral<"quality_met">, import("@sinclair/typebox").TLiteral<"quality_below_threshold">, import("@sinclair/typebox").TLiteral<"timeout">, import("@sinclair/typebox").TLiteral<"error">]>;
export type PerformanceOutcomeType = Static<typeof PerformanceOutcomeTypeSchema>;
export declare const EconomicPerformanceEventSchema: import("@sinclair/typebox").TObject<{
    event_id: import("@sinclair/typebox").TString;
    boundary_id: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TString;
    outcome_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cost_within_budget">, import("@sinclair/typebox").TLiteral<"cost_exceeded">, import("@sinclair/typebox").TLiteral<"quality_met">, import("@sinclair/typebox").TLiteral<"quality_below_threshold">, import("@sinclair/typebox").TLiteral<"timeout">, import("@sinclair/typebox").TLiteral<"error">]>;
    actual_cost: import("@sinclair/typebox").TString;
    budgeted_cost: import("@sinclair/typebox").TString;
    actual_quality: import("@sinclair/typebox").TNumber;
    expected_quality: import("@sinclair/typebox").TNumber;
    tokens_used: import("@sinclair/typebox").TObject<{
        input: import("@sinclair/typebox").TInteger;
        output: import("@sinclair/typebox").TInteger;
    }>;
    duration_ms: import("@sinclair/typebox").TInteger;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type EconomicPerformanceEvent = Static<typeof EconomicPerformanceEventSchema>;
export declare const QualityBridgeDirectionSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"positive">, import("@sinclair/typebox").TLiteral<"negative">, import("@sinclair/typebox").TLiteral<"neutral">]>;
export type QualityBridgeDirection = Static<typeof QualityBridgeDirectionSchema>;
export declare const PerformanceQualityBridgeSchema: import("@sinclair/typebox").TObject<{
    bridge_id: import("@sinclair/typebox").TString;
    performance_event_id: import("@sinclair/typebox").TString;
    quality_event_id: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TString;
    direction: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"positive">, import("@sinclair/typebox").TLiteral<"negative">, import("@sinclair/typebox").TLiteral<"neutral">]>;
    quality_delta: import("@sinclair/typebox").TNumber;
    weight_adjustment_suggested: import("@sinclair/typebox").TNumber;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type PerformanceQualityBridge = Static<typeof PerformanceQualityBridgeSchema>;
//# sourceMappingURL=economic-performance.d.ts.map