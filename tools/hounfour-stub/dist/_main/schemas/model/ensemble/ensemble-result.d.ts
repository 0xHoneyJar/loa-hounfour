import { type Static } from '@sinclair/typebox';
/**
 * Result schema for ensemble operations
 */
export declare const EnsembleResultSchema: import("@sinclair/typebox").TObject<{
    ensemble_id: import("@sinclair/typebox").TString;
    strategy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"dialogue">]>;
    selected: import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TString;
        model: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TString;
        content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TLiteral<"function">;
            function: import("@sinclair/typebox").TObject<{
                name: import("@sinclair/typebox").TString;
                arguments: import("@sinclair/typebox").TString;
            }>;
        }>>>;
        finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
        usage: import("@sinclair/typebox").TObject<{
            prompt_tokens: import("@sinclair/typebox").TInteger;
            completion_tokens: import("@sinclair/typebox").TInteger;
            reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            total_tokens: import("@sinclair/typebox").TInteger;
            cost_micro: import("@sinclair/typebox").TString;
        }>;
        latency_ms: import("@sinclair/typebox").TInteger;
        pricing_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            input_per_million_micro: import("@sinclair/typebox").TString;
            output_per_million_micro: import("@sinclair/typebox").TString;
            thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        contract_version: import("@sinclair/typebox").TString;
    }>;
    candidates: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TString;
        model: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TString;
        content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TLiteral<"function">;
            function: import("@sinclair/typebox").TObject<{
                name: import("@sinclair/typebox").TString;
                arguments: import("@sinclair/typebox").TString;
            }>;
        }>>>;
        finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
        usage: import("@sinclair/typebox").TObject<{
            prompt_tokens: import("@sinclair/typebox").TInteger;
            completion_tokens: import("@sinclair/typebox").TInteger;
            reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            total_tokens: import("@sinclair/typebox").TInteger;
            cost_micro: import("@sinclair/typebox").TString;
        }>;
        latency_ms: import("@sinclair/typebox").TInteger;
        pricing_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            input_per_million_micro: import("@sinclair/typebox").TString;
            output_per_million_micro: import("@sinclair/typebox").TString;
            thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    consensus_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    rounds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        round: import("@sinclair/typebox").TInteger;
        model: import("@sinclair/typebox").TString;
        response: import("@sinclair/typebox").TObject<{
            request_id: import("@sinclair/typebox").TString;
            model: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TString;
            content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                id: import("@sinclair/typebox").TString;
                type: import("@sinclair/typebox").TLiteral<"function">;
                function: import("@sinclair/typebox").TObject<{
                    name: import("@sinclair/typebox").TString;
                    arguments: import("@sinclair/typebox").TString;
                }>;
            }>>>;
            finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
            usage: import("@sinclair/typebox").TObject<{
                prompt_tokens: import("@sinclair/typebox").TInteger;
                completion_tokens: import("@sinclair/typebox").TInteger;
                reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                total_tokens: import("@sinclair/typebox").TInteger;
                cost_micro: import("@sinclair/typebox").TString;
            }>;
            latency_ms: import("@sinclair/typebox").TInteger;
            pricing_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                input_per_million_micro: import("@sinclair/typebox").TString;
                output_per_million_micro: import("@sinclair/typebox").TString;
                thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            }>>;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>;
        thinking_trace: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>>;
    termination_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed_rounds">, import("@sinclair/typebox").TLiteral<"consensus_reached">, import("@sinclair/typebox").TLiteral<"no_new_insights">, import("@sinclair/typebox").TLiteral<"timeout">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>>;
    /** Number of dialogue rounds completed. When present with rounds array, must equal rounds.length. */
    rounds_completed: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    /** Number of dialogue rounds originally requested (from dialogue_config.max_rounds). */
    rounds_requested: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    /** How consensus was determined when termination_reason is 'consensus_reached'. */
    consensus_method: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"majority_vote">, import("@sinclair/typebox").TLiteral<"unanimous">, import("@sinclair/typebox").TLiteral<"arbiter_decision">, import("@sinclair/typebox").TLiteral<"score_threshold">]>>;
    /** Audit trail of model position changes during dialogue rounds. */
    position_changes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        round: import("@sinclair/typebox").TInteger;
        model: import("@sinclair/typebox").TString;
        from_position: import("@sinclair/typebox").TString;
        to_position: import("@sinclair/typebox").TString;
        reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>>;
    total_cost_micro: import("@sinclair/typebox").TString;
    total_latency_ms: import("@sinclair/typebox").TInteger;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type EnsembleResult = Static<typeof EnsembleResultSchema>;
//# sourceMappingURL=ensemble-result.d.ts.map