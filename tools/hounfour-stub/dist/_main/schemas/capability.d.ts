/**
 * Capability negotiation schemas for multi-model architecture.
 *
 * AgentDescriptor describes what an agent *has*; capability schemas
 * describe what an agent *can do at what quality*. This enables
 * runtime capability queries — the HTTP Accept header equivalent
 * for agent collaboration.
 *
 * @see BB-V3-005 — Capability negotiation schema
 */
import { type Static } from '@sinclair/typebox';
/**
 * A single capability an agent can provide.
 */
export declare const CapabilitySchema: import("@sinclair/typebox").TObject<{
    skill_id: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    input_modes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    output_modes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    max_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type Capability = Static<typeof CapabilitySchema>;
/**
 * Query to discover agents with specific capabilities.
 *
 * `additionalProperties: true` enables future query parameters
 * without schema changes.
 */
export declare const CapabilityQuerySchema: import("@sinclair/typebox").TObject<{
    required_skills: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    preferred_models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    max_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    min_context_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type CapabilityQuery = Static<typeof CapabilityQuerySchema>;
/**
 * Response to a capability query, describing an agent's abilities.
 */
export declare const CapabilityResponseSchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
    capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        skill_id: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        input_modes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        output_modes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        max_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>>;
    available: import("@sinclair/typebox").TBoolean;
    contract_version: import("@sinclair/typebox").TString;
    responded_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type CapabilityResponse = Static<typeof CapabilityResponseSchema>;
//# sourceMappingURL=capability.d.ts.map