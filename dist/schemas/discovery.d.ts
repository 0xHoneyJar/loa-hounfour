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
 * Protocol discovery document served at `/.well-known/loa-hounfour`.
 */
export declare const ProtocolDiscoverySchema: import("@sinclair/typebox").TObject<{
    contract_version: import("@sinclair/typebox").TString;
    min_supported_version: import("@sinclair/typebox").TString;
    schemas: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    supported_aggregates: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type ProtocolDiscovery = Static<typeof ProtocolDiscoverySchema>;
/**
 * Build a discovery document from the current package state.
 *
 * @param schemaIds - List of supported schema $id URLs (must be valid URIs)
 * @param aggregateTypes - Optional list of supported aggregate types
 * @throws {Error} If any schemaId is not a valid URI (must start with https://)
 */
export declare function buildDiscoveryDocument(schemaIds: string[], aggregateTypes?: string[]): ProtocolDiscovery;
//# sourceMappingURL=discovery.d.ts.map