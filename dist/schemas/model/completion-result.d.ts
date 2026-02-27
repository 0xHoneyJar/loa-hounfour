import { type Static } from '@sinclair/typebox';
export declare const CompletionResultSchema: import("@sinclair/typebox").TObject<{
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
export type CompletionResult = Static<typeof CompletionResultSchema>;
//# sourceMappingURL=completion-result.d.ts.map