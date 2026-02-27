import { type Static } from '@sinclair/typebox';
export declare const ToolResultSchema: import("@sinclair/typebox").TObject<{
    role: import("@sinclair/typebox").TLiteral<"tool">;
    tool_call_id: import("@sinclair/typebox").TString;
    content: import("@sinclair/typebox").TString;
}>;
export type ToolResult = Static<typeof ToolResultSchema>;
//# sourceMappingURL=tool-result.d.ts.map