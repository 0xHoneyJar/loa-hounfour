import { type Static } from '@sinclair/typebox';
/**
 * Agent requirements schema for capability-based routing.
 * Declares what an agent needs from a model to function correctly.
 */
export declare const AgentRequirementsSchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
    requires_native_runtime: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    requires_tool_calling: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    requires_thinking_traces: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    requires_vision: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    preferred_models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    min_context_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type AgentRequirements = Static<typeof AgentRequirementsSchema>;
//# sourceMappingURL=agent-requirements.d.ts.map