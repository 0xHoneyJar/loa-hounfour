import { type Static } from '@sinclair/typebox';
export declare const ProviderWireMessageSchema: import("@sinclair/typebox").TObject<{
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
}>;
export type ProviderWireMessage = Static<typeof ProviderWireMessageSchema>;
//# sourceMappingURL=provider-wire-message.d.ts.map