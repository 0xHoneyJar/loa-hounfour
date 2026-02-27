import { type Static } from '@sinclair/typebox';
/**
 * Request schema for ensemble operations
 */
export declare const EnsembleRequestSchema: import("@sinclair/typebox").TObject<{
    ensemble_id: import("@sinclair/typebox").TString;
    strategy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"dialogue">]>;
    models: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    timeout_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    task_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    request: import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        tenant_id: import("@sinclair/typebox").TString;
        nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        trace_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        session_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        model: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        execution_mode: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"native_runtime">, import("@sinclair/typebox").TLiteral<"remote_model">]>>;
        messages: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"user">, import("@sinclair/typebox").TLiteral<"assistant">, import("@sinclair/typebox").TLiteral<"tool">]>;
            content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                type: import("@sinclair/typebox").TString;
                text: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
                source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
            }>>]>>;
            thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                id: import("@sinclair/typebox").TString;
                type: import("@sinclair/typebox").TLiteral<"function">;
                function: import("@sinclair/typebox").TObject<{
                    name: import("@sinclair/typebox").TString;
                    arguments: import("@sinclair/typebox").TString;
                }>;
            }>>>;
            tool_call_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TLiteral<"function">;
            function: import("@sinclair/typebox").TObject<{
                name: import("@sinclair/typebox").TString;
                description: import("@sinclair/typebox").TString;
                parameters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
            }>;
        }>>>;
        tool_choice: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"auto">, import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"required">, import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TLiteral<"function">;
            function: import("@sinclair/typebox").TObject<{
                name: import("@sinclair/typebox").TString;
            }>;
        }>]>>;
        temperature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        max_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        top_p: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        stop_sequences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            enabled: import("@sinclair/typebox").TBoolean;
            budget_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        }>>;
        budget_limit_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        contract_version: import("@sinclair/typebox").TString;
    }>;
    consensus_threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    dialogue_config: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        max_rounds: import("@sinclair/typebox").TInteger;
        pass_thinking_traces: import("@sinclair/typebox").TBoolean;
        termination: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed_rounds">, import("@sinclair/typebox").TLiteral<"consensus_reached">, import("@sinclair/typebox").TLiteral<"no_new_insights">]>;
        seed_prompt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type EnsembleRequest = Static<typeof EnsembleRequestSchema>;
//# sourceMappingURL=ensemble-request.d.ts.map