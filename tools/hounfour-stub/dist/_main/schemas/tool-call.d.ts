/**
 * Canonical tool call schema — extracted from inline MessageSchema.tool_calls.
 *
 * Referenced by both MessageSchema (conversation.ts) and StreamToolCallSchema
 * (stream-events.ts) for a single source of truth on tool call structure.
 *
 * @see BB-HFR-003 — Extract ToolCall canonical schema
 * @see Hounfour RFC §5.3 — Tool calling contract normalization
 * @since v3.1.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * A tool/function call made by a model.
 *
 * Normalizes across provider formats:
 * - OpenAI: `tool_calls[].function.{name, arguments}`
 * - Anthropic: `content[type=tool_use].{name, input}`
 * - Qwen: `tool_calls[].function.{name, arguments}`
 *
 * The `arguments` field is always a JSON string (not parsed object)
 * to preserve provider-specific formatting and avoid double-parse issues.
 */
export declare const ToolCallSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    arguments: import("@sinclair/typebox").TString;
    model_source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ToolCall = Static<typeof ToolCallSchema>;
//# sourceMappingURL=tool-call.d.ts.map