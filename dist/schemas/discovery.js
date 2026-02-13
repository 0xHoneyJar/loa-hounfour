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
import { Type } from '@sinclair/typebox';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../version.js';
/**
 * Protocol discovery document served at `/.well-known/loa-hounfour`.
 */
export const ProtocolDiscoverySchema = Type.Object({
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Current contract version',
    }),
    min_supported_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Minimum version this endpoint supports',
    }),
    schemas: Type.Array(Type.String({
        format: 'uri',
        description: 'Schema $id URL',
    }), {
        description: 'List of supported schema $id URLs',
    }),
    supported_aggregates: Type.Optional(Type.Array(Type.String(), {
        description: 'Supported aggregate types (e.g. "agent", "billing")',
    })),
}, {
    $id: 'ProtocolDiscovery',
    additionalProperties: false,
    description: 'Protocol discovery document for /.well-known/loa-hounfour',
});
/**
 * Build a discovery document from the current package state.
 *
 * @param schemaIds - List of supported schema $id URLs (must be valid URIs)
 * @param aggregateTypes - Optional list of supported aggregate types
 * @throws {Error} If any schemaId is not a valid URI (must start with https://)
 */
export function buildDiscoveryDocument(schemaIds, aggregateTypes) {
    const invalid = schemaIds.filter(id => {
        try {
            const url = new URL(id);
            return url.protocol !== 'https:';
        }
        catch {
            return true;
        }
    });
    if (invalid.length > 0) {
        throw new Error(`Invalid schema IDs (must be valid https:// URIs): ${invalid.join(', ')}`);
    }
    return {
        contract_version: CONTRACT_VERSION,
        min_supported_version: MIN_SUPPORTED_VERSION,
        schemas: schemaIds,
        ...(aggregateTypes ? { supported_aggregates: aggregateTypes } : {}),
    };
}
//# sourceMappingURL=discovery.js.map