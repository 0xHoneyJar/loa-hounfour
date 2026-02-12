/**
 * Schema validators with compile cache.
 *
 * Uses TypeBox TypeCompiler for fast runtime validation.
 * Compiled validators are cached on first use.
 *
 * @see SDD 4.1 — Schema Validation
 */
import { type TypeCheck } from '@sinclair/typebox/compiler';
import { type TSchema } from '@sinclair/typebox';
/**
 * Validate data against a schema.
 * Returns { valid: true } or { valid: false, errors: [...] }.
 */
export declare function validate<T extends TSchema>(schema: T, data: unknown): {
    valid: true;
} | {
    valid: false;
    errors: string[];
};
export declare const validators: {
    readonly jwtClaims: () => TypeCheck<import("@sinclair/typebox").TObject<{
        iss: import("@sinclair/typebox").TString;
        aud: import("@sinclair/typebox").TString;
        sub: import("@sinclair/typebox").TString;
        iat: import("@sinclair/typebox").TNumber;
        exp: import("@sinclair/typebox").TNumber;
        jti: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        tenant_id: import("@sinclair/typebox").TString;
        tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"free">, import("@sinclair/typebox").TLiteral<"pro">, import("@sinclair/typebox").TLiteral<"enterprise">]>;
        req_hash: import("@sinclair/typebox").TString;
        nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        model_preferences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TString>>;
        byok: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            token_id: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TString;
            scopes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        }>>;
    }>>;
    readonly s2sJwtClaims: () => TypeCheck<import("@sinclair/typebox").TObject<{
        iss: import("@sinclair/typebox").TString;
        aud: import("@sinclair/typebox").TString;
        sub: import("@sinclair/typebox").TString;
        iat: import("@sinclair/typebox").TNumber;
        exp: import("@sinclair/typebox").TNumber;
        jti: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        scope: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    readonly invokeResponse: () => TypeCheck<import("@sinclair/typebox").TObject<{
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
    }>>;
    readonly usageReport: () => TypeCheck<import("@sinclair/typebox").TObject<{
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
    }>>;
    readonly streamEvent: () => TypeCheck<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"stream_start">;
        model: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TString;
        pool_id: import("@sinclair/typebox").TString;
        trace_id: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"chunk">;
        delta: import("@sinclair/typebox").TString;
        index: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"tool_call">;
        index: import("@sinclair/typebox").TInteger;
        id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        function: import("@sinclair/typebox").TObject<{
            name: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            arguments: import("@sinclair/typebox").TString;
        }>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"usage">;
        prompt_tokens: import("@sinclair/typebox").TInteger;
        completion_tokens: import("@sinclair/typebox").TInteger;
        reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"stream_end">;
        finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
        billing_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider_reported">, import("@sinclair/typebox").TLiteral<"observed_chunks_overcount">, import("@sinclair/typebox").TLiteral<"prompt_only">]>;
        cost_micro: import("@sinclair/typebox").TString;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"error">;
        code: import("@sinclair/typebox").TString;
        message: import("@sinclair/typebox").TString;
        retryable: import("@sinclair/typebox").TBoolean;
    }>]>>;
    readonly routingPolicy: () => TypeCheck<import("@sinclair/typebox").TObject<{
        version: import("@sinclair/typebox").TString;
        personalities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            personality_id: import("@sinclair/typebox").TString;
            task_routing: import("@sinclair/typebox").TObject<{
                chat: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>;
                analysis: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>;
                architecture: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>;
                code: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>;
                default: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>;
            }>;
            preferences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                temperature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
                max_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                system_prompt_path: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            }>>;
        }>>;
    }>>;
};
//# sourceMappingURL=index.d.ts.map