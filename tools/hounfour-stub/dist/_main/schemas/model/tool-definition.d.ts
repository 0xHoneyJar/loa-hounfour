import { type Static } from '@sinclair/typebox';
export declare const ToolDefinitionSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"function">;
    function: import("@sinclair/typebox").TObject<{
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        parameters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
    }>;
}>;
export type ToolDefinition = Static<typeof ToolDefinitionSchema>;
//# sourceMappingURL=tool-definition.d.ts.map