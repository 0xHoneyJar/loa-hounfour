/**
 * Routing policy schema — shape validation only.
 * Actual pool→provider:model mappings live in loa-finn config.
 *
 * @see SDD 4.5 — Pool Registry
 */
import { type Static } from '@sinclair/typebox';
/** Task type for routing decisions. */
export declare const TaskTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"chat">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"architecture">, import("@sinclair/typebox").TLiteral<"code">, import("@sinclair/typebox").TLiteral<"default">]>;
export type TaskType = Static<typeof TaskTypeSchema>;
/** Per-personality routing configuration. */
export declare const PersonalityRoutingSchema: import("@sinclair/typebox").TObject<{
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
}>;
export type PersonalityRouting = Static<typeof PersonalityRoutingSchema>;
/** Top-level routing policy validated against loa-hounfour. */
export declare const RoutingPolicySchema: import("@sinclair/typebox").TObject<{
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
}>;
export type RoutingPolicy = Static<typeof RoutingPolicySchema>;
//# sourceMappingURL=routing-policy.d.ts.map