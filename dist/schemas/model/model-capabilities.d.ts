import { type Static } from '@sinclair/typebox';
export declare const ModelCapabilitiesSchema: import("@sinclair/typebox").TObject<{
    model_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    capabilities: import("@sinclair/typebox").TObject<{
        thinking_traces: import("@sinclair/typebox").TBoolean;
        vision: import("@sinclair/typebox").TBoolean;
        tool_calling: import("@sinclair/typebox").TBoolean;
        streaming: import("@sinclair/typebox").TBoolean;
        json_mode: import("@sinclair/typebox").TBoolean;
        native_runtime: import("@sinclair/typebox").TBoolean;
    }>;
    limits: import("@sinclair/typebox").TObject<{
        max_context_tokens: import("@sinclair/typebox").TInteger;
        max_output_tokens: import("@sinclair/typebox").TInteger;
        max_thinking_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
    pricing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        input_per_million_micro: import("@sinclair/typebox").TString;
        output_per_million_micro: import("@sinclair/typebox").TString;
        thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ModelCapabilities = Static<typeof ModelCapabilitiesSchema>;
//# sourceMappingURL=model-capabilities.d.ts.map