/**
 * Routing Rebalance Event — records basket weight adjustments.
 *
 * When the system learns from performance feedback (Sprint 2) that
 * model weights should change, a RoutingRebalanceEvent captures
 * what triggered the rebalance and the before/after state.
 *
 * @see DR-F2 — Static routing weights (no rebalancing event)
 * @see FAANG parallel: Netflix CDN traffic proportion adjustments
 * @since v7.8.0 (Sprint 3)
 */
import { type Static } from '@sinclair/typebox';
export declare const RebalanceTriggerTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"periodic">, import("@sinclair/typebox").TLiteral<"threshold_breach">, import("@sinclair/typebox").TLiteral<"manual">, import("@sinclair/typebox").TLiteral<"performance_driven">]>;
export type RebalanceTriggerType = Static<typeof RebalanceTriggerTypeSchema>;
export declare const RoutingRebalanceEventSchema: import("@sinclair/typebox").TObject<{
    event_id: import("@sinclair/typebox").TString;
    trigger_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"periodic">, import("@sinclair/typebox").TLiteral<"threshold_breach">, import("@sinclair/typebox").TLiteral<"manual">, import("@sinclair/typebox").TLiteral<"performance_driven">]>;
    before_composition_id: import("@sinclair/typebox").TString;
    after_composition_id: import("@sinclair/typebox").TString;
    trigger_details: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    performance_window_start: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    performance_window_end: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RoutingRebalanceEvent = Static<typeof RoutingRebalanceEventSchema>;
//# sourceMappingURL=routing-rebalance.d.ts.map