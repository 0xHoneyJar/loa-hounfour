/**
 * Reputation Routing Signal — reputation as resource allocation mechanism.
 *
 * Formalizes the connection between reputation scores and model/task routing
 * decisions. Higher reputation unlocks access to premium resources, creating
 * a meritocratic model economy.
 *
 * In the FAANG framing: Google's PageRank started as a ranking signal and
 * became an economic routing mechanism. Uber's driver rating gates access
 * to premium ride types. Reputation becomes the allocation mechanism for
 * scarce resources.
 *
 * @see DR-S7 — Reputation as routing signal
 * @since v7.6.0
 */
import { type Static } from '@sinclair/typebox';
export declare const RoutingSignalTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model_preference">, import("@sinclair/typebox").TLiteral<"task_eligibility">, import("@sinclair/typebox").TLiteral<"delegation_priority">]>;
export type RoutingSignalType = Static<typeof RoutingSignalTypeSchema>;
/**
 * A reputation-based routing signal for resource allocation.
 *
 * Connects reputation scores to economic decisions:
 * - model_preference: route to specific models based on reputation
 * - task_eligibility: qualify for high-value tasks
 * - delegation_priority: prioritize in delegation decisions
 *
 * @since v7.6.0 — DR-S7
 */
export declare const ReputationRoutingSignalSchema: import("@sinclair/typebox").TObject<{
    signal_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    signal_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model_preference">, import("@sinclair/typebox").TLiteral<"task_eligibility">, import("@sinclair/typebox").TLiteral<"delegation_priority">]>;
    qualifying_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    qualifying_score: import("@sinclair/typebox").TNumber;
    model_preferences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        model_id: import("@sinclair/typebox").TString;
        min_cohort_score: import("@sinclair/typebox").TNumber;
    }>>>;
    routing_weight: import("@sinclair/typebox").TNumber;
    effective_at: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ReputationRoutingSignal = Static<typeof ReputationRoutingSignalSchema>;
//# sourceMappingURL=reputation-routing.d.ts.map