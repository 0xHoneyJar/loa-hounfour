/**
 * Invoke response and usage report schemas.
 *
 * All cost fields use string-typed micro-USD (integer as string)
 * to avoid floating-point precision issues across languages.
 *
 * @see SDD 4.3 — Budget System
 */
import { type Static } from '@sinclair/typebox';
/** Token usage breakdown. */
export declare const UsageSchema: import("@sinclair/typebox").TObject<{
    prompt_tokens: import("@sinclair/typebox").TInteger;
    completion_tokens: import("@sinclair/typebox").TInteger;
    reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type Usage = Static<typeof UsageSchema>;
/** Cost breakdown in micro-USD. */
export declare const CostBreakdownSchema: import("@sinclair/typebox").TObject<{
    input_cost_micro: import("@sinclair/typebox").TString;
    output_cost_micro: import("@sinclair/typebox").TString;
    reasoning_cost_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    total_cost_micro: import("@sinclair/typebox").TString;
}>;
export type CostBreakdown = Static<typeof CostBreakdownSchema>;
/** Invoke response returned to the client. */
export declare const InvokeResponseSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    model: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    content: import("@sinclair/typebox").TString;
    tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        function: import("@sinclair/typebox").TObject<{
            name: import("@sinclair/typebox").TString;
            arguments: import("@sinclair/typebox").TString;
        }>;
    }>>>;
    usage: import("@sinclair/typebox").TObject<{
        prompt_tokens: import("@sinclair/typebox").TInteger;
        completion_tokens: import("@sinclair/typebox").TInteger;
        reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
    cost: import("@sinclair/typebox").TObject<{
        input_cost_micro: import("@sinclair/typebox").TString;
        output_cost_micro: import("@sinclair/typebox").TString;
        reasoning_cost_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        total_cost_micro: import("@sinclair/typebox").TString;
    }>;
    billing_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider_reported">, import("@sinclair/typebox").TLiteral<"observed_chunks_overcount">, import("@sinclair/typebox").TLiteral<"prompt_only">]>;
    latency_ms: import("@sinclair/typebox").TInteger;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type InvokeResponse = Static<typeof InvokeResponseSchema>;
/**
 * Usage report posted to arrakis for reconciliation.
 * Signed as JWS for tamper resistance.
 */
export declare const UsageReportSchema: import("@sinclair/typebox").TObject<{
    trace_id: import("@sinclair/typebox").TString;
    tenant_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    model: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    usage: import("@sinclair/typebox").TObject<{
        prompt_tokens: import("@sinclair/typebox").TInteger;
        completion_tokens: import("@sinclair/typebox").TInteger;
        reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
    cost: import("@sinclair/typebox").TObject<{
        input_cost_micro: import("@sinclair/typebox").TString;
        output_cost_micro: import("@sinclair/typebox").TString;
        reasoning_cost_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        total_cost_micro: import("@sinclair/typebox").TString;
    }>;
    billing_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider_reported">, import("@sinclair/typebox").TLiteral<"observed_chunks_overcount">, import("@sinclair/typebox").TLiteral<"prompt_only">]>;
    idempotency_key: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    ensemble_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type UsageReport = Static<typeof UsageReportSchema>;
//# sourceMappingURL=invoke-response.d.ts.map