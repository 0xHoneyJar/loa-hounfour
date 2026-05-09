/**
 * Protocol discovery schema for runtime negotiation.
 *
 * A `/.well-known/loa-hounfour` endpoint convention enables automatic
 * protocol version detection and schema discovery — the same pattern
 * as `/.well-known/openid-configuration` for OAuth and `llms.txt`
 * for AI agent discovery.
 *
 * @see BB-V3-006 — Schema discovery convention
 */
import { type Static } from '@sinclair/typebox';
/**
 * Summary of a registered model provider (v5.1.0).
 */
export declare const ProviderSummarySchema: import("@sinclair/typebox").TObject<{
    provider: import("@sinclair/typebox").TString;
    model_count: import("@sinclair/typebox").TInteger;
    conformance_level: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    supports_reservations: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    reservation_enforcement: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"advisory">, import("@sinclair/typebox").TLiteral<"unsupported">]>>;
    total_capacity_tokens_per_minute: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type ProviderSummary = Static<typeof ProviderSummarySchema>;
/**
 * Protocol discovery document served at `/.well-known/loa-hounfour`.
 */
export declare const ProtocolDiscoverySchema: import("@sinclair/typebox").TObject<{
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
}>;
export type ProtocolDiscovery = Static<typeof ProtocolDiscoverySchema>;
/**
 * Options for building a discovery document (v5.1.0).
 */
export interface BuildDiscoveryOptions {
    aggregateTypes?: string[];
    capabilitiesUrl?: string;
    expressionVersions?: string[];
    /** v5.1.0 — Provider summaries for the discovery document. */
    providers?: ProviderSummary[];
    /** v5.1.0 — Conformance suite version. */
    conformanceSuiteVersion?: string;
}
/**
 * Build a discovery document from the current package state.
 *
 * @example Options object (recommended):
 * ```typescript
 * const doc = buildDiscoveryDocument(
 *   ['https://loa-hounfour.dev/schemas/BillingEntry', 'https://loa-hounfour.dev/schemas/CompletionResult'],
 *   {
 *     aggregateTypes: ['billing', 'completion'],
 *     capabilitiesUrl: 'https://api.example.com/capabilities',
 *     expressionVersions: ['1.0', '2.0'],
 *     providers: [
 *       { provider: 'openai', model_count: 4, supports_reservations: true },
 *     ],
 *   },
 * );
 * ```
 *
 * @example Legacy positional arguments (deprecated):
 * ```typescript
 * // @deprecated -- Use options object overload instead.
 * const doc = buildDiscoveryDocument(
 *   ['https://loa-hounfour.dev/schemas/BillingEntry'],
 *   ['billing'],
 *   'https://api.example.com/capabilities',
 *   ['1.0'],
 * );
 * ```
 *
 * @throws {Error} If any schemaId is not a valid URI (must start with https://)
 * @throws {Error} If capabilitiesUrl is not a valid https:// URI
 */
export declare function buildDiscoveryDocument(schemaIds: string[], options: BuildDiscoveryOptions): ProtocolDiscovery;
/**
 * Build a discovery document from the current package state.
 *
 * @deprecated Use the options object overload instead.
 */
export declare function buildDiscoveryDocument(schemaIds: string[], aggregateTypes?: string[], capabilitiesUrl?: string, expressionVersions?: string[]): ProtocolDiscovery;
//# sourceMappingURL=discovery.d.ts.map