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
 * Validate data against any TypeBox schema.
 *
 * @remarks For protocol schemas, prefer using the `validators` object
 * which provides pre-defined, cached validators for all protocol types.
 * This function creates and caches compiled validators for any schema,
 * which is suitable for a bounded set of schemas but not for
 * dynamically-generated schemas in long-running processes — the cache
 * has no eviction policy.
 *
 * @returns `{ valid: true }` or `{ valid: false, errors: [...] }`
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
        currency: import("@sinclair/typebox").TLiteral<"USD">;
        precision: import("@sinclair/typebox").TLiteral<6>;
        raw_cost_micro: import("@sinclair/typebox").TString;
        multiplier_bps: import("@sinclair/typebox").TInteger;
        total_cost_micro: import("@sinclair/typebox").TString;
        rounding_policy: import("@sinclair/typebox").TLiteral<"largest_remainder">;
        recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            address: import("@sinclair/typebox").TString;
            role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">]>;
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
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    }>>;
    readonly creditNote: () => TypeCheck<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        references_billing_entry: import("@sinclair/typebox").TString;
        reason: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"refund">, import("@sinclair/typebox").TLiteral<"dispute">, import("@sinclair/typebox").TLiteral<"partial_failure">, import("@sinclair/typebox").TLiteral<"adjustment">]>;
        amount_micro: import("@sinclair/typebox").TIntersect<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TString]>;
        recipients: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            address: import("@sinclair/typebox").TString;
            role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"producer">, import("@sinclair/typebox").TLiteral<"agent_tba">]>;
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
                type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">]>;
                duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
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
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">]>;
            duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
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
                type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">]>;
                duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
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
                type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"read_only">, import("@sinclair/typebox").TLiteral<"time_limited">, import("@sinclair/typebox").TLiteral<"role_based">]>;
                duration_hours: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                roles: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
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
        aggregate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">]>;
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
            aggregate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">]>;
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
            aggregate_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">]>>;
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
        reason_code: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"transfer_completed" | "owner_requested" | "budget_exhausted" | "inactivity_timeout" | "transfer_initiated" | "admin_action" | "provisioning_complete" | "provisioning_failed" | "policy_violation" | "system_maintenance">[]>>;
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
    }>>;
    readonly sagaContext: () => TypeCheck<import("@sinclair/typebox").TObject<{
        saga_id: import("@sinclair/typebox").TString;
        step: import("@sinclair/typebox").TInteger;
        total_steps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        direction: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"forward">, import("@sinclair/typebox").TLiteral<"compensation">]>;
    }>>;
};
//# sourceMappingURL=index.d.ts.map