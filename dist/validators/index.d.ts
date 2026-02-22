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
 * Cross-field validator function signature.
 * Returns errors and warnings for cross-field invariant violations.
 */
export type CrossFieldValidator = (data: unknown) => {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Register a cross-field validator for a schema.
 * Used internally to wire cross-field checks into the main pipeline.
 */
export declare function registerCrossFieldValidator(schemaId: string, validator: CrossFieldValidator): void;
/**
 * Returns schema $ids that have registered cross-field validators.
 * Enables consumers to discover which schemas benefit from cross-field validation.
 */
export declare function getCrossFieldValidatorSchemas(): string[];
/**
 * Validate data against any TypeBox schema, with optional cross-field validation.
 *
 * When the schema has a `$id` that matches a registered cross-field validator,
 * cross-field invariants are checked after schema validation passes.
 *
 * @remarks For protocol schemas, prefer using the `validators` object
 * which provides pre-defined, cached validators for all protocol types.
 * Schemas without `$id` are compiled per-call (no caching) — suitable
 * for one-off validation but not high-throughput loops.
 *
 * @param schema - TypeBox schema to validate against
 * @param data - Unknown data to validate
 * @param options - Optional: skip cross-field validation with `{ crossField: false }`
 * @returns `{ valid: true }` or `{ valid: false, errors: [...] }`, optionally with `warnings`
 */
export declare function validate<T extends TSchema>(schema: T, data: unknown, options?: {
    crossField?: boolean;
}): {
    valid: true;
    warnings?: string[];
} | {
    valid: false;
    errors: string[];
    warnings?: string[];
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
        billing_entry_id: import("@sinclair/typebox").TString;
        billing_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider_reported">, import("@sinclair/typebox").TLiteral<"observed_chunks_overcount">, import("@sinclair/typebox").TLiteral<"prompt_only">]>;
        latency_ms: import("@sinclair/typebox").TInteger;
        contract_version: import("@sinclair/typebox").TString;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
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
        billing_entry_id: import("@sinclair/typebox").TString;
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
        sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        execution_mode: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"native">, import("@sinclair/typebox").TLiteral<"remote">]>>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"chunk">;
        delta: import("@sinclair/typebox").TString;
        index: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"tool_call">;
        index: import("@sinclair/typebox").TInteger;
        id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        function: import("@sinclair/typebox").TObject<{
            name: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            arguments: import("@sinclair/typebox").TString;
        }>;
        sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"usage">;
        prompt_tokens: import("@sinclair/typebox").TInteger;
        completion_tokens: import("@sinclair/typebox").TInteger;
        reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"stream_end">;
        finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
        billing_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider_reported">, import("@sinclair/typebox").TLiteral<"observed_chunks_overcount">, import("@sinclair/typebox").TLiteral<"prompt_only">]>;
        cost_micro: import("@sinclair/typebox").TString;
        sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>, import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"error">;
        code: import("@sinclair/typebox").TString;
        message: import("@sinclair/typebox").TString;
        retryable: import("@sinclair/typebox").TBoolean;
        sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
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
    readonly agentDescriptor: () => TypeCheck<import("@sinclair/typebox").TObject<{
        '@context': import("@sinclair/typebox").TLiteral<"https://schema.honeyjar.xyz/agent/v1">;
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        chain_id: import("@sinclair/typebox").TInteger;
        collection: import("@sinclair/typebox").TString;
        token_id: import("@sinclair/typebox").TString;
        personality: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        avatar_url: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        models: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"cheap" | "fast-code" | "reviewer" | "reasoning" | "architect">[]>>;
        tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        tba: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        owner: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        homepage: import("@sinclair/typebox").TString;
        inbox: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        llms_txt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        stats: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            interactions: import("@sinclair/typebox").TInteger;
            uptime: import("@sinclair/typebox").TNumber;
            created_at: import("@sinclair/typebox").TString;
            last_active: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        lifecycle_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"DORMANT">, import("@sinclair/typebox").TLiteral<"PROVISIONING">, import("@sinclair/typebox").TLiteral<"ACTIVE">, import("@sinclair/typebox").TLiteral<"SUSPENDED">, import("@sinclair/typebox").TLiteral<"TRANSFERRED">, import("@sinclair/typebox").TLiteral<"ARCHIVED">]>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly billingEntry: () => TypeCheck<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        trace_id: import("@sinclair/typebox").TString;
        tenant_id: import("@sinclair/typebox").TString;
        nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        cost_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model_inference">, import("@sinclair/typebox").TLiteral<"tool_call">, import("@sinclair/typebox").TLiteral<"platform_fee">, import("@sinclair/typebox").TLiteral<"byok_subscription">, import("@sinclair/typebox").TLiteral<"agent_setup">]>;
        provider: import("@sinclair/typebox").TString;
        model: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        pool_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        tool_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        model_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        cost_provider: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        pricing_model: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"per_token">, import("@sinclair/typebox").TLiteral<"gpu_hourly">, import("@sinclair/typebox").TLiteral<"flat_rate">]>>;
        currency: import("@sinclair/typebox").TLiteral<"USD">;
        precision: import("@sinclair/typebox").TLiteral<6>;
        raw_cost_micro: import("@sinclair/typebox").TString;
        multiplier_bps: import("@sinclair/typebox").TInteger;
        total_cost_micro: import("@sinclair/typebox").TString;
        rounding_policy: import("@sinclair/typebox").TLiteral<"largest_remainder">;
        recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            address: import("@sinclair/typebox").TString;
            role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">, import("@sinclair/typebox").TLiteral<"agent_performer">, import("@sinclair/typebox").TLiteral<"commons">]>;
            share_bps: import("@sinclair/typebox").TInteger;
            amount_micro: import("@sinclair/typebox").TString;
        }>>;
        idempotency_key: import("@sinclair/typebox").TString;
        timestamp: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
        usage: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            prompt_tokens: import("@sinclair/typebox").TInteger;
            completion_tokens: import("@sinclair/typebox").TInteger;
            reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        }>>;
        source_completion_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        pricing_snapshot: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            input_per_million_micro: import("@sinclair/typebox").TString;
            output_per_million_micro: import("@sinclair/typebox").TString;
            thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        reconciliation_mode: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"protocol_authoritative">, import("@sinclair/typebox").TLiteral<"provider_invoice_authoritative">]>>;
        reconciliation_delta_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    }>>;
    readonly creditNote: () => TypeCheck<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        references_billing_entry: import("@sinclair/typebox").TString;
        reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"refund">, import("@sinclair/typebox").TLiteral<"dispute">, import("@sinclair/typebox").TLiteral<"partial_failure">, import("@sinclair/typebox").TLiteral<"adjustment">]>;
        amount_micro: import("@sinclair/typebox").TIntersect<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TString]>;
        recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            address: import("@sinclair/typebox").TString;
            role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">, import("@sinclair/typebox").TLiteral<"agent_performer">, import("@sinclair/typebox").TLiteral<"commons">]>;
            share_bps: import("@sinclair/typebox").TInteger;
            amount_micro: import("@sinclair/typebox").TString;
        }>>;
        issued_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly conversation: () => TypeCheck<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        nft_id: import("@sinclair/typebox").TString;
        title: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"paused">, import("@sinclair/typebox").TLiteral<"sealed">, import("@sinclair/typebox").TLiteral<"archived">]>;
        sealing_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
            key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
            key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            access_audit: import("@sinclair/typebox").TBoolean;
            access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">, import("@sinclair/typebox").TLiteral<"reputation_gated">]>;
                duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
                min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
                min_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
                audit_required: import("@sinclair/typebox").TBoolean;
                revocable: import("@sinclair/typebox").TBoolean;
            }>>;
        }>>;
        message_count: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
        updated_at: import("@sinclair/typebox").TString;
        sealed_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        sealed_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly message: () => TypeCheck<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        conversation_id: import("@sinclair/typebox").TString;
        role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"user">, import("@sinclair/typebox").TLiteral<"assistant">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"tool">]>;
        content: import("@sinclair/typebox").TString;
        model: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        pool_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        billing_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            arguments: import("@sinclair/typebox").TString;
            model_source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>>;
        created_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly conversationSealingPolicy: () => TypeCheck<import("@sinclair/typebox").TObject<{
        encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
        key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        access_audit: import("@sinclair/typebox").TBoolean;
        access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">, import("@sinclair/typebox").TLiteral<"reputation_gated">]>;
            duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            min_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
            audit_required: import("@sinclair/typebox").TBoolean;
            revocable: import("@sinclair/typebox").TBoolean;
        }>>;
    }>>;
    readonly transferSpec: () => TypeCheck<import("@sinclair/typebox").TObject<{
        transfer_id: import("@sinclair/typebox").TString;
        nft_id: import("@sinclair/typebox").TString;
        from_owner: import("@sinclair/typebox").TString;
        to_owner: import("@sinclair/typebox").TString;
        scenario: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"sale">, import("@sinclair/typebox").TLiteral<"gift">, import("@sinclair/typebox").TLiteral<"admin_recovery">, import("@sinclair/typebox").TLiteral<"custody_change">]>;
        sealing_policy: import("@sinclair/typebox").TObject<{
            encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
            key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
            key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            access_audit: import("@sinclair/typebox").TBoolean;
            access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">, import("@sinclair/typebox").TLiteral<"reputation_gated">]>;
                duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
                min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
                min_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
                audit_required: import("@sinclair/typebox").TBoolean;
                revocable: import("@sinclair/typebox").TBoolean;
            }>>;
        }>;
        initiated_at: import("@sinclair/typebox").TString;
        initiated_by: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly transferEvent: () => TypeCheck<import("@sinclair/typebox").TObject<{
        transfer_id: import("@sinclair/typebox").TString;
        nft_id: import("@sinclair/typebox").TString;
        from_owner: import("@sinclair/typebox").TString;
        to_owner: import("@sinclair/typebox").TString;
        scenario: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"sale">, import("@sinclair/typebox").TLiteral<"gift">, import("@sinclair/typebox").TLiteral<"admin_recovery">, import("@sinclair/typebox").TLiteral<"custody_change">]>;
        result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"rolled_back">]>;
        sealing_policy: import("@sinclair/typebox").TObject<{
            encryption_scheme: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"aes-256-gcm">, import("@sinclair/typebox").TLiteral<"none">]>;
            key_derivation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"hkdf-sha256">, import("@sinclair/typebox").TLiteral<"none">]>;
            key_reference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            access_audit: import("@sinclair/typebox").TBoolean;
            access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">, import("@sinclair/typebox").TLiteral<"reputation_gated">]>;
                duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
                min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
                min_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
                audit_required: import("@sinclair/typebox").TBoolean;
                revocable: import("@sinclair/typebox").TBoolean;
            }>>;
        }>;
        conversations_sealed: import("@sinclair/typebox").TInteger;
        conversations_migrated: import("@sinclair/typebox").TInteger;
        initiated_at: import("@sinclair/typebox").TString;
        completed_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly domainEvent: () => TypeCheck<import("@sinclair/typebox").TObject<{
        event_id: import("@sinclair/typebox").TString;
        aggregate_id: import("@sinclair/typebox").TString;
        aggregate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">, import("@sinclair/typebox").TLiteral<"performance">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"reputation">, import("@sinclair/typebox").TLiteral<"economy">]>;
        type: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        occurred_at: import("@sinclair/typebox").TString;
        actor: import("@sinclair/typebox").TString;
        correlation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        causation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        payload: import("@sinclair/typebox").TUnknown;
        contract_version: import("@sinclair/typebox").TString;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    }>>;
    readonly domainEventBatch: () => TypeCheck<import("@sinclair/typebox").TObject<{
        batch_id: import("@sinclair/typebox").TString;
        correlation_id: import("@sinclair/typebox").TString;
        events: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            event_id: import("@sinclair/typebox").TString;
            aggregate_id: import("@sinclair/typebox").TString;
            aggregate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">, import("@sinclair/typebox").TLiteral<"performance">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"reputation">, import("@sinclair/typebox").TLiteral<"economy">]>;
            type: import("@sinclair/typebox").TString;
            version: import("@sinclair/typebox").TInteger;
            occurred_at: import("@sinclair/typebox").TString;
            actor: import("@sinclair/typebox").TString;
            correlation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            causation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            payload: import("@sinclair/typebox").TUnknown;
            contract_version: import("@sinclair/typebox").TString;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        }>>;
        source: import("@sinclair/typebox").TString;
        produced_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
        context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            transfer_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            aggregate_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            aggregate_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">, import("@sinclair/typebox").TLiteral<"performance">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"reputation">, import("@sinclair/typebox").TLiteral<"economy">]>>;
        }>>;
        saga: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            saga_id: import("@sinclair/typebox").TString;
            step: import("@sinclair/typebox").TInteger;
            total_steps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            direction: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"forward">, import("@sinclair/typebox").TLiteral<"compensation">]>;
        }>>;
    }>>;
    readonly lifecycleTransitionPayload: () => TypeCheck<import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        previous_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"DORMANT">, import("@sinclair/typebox").TLiteral<"PROVISIONING">, import("@sinclair/typebox").TLiteral<"ACTIVE">, import("@sinclair/typebox").TLiteral<"SUSPENDED">, import("@sinclair/typebox").TLiteral<"TRANSFERRED">, import("@sinclair/typebox").TLiteral<"ARCHIVED">]>;
        new_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"DORMANT">, import("@sinclair/typebox").TLiteral<"PROVISIONING">, import("@sinclair/typebox").TLiteral<"ACTIVE">, import("@sinclair/typebox").TLiteral<"SUSPENDED">, import("@sinclair/typebox").TLiteral<"TRANSFERRED">, import("@sinclair/typebox").TLiteral<"ARCHIVED">]>;
        reason: import("@sinclair/typebox").TString;
        reason_code: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"owner_requested" | "budget_exhausted" | "inactivity_timeout" | "transfer_initiated" | "transfer_completed" | "admin_action" | "provisioning_complete" | "provisioning_failed" | "policy_violation" | "system_maintenance" | "sanction_warning_issued" | "sanction_rate_limited" | "sanction_pool_restricted" | "sanction_suspended" | "sanction_terminated" | "sanction_appealed_successfully">[]>>;
        triggered_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        transfer_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    readonly capability: () => TypeCheck<import("@sinclair/typebox").TObject<{
        skill_id: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        input_modes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        output_modes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        max_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>>;
    readonly capabilityQuery: () => TypeCheck<import("@sinclair/typebox").TObject<{
        required_skills: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        preferred_models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        max_latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        min_context_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>>;
    readonly capabilityResponse: () => TypeCheck<import("@sinclair/typebox").TObject<{
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
    }>>;
    readonly protocolDiscovery: () => TypeCheck<import("@sinclair/typebox").TObject<{
        contract_version: import("@sinclair/typebox").TString;
        min_supported_version: import("@sinclair/typebox").TString;
        schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        supported_aggregates: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        capabilities_url: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        expression_versions_supported: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        providers: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            provider: import("@sinclair/typebox").TString;
            model_count: import("@sinclair/typebox").TInteger;
            conformance_level: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            supports_reservations: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
            reservation_enforcement: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"advisory">, import("@sinclair/typebox").TLiteral<"unsupported">]>>;
            total_capacity_tokens_per_minute: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        }>>>;
        conformance_suite_version: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    readonly sagaContext: () => TypeCheck<import("@sinclair/typebox").TObject<{
        saga_id: import("@sinclair/typebox").TString;
        step: import("@sinclair/typebox").TInteger;
        total_steps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        direction: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"forward">, import("@sinclair/typebox").TLiteral<"compensation">]>;
    }>>;
    readonly accessPolicy: () => TypeCheck<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">, import("@sinclair/typebox").TLiteral<"reputation_gated">]>;
        duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        min_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>>;
        audit_required: import("@sinclair/typebox").TBoolean;
        revocable: import("@sinclair/typebox").TBoolean;
    }>>;
    readonly healthStatus: () => TypeCheck<import("@sinclair/typebox").TObject<{
        healthy: import("@sinclair/typebox").TBoolean;
        latency_ms: import("@sinclair/typebox").TInteger;
        provider: import("@sinclair/typebox").TString;
        model_id: import("@sinclair/typebox").TString;
        checked_at: import("@sinclair/typebox").TString;
        error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        circuit_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"closed">, import("@sinclair/typebox").TLiteral<"open">, import("@sinclair/typebox").TLiteral<"half_open">]>;
    }>>;
    readonly thinkingTrace: () => TypeCheck<import("@sinclair/typebox").TObject<{
        content: import("@sinclair/typebox").TString;
        model_id: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TString;
        tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        redacted: import("@sinclair/typebox").TBoolean;
        trace_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    readonly toolCall: () => TypeCheck<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        arguments: import("@sinclair/typebox").TString;
        model_source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    readonly routingConstraint: () => TypeCheck<import("@sinclair/typebox").TObject<{
        required_capabilities: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        max_cost_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        min_health: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        allowed_providers: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        trust_level: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"authenticated">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">]>>;
        min_reputation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly performanceRecord: () => TypeCheck<import("@sinclair/typebox").TObject<{
        record_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        billing_entry_id: import("@sinclair/typebox").TString;
        occurred_at: import("@sinclair/typebox").TString;
        output: import("@sinclair/typebox").TObject<{
            tokens_consumed: import("@sinclair/typebox").TInteger;
            model_used: import("@sinclair/typebox").TString;
        }>;
        outcome: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            user_rating: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            resolution_signal: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
            amplification_count: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            outcome_validated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
            validated_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        }>>;
        dividend_target: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"commons">, import("@sinclair/typebox").TLiteral<"mixed">]>>;
        dividend_split_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly contributionRecord: () => TypeCheck<import("@sinclair/typebox").TObject<{
        contribution_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        contribution_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"curation">, import("@sinclair/typebox").TLiteral<"training">, import("@sinclair/typebox").TLiteral<"validation">, import("@sinclair/typebox").TLiteral<"moderation">, import("@sinclair/typebox").TLiteral<"infrastructure">, import("@sinclair/typebox").TLiteral<"capital">]>;
        value_micro: import("@sinclair/typebox").TString;
        assessed_by: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"self">, import("@sinclair/typebox").TLiteral<"peer">, import("@sinclair/typebox").TLiteral<"algorithmic">, import("@sinclair/typebox").TLiteral<"governance_vote">]>;
        assessed_at: import("@sinclair/typebox").TString;
        evidence_event_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly sanction: () => TypeCheck<import("@sinclair/typebox").TObject<{
        sanction_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        severity: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"warning" | "rate_limited" | "pool_restricted" | "suspended" | "terminated">[]>;
        trigger: import("@sinclair/typebox").TObject<{
            violation_type: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"content_policy" | "rate_abuse" | "billing_fraud" | "identity_spoofing" | "resource_exhaustion" | "community_guideline" | "safety_violation">[]>;
            occurrence_count: import("@sinclair/typebox").TInteger;
            evidence_event_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        }>;
        imposed_by: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"automatic">, import("@sinclair/typebox").TLiteral<"moderator">, import("@sinclair/typebox").TLiteral<"governance_vote">]>;
        imposed_at: import("@sinclair/typebox").TString;
        appeal_available: import("@sinclair/typebox").TBoolean;
        expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        escalation_rule_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contract_version: import("@sinclair/typebox").TString;
        severity_level: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"rate_limited">, import("@sinclair/typebox").TLiteral<"pool_restricted">, import("@sinclair/typebox").TLiteral<"suspended">]>>;
        duration_seconds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        appeal_dispute_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        escalated_from: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    readonly disputeRecord: () => TypeCheck<import("@sinclair/typebox").TObject<{
        dispute_id: import("@sinclair/typebox").TString;
        filed_by: import("@sinclair/typebox").TString;
        filed_against: import("@sinclair/typebox").TString;
        dispute_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"quality">, import("@sinclair/typebox").TLiteral<"safety">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"ownership">, import("@sinclair/typebox").TLiteral<"behavioral">]>;
        evidence: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            event_id: import("@sinclair/typebox").TString;
            description: import("@sinclair/typebox").TString;
        }>>;
        filed_at: import("@sinclair/typebox").TString;
        resolution: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            outcome: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"upheld">, import("@sinclair/typebox").TLiteral<"dismissed">, import("@sinclair/typebox").TLiteral<"compromised">]>;
            resolved_at: import("@sinclair/typebox").TString;
            sanction_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            credit_note_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly validatedOutcome: () => TypeCheck<import("@sinclair/typebox").TObject<{
        validation_id: import("@sinclair/typebox").TString;
        performance_record_id: import("@sinclair/typebox").TString;
        validator_agent_id: import("@sinclair/typebox").TString;
        validator_stake_micro: import("@sinclair/typebox").TString;
        rating: import("@sinclair/typebox").TNumber;
        validated_at: import("@sinclair/typebox").TString;
        dispute_outcome: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"upheld">, import("@sinclair/typebox").TLiteral<"overturned">, import("@sinclair/typebox").TLiteral<"split">]>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly reputationScore: () => TypeCheck<import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        score: import("@sinclair/typebox").TNumber;
        components: import("@sinclair/typebox").TObject<{
            outcome_quality: import("@sinclair/typebox").TNumber;
            performance_consistency: import("@sinclair/typebox").TNumber;
            dispute_ratio: import("@sinclair/typebox").TNumber;
            community_standing: import("@sinclair/typebox").TNumber;
        }>;
        sample_size: import("@sinclair/typebox").TInteger;
        last_updated: import("@sinclair/typebox").TString;
        decay_applied: import("@sinclair/typebox").TBoolean;
        identity_anchor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            provider: import("@sinclair/typebox").TString;
            verified_at: import("@sinclair/typebox").TString;
        }>>;
        min_unique_validators: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        validation_graph_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly escrowEntry: () => TypeCheck<import("@sinclair/typebox").TObject<{
        escrow_id: import("@sinclair/typebox").TString;
        payer_id: import("@sinclair/typebox").TString;
        payee_id: import("@sinclair/typebox").TString;
        amount_micro: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"held">, import("@sinclair/typebox").TLiteral<"released">, import("@sinclair/typebox").TLiteral<"disputed">, import("@sinclair/typebox").TLiteral<"refunded">, import("@sinclair/typebox").TLiteral<"expired">]>;
        held_at: import("@sinclair/typebox").TString;
        released_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        dispute_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly stakePosition: () => TypeCheck<import("@sinclair/typebox").TObject<{
        stake_id: import("@sinclair/typebox").TString;
        staker_id: import("@sinclair/typebox").TString;
        target_id: import("@sinclair/typebox").TString;
        amount_micro: import("@sinclair/typebox").TString;
        stake_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"conviction">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"validation">]>;
        vesting: import("@sinclair/typebox").TObject<{
            schedule: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"immediate">, import("@sinclair/typebox").TLiteral<"performance_gated">, import("@sinclair/typebox").TLiteral<"time_gated">]>;
            vested_micro: import("@sinclair/typebox").TString;
            remaining_micro: import("@sinclair/typebox").TString;
        }>;
        staked_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly commonsDividend: () => TypeCheck<import("@sinclair/typebox").TObject<{
        dividend_id: import("@sinclair/typebox").TString;
        pool_id: import("@sinclair/typebox").TString;
        total_micro: import("@sinclair/typebox").TString;
        governance: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"mod_discretion">, import("@sinclair/typebox").TLiteral<"member_vote">, import("@sinclair/typebox").TLiteral<"algorithmic">, import("@sinclair/typebox").TLiteral<"stake_weighted">]>;
        period_start: import("@sinclair/typebox").TString;
        period_end: import("@sinclair/typebox").TString;
        source_performance_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        distribution: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                address: import("@sinclair/typebox").TString;
                role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">, import("@sinclair/typebox").TLiteral<"agent_performer">, import("@sinclair/typebox").TLiteral<"commons">]>;
                share_bps: import("@sinclair/typebox").TInteger;
                amount_micro: import("@sinclair/typebox").TString;
            }>>;
        }>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly mutualCredit: () => TypeCheck<import("@sinclair/typebox").TObject<{
        credit_id: import("@sinclair/typebox").TString;
        creditor_id: import("@sinclair/typebox").TString;
        debtor_id: import("@sinclair/typebox").TString;
        amount_micro: import("@sinclair/typebox").TString;
        credit_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"refund">, import("@sinclair/typebox").TLiteral<"prepayment">, import("@sinclair/typebox").TLiteral<"obligation">, import("@sinclair/typebox").TLiteral<"delegation">]>;
        issued_at: import("@sinclair/typebox").TString;
        settled: import("@sinclair/typebox").TBoolean;
        settled_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        settlement: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            settlement_method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"direct_payment">, import("@sinclair/typebox").TLiteral<"reciprocal_performance">, import("@sinclair/typebox").TLiteral<"commons_contribution">, import("@sinclair/typebox").TLiteral<"forgiven">]>;
        }>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly completionRequest: () => TypeCheck<import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        tenant_id: import("@sinclair/typebox").TString;
        nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        trace_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        session_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        model: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        execution_mode: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"native_runtime">, import("@sinclair/typebox").TLiteral<"remote_model">]>>;
        messages: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
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
        }>>;
        tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TLiteral<"function">;
            function: import("@sinclair/typebox").TObject<{
                name: import("@sinclair/typebox").TString;
                description: import("@sinclair/typebox").TString;
                parameters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
            }>;
        }>>>;
        tool_choice: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"auto">, import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"required">, import("@sinclair/typebox").TObject<{
            type: import("@sinclair/typebox").TLiteral<"function">;
            function: import("@sinclair/typebox").TObject<{
                name: import("@sinclair/typebox").TString;
            }>;
        }>]>>;
        temperature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        max_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        top_p: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        stop_sequences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            enabled: import("@sinclair/typebox").TBoolean;
            budget_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        }>>;
        budget_limit_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly completionResult: () => TypeCheck<import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TString;
        model: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TString;
        content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TLiteral<"function">;
            function: import("@sinclair/typebox").TObject<{
                name: import("@sinclair/typebox").TString;
                arguments: import("@sinclair/typebox").TString;
            }>;
        }>>>;
        finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
        usage: import("@sinclair/typebox").TObject<{
            prompt_tokens: import("@sinclair/typebox").TInteger;
            completion_tokens: import("@sinclair/typebox").TInteger;
            reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            total_tokens: import("@sinclair/typebox").TInteger;
            cost_micro: import("@sinclair/typebox").TString;
        }>;
        latency_ms: import("@sinclair/typebox").TInteger;
        pricing_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            input_per_million_micro: import("@sinclair/typebox").TString;
            output_per_million_micro: import("@sinclair/typebox").TString;
            thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly modelCapabilities: () => TypeCheck<import("@sinclair/typebox").TObject<{
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
    }>>;
    readonly providerWireMessage: () => TypeCheck<import("@sinclair/typebox").TObject<{
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
    }>>;
    readonly toolDefinition: () => TypeCheck<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TLiteral<"function">;
        function: import("@sinclair/typebox").TObject<{
            name: import("@sinclair/typebox").TString;
            description: import("@sinclair/typebox").TString;
            parameters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
        }>;
    }>>;
    readonly toolResult: () => TypeCheck<import("@sinclair/typebox").TObject<{
        role: import("@sinclair/typebox").TLiteral<"tool">;
        tool_call_id: import("@sinclair/typebox").TString;
        content: import("@sinclair/typebox").TString;
    }>>;
    readonly ensembleRequest: () => TypeCheck<import("@sinclair/typebox").TObject<{
        ensemble_id: import("@sinclair/typebox").TString;
        strategy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"dialogue">]>;
        models: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        timeout_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        task_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        request: import("@sinclair/typebox").TObject<{
            request_id: import("@sinclair/typebox").TString;
            agent_id: import("@sinclair/typebox").TString;
            tenant_id: import("@sinclair/typebox").TString;
            nft_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            trace_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            session_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            model: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            execution_mode: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"native_runtime">, import("@sinclair/typebox").TLiteral<"remote_model">]>>;
            messages: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
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
            }>>;
            tools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                type: import("@sinclair/typebox").TLiteral<"function">;
                function: import("@sinclair/typebox").TObject<{
                    name: import("@sinclair/typebox").TString;
                    description: import("@sinclair/typebox").TString;
                    parameters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
                }>;
            }>>>;
            tool_choice: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"auto">, import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"required">, import("@sinclair/typebox").TObject<{
                type: import("@sinclair/typebox").TLiteral<"function">;
                function: import("@sinclair/typebox").TObject<{
                    name: import("@sinclair/typebox").TString;
                }>;
            }>]>>;
            temperature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            max_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            top_p: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            stop_sequences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                enabled: import("@sinclair/typebox").TBoolean;
                budget_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>>;
            budget_limit_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>;
        consensus_threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        dialogue_config: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            max_rounds: import("@sinclair/typebox").TInteger;
            pass_thinking_traces: import("@sinclair/typebox").TBoolean;
            termination: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed_rounds">, import("@sinclair/typebox").TLiteral<"consensus_reached">, import("@sinclair/typebox").TLiteral<"no_new_insights">]>;
            seed_prompt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly ensembleResult: () => TypeCheck<import("@sinclair/typebox").TObject<{
        ensemble_id: import("@sinclair/typebox").TString;
        strategy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"dialogue">]>;
        selected: import("@sinclair/typebox").TObject<{
            request_id: import("@sinclair/typebox").TString;
            model: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TString;
            content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                id: import("@sinclair/typebox").TString;
                type: import("@sinclair/typebox").TLiteral<"function">;
                function: import("@sinclair/typebox").TObject<{
                    name: import("@sinclair/typebox").TString;
                    arguments: import("@sinclair/typebox").TString;
                }>;
            }>>>;
            finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
            usage: import("@sinclair/typebox").TObject<{
                prompt_tokens: import("@sinclair/typebox").TInteger;
                completion_tokens: import("@sinclair/typebox").TInteger;
                reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                total_tokens: import("@sinclair/typebox").TInteger;
                cost_micro: import("@sinclair/typebox").TString;
            }>;
            latency_ms: import("@sinclair/typebox").TInteger;
            pricing_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                input_per_million_micro: import("@sinclair/typebox").TString;
                output_per_million_micro: import("@sinclair/typebox").TString;
                thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            }>>;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>;
        candidates: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            request_id: import("@sinclair/typebox").TString;
            model: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TString;
            content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                id: import("@sinclair/typebox").TString;
                type: import("@sinclair/typebox").TLiteral<"function">;
                function: import("@sinclair/typebox").TObject<{
                    name: import("@sinclair/typebox").TString;
                    arguments: import("@sinclair/typebox").TString;
                }>;
            }>>>;
            finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
            usage: import("@sinclair/typebox").TObject<{
                prompt_tokens: import("@sinclair/typebox").TInteger;
                completion_tokens: import("@sinclair/typebox").TInteger;
                reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                total_tokens: import("@sinclair/typebox").TInteger;
                cost_micro: import("@sinclair/typebox").TString;
            }>;
            latency_ms: import("@sinclair/typebox").TInteger;
            pricing_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                input_per_million_micro: import("@sinclair/typebox").TString;
                output_per_million_micro: import("@sinclair/typebox").TString;
                thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            }>>;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        consensus_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        rounds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            round: import("@sinclair/typebox").TInteger;
            model: import("@sinclair/typebox").TString;
            response: import("@sinclair/typebox").TObject<{
                request_id: import("@sinclair/typebox").TString;
                model: import("@sinclair/typebox").TString;
                provider: import("@sinclair/typebox").TString;
                content: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
                thinking: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
                tool_calls: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
                    id: import("@sinclair/typebox").TString;
                    type: import("@sinclair/typebox").TLiteral<"function">;
                    function: import("@sinclair/typebox").TObject<{
                        name: import("@sinclair/typebox").TString;
                        arguments: import("@sinclair/typebox").TString;
                    }>;
                }>>>;
                finish_reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"stop">, import("@sinclair/typebox").TLiteral<"tool_calls">, import("@sinclair/typebox").TLiteral<"length">, import("@sinclair/typebox").TLiteral<"content_filter">]>;
                usage: import("@sinclair/typebox").TObject<{
                    prompt_tokens: import("@sinclair/typebox").TInteger;
                    completion_tokens: import("@sinclair/typebox").TInteger;
                    reasoning_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                    total_tokens: import("@sinclair/typebox").TInteger;
                    cost_micro: import("@sinclair/typebox").TString;
                }>;
                latency_ms: import("@sinclair/typebox").TInteger;
                pricing_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
                    input_per_million_micro: import("@sinclair/typebox").TString;
                    output_per_million_micro: import("@sinclair/typebox").TString;
                    thinking_per_million_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
                }>>;
                metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
                contract_version: import("@sinclair/typebox").TString;
            }>;
            thinking_trace: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>>;
        termination_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed_rounds">, import("@sinclair/typebox").TLiteral<"consensus_reached">, import("@sinclair/typebox").TLiteral<"no_new_insights">, import("@sinclair/typebox").TLiteral<"timeout">, import("@sinclair/typebox").TLiteral<"budget_exhausted">]>>;
        rounds_completed: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        rounds_requested: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        consensus_method: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"majority_vote">, import("@sinclair/typebox").TLiteral<"unanimous">, import("@sinclair/typebox").TLiteral<"arbiter_decision">, import("@sinclair/typebox").TLiteral<"score_threshold">]>>;
        position_changes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            round: import("@sinclair/typebox").TInteger;
            model: import("@sinclair/typebox").TString;
            from_position: import("@sinclair/typebox").TString;
            to_position: import("@sinclair/typebox").TString;
            reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>>;
        total_cost_micro: import("@sinclair/typebox").TString;
        total_latency_ms: import("@sinclair/typebox").TInteger;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly agentRequirements: () => TypeCheck<import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        requires_native_runtime: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        requires_tool_calling: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        requires_thinking_traces: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        requires_vision: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        preferred_models: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        min_context_tokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly budgetScope: () => TypeCheck<import("@sinclair/typebox").TObject<{
        scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"project">, import("@sinclair/typebox").TLiteral<"sprint">, import("@sinclair/typebox").TLiteral<"phase">, import("@sinclair/typebox").TLiteral<"conversation">]>;
        scope_id: import("@sinclair/typebox").TString;
        limit_micro: import("@sinclair/typebox").TString;
        spent_micro: import("@sinclair/typebox").TString;
        action_on_exceed: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"block">, import("@sinclair/typebox").TLiteral<"warn">, import("@sinclair/typebox").TLiteral<"downgrade">]>;
        contract_version: import("@sinclair/typebox").TString;
        reserved_capacity_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        reservation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        preference_signal: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            bid_priority: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"critical">]>;
            preferred_pools: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            cost_sensitivity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"low">, import("@sinclair/typebox").TLiteral<"medium">, import("@sinclair/typebox").TLiteral<"high">]>;
        }>>;
    }>>;
    readonly routingResolution: () => TypeCheck<import("@sinclair/typebox").TObject<{
        resolved_model: import("@sinclair/typebox").TString;
        original_request_model: import("@sinclair/typebox").TString;
        resolution_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"fallback">, import("@sinclair/typebox").TLiteral<"budget_downgrade">, import("@sinclair/typebox").TLiteral<"capability_match">]>;
        reason: import("@sinclair/typebox").TString;
        latency_ms: import("@sinclair/typebox").TInteger;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly constraintProposal: () => TypeCheck<import("@sinclair/typebox").TObject<{
        proposal_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        target_schema_id: import("@sinclair/typebox").TString;
        proposed_constraints: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            expression: import("@sinclair/typebox").TString;
            severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
            message: import("@sinclair/typebox").TString;
            fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        }>>;
        rationale: import("@sinclair/typebox").TString;
        expression_version: import("@sinclair/typebox").TString;
        sunset_version: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        review_status: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"under_review">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"rejected">]>>;
        review_scores: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            reviewer_model: import("@sinclair/typebox").TString;
            score: import("@sinclair/typebox").TInteger;
            rationale: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>>;
        consensus_category: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"HIGH_CONSENSUS">, import("@sinclair/typebox").TLiteral<"DISPUTED">, import("@sinclair/typebox").TLiteral<"LOW_VALUE">, import("@sinclair/typebox").TLiteral<"BLOCKER">]>>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    readonly modelProviderSpec: () => TypeCheck<import("@sinclair/typebox").TObject<{
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
    }>>;
    readonly conformanceLevel: () => TypeCheck<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"self_declared">, import("@sinclair/typebox").TLiteral<"community_verified">, import("@sinclair/typebox").TLiteral<"protocol_certified">]>>;
    readonly agentCapacityReservation: () => TypeCheck<import("@sinclair/typebox").TObject<{
        reservation_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        conformance_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"self_declared">, import("@sinclair/typebox").TLiteral<"community_verified">, import("@sinclair/typebox").TLiteral<"protocol_certified">]>;
        reserved_capacity_bps: import("@sinclair/typebox").TInteger;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"expired">, import("@sinclair/typebox").TLiteral<"revoked">]>;
        effective_from: import("@sinclair/typebox").TString;
        effective_until: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        budget_scope_id: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    }>>;
    readonly auditTrailEntry: () => TypeCheck<import("@sinclair/typebox").TObject<{
        entry_id: import("@sinclair/typebox").TString;
        completion_id: import("@sinclair/typebox").TString;
        billing_entry_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        provider: import("@sinclair/typebox").TString;
        model_id: import("@sinclair/typebox").TString;
        cost_micro: import("@sinclair/typebox").TString;
        timestamp: import("@sinclair/typebox").TString;
        conservation_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"conserved">, import("@sinclair/typebox").TLiteral<"violated">, import("@sinclair/typebox").TLiteral<"unverifiable">]>;
        contract_version: import("@sinclair/typebox").TString;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    }>>;
};
//# sourceMappingURL=index.d.ts.map