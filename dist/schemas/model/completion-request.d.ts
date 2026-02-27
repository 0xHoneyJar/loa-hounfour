import { type Static } from '@sinclair/typebox';
export declare const CompletionRequestSchema: import("@sinclair/typebox").TObject<{
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
export type CompletionRequest = Static<typeof CompletionRequestSchema>;
//# sourceMappingURL=completion-request.d.ts.map