import { type Static } from '@sinclair/typebox';
declare const AgentStatsSchema: import("@sinclair/typebox").TObject<{
    interactions: import("@sinclair/typebox").TInteger;
    uptime: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    last_active: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type AgentStats = Static<typeof AgentStatsSchema>;
export declare const AgentDescriptorSchema: import("@sinclair/typebox").TObject<{
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
}>;
export type AgentDescriptor = Static<typeof AgentDescriptorSchema>;
export {};
//# sourceMappingURL=agent-descriptor.d.ts.map