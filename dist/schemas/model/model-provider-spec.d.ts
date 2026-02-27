import { type Static } from '@sinclair/typebox';
/**
 * Pricing rates per million tokens. Extracted as a reusable sub-type
 * shared by ModelProviderSpec (here) and BillingEntry (sprint 3).
 */
export declare const ModelPricingSchema: import("@sinclair/typebox").TObject<{
    input_per_million_micro: import("@sinclair/typebox").TString;
    output_per_million_micro: import("@sinclair/typebox").TString;
    thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ModelPricing = Static<typeof ModelPricingSchema>;
/** Model status within a provider spec. */
export declare const ModelStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"deprecated">, import("@sinclair/typebox").TLiteral<"preview">]>;
export type ModelStatus = Static<typeof ModelStatusSchema>;
/** Single model entry within a provider spec. */
export declare const ModelEntrySchema: import("@sinclair/typebox").TObject<{
    model_id: import("@sinclair/typebox").TString;
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
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"deprecated">, import("@sinclair/typebox").TLiteral<"preview">]>;
}>;
export type ModelEntry = Static<typeof ModelEntrySchema>;
/** Provider API endpoints. */
export declare const ProviderEndpointsSchema: import("@sinclair/typebox").TObject<{
    completion: import("@sinclair/typebox").TString;
    streaming: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    health: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ProviderEndpoints = Static<typeof ProviderEndpointsSchema>;
/** Provider SLA targets. */
export declare const ProviderSLASchema: import("@sinclair/typebox").TObject<{
    uptime_target: import("@sinclair/typebox").TNumber;
    p50_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    p99_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    rate_limit_rpm: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type ProviderSLA = Static<typeof ProviderSLASchema>;
/** Result of running a conformance vector against the provider. */
export declare const ConformanceVectorResultSchema: import("@sinclair/typebox").TObject<{
    vector_id: import("@sinclair/typebox").TString;
    category: import("@sinclair/typebox").TString;
    passed: import("@sinclair/typebox").TBoolean;
    error_message: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    run_at: import("@sinclair/typebox").TString;
}>;
export type ConformanceVectorResult = Static<typeof ConformanceVectorResultSchema>;
/** Reservation policy describing provider's capacity reservation support. */
export declare const ReservationPolicySchema: import("@sinclair/typebox").TObject<{
    supports_reservations: import("@sinclair/typebox").TBoolean;
    min_reservation_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    max_reservation_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    reservation_enforcement: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"advisory">, import("@sinclair/typebox").TLiteral<"unsupported">]>>;
}>;
export type ReservationPolicy = Static<typeof ReservationPolicySchema>;
/**
 * ModelProviderSpec — The provider registration/identity document.
 *
 * Describes an entire provider: its models, endpoints, SLA, conformance level,
 * and vector results. Lives alongside ModelCapabilities (which describes a single model).
 * Think of it as the "tokenURI for model providers" (Ostrom Principle 1 — Boundaries).
 */
export declare const ModelProviderSpecSchema: import("@sinclair/typebox").TObject<{
    spec_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"claude-code">, import("@sinclair/typebox").TLiteral<"openai">, import("@sinclair/typebox").TLiteral<"openai-compatible">, import("@sinclair/typebox").TLiteral<"anthropic">, import("@sinclair/typebox").TLiteral<"google">, import("@sinclair/typebox").TLiteral<"custom">]>;
    display_name: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    models: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        model_id: import("@sinclair/typebox").TString;
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
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"deprecated">, import("@sinclair/typebox").TLiteral<"preview">]>;
    }>>;
    endpoints: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        completion: import("@sinclair/typebox").TString;
        streaming: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        health: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    sla: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        uptime_target: import("@sinclair/typebox").TNumber;
        p50_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        p99_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        rate_limit_rpm: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>>;
    conformance_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"self_declared">, import("@sinclair/typebox").TLiteral<"community_verified">, import("@sinclair/typebox").TLiteral<"protocol_certified">]>;
    conformance_vector_results: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        vector_id: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TString;
        passed: import("@sinclair/typebox").TBoolean;
        error_message: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        run_at: import("@sinclair/typebox").TString;
    }>>>;
    reservation_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        supports_reservations: import("@sinclair/typebox").TBoolean;
        min_reservation_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        max_reservation_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        reservation_enforcement: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"advisory">, import("@sinclair/typebox").TLiteral<"unsupported">]>>;
    }>>;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    signature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    published_at: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ModelProviderSpec = Static<typeof ModelProviderSpecSchema>;
//# sourceMappingURL=model-provider-spec.d.ts.map