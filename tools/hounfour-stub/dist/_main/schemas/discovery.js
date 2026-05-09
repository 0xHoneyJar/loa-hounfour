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
import { ReservationEnforcementSchema } from '../vocabulary/reservation-enforcement.js';
/**
 * Summary of a registered model provider (v5.1.0).
 */
export const ProviderSummarySchema = Type.Object({
    provider: Type.String({ minLength: 1, description: 'Provider identifier (e.g. "openai", "anthropic")' }),
    model_count: Type.Integer({ minimum: 0, description: 'Number of active models from this provider' }),
    conformance_level: Type.Optional(Type.String({ description: 'Highest conformance level achieved by any model from this provider' })),
    // v5.2.0 — Marketplace discovery dimensions
    supports_reservations: Type.Optional(Type.Boolean({ description: 'Whether this provider supports capacity reservations' })),
    reservation_enforcement: Type.Optional(ReservationEnforcementSchema),
    total_capacity_tokens_per_minute: Type.Optional(Type.Integer({ minimum: 0, description: 'Total capacity in tokens per minute across all models from this provider' })),
}, {
    additionalProperties: false,
    description: 'Summary of a registered model provider',
});
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
    capabilities_url: Type.Optional(Type.String({
        format: 'uri',
        description: 'URL for capability negotiation endpoint — connects discovery to capability queries',
    })),
    expression_versions_supported: Type.Optional(Type.Array(Type.String({
        pattern: '^\\d+\\.\\d+$',
        description: 'Constraint expression grammar version (e.g. "1.0", "2.0")',
    }), {
        description: 'Supported constraint expression grammar versions for version negotiation',
    })),
    // v5.1.0 — Provider summary and conformance suite
    providers: Type.Optional(Type.Array(ProviderSummarySchema, {
        description: 'Summary of registered model providers',
    })),
    conformance_suite_version: Type.Optional(Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Version of the conformance test suite used (e.g. "5.1.0")',
    })),
}, {
    $id: 'ProtocolDiscovery',
    additionalProperties: false,
    description: 'Protocol discovery document for /.well-known/loa-hounfour',
});
export function buildDiscoveryDocument(schemaIds, optionsOrAggregateTypes, capabilitiesUrl, expressionVersions) {
    // Normalize: support both legacy positional args and new options object
    let opts;
    if (Array.isArray(optionsOrAggregateTypes)) {
        opts = { aggregateTypes: optionsOrAggregateTypes, capabilitiesUrl, expressionVersions };
    }
    else if (optionsOrAggregateTypes && typeof optionsOrAggregateTypes === 'object') {
        opts = optionsOrAggregateTypes;
    }
    else {
        opts = { capabilitiesUrl, expressionVersions };
    }
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
    if (opts.capabilitiesUrl !== undefined) {
        try {
            const url = new URL(opts.capabilitiesUrl);
            if (url.protocol !== 'https:') {
                throw new Error(`capabilities_url must be https://, got ${url.protocol}`);
            }
        }
        catch (e) {
            if (e instanceof Error && e.message.startsWith('capabilities_url'))
                throw e;
            throw new Error(`Invalid capabilities_url (must be valid https:// URI): ${opts.capabilitiesUrl}`);
        }
    }
    return {
        contract_version: CONTRACT_VERSION,
        min_supported_version: MIN_SUPPORTED_VERSION,
        schemas: schemaIds,
        ...(opts.aggregateTypes ? { supported_aggregates: opts.aggregateTypes } : {}),
        ...(opts.capabilitiesUrl ? { capabilities_url: opts.capabilitiesUrl } : {}),
        ...(opts.expressionVersions ? { expression_versions_supported: opts.expressionVersions } : {}),
        ...(opts.providers ? { providers: opts.providers } : {}),
        ...(opts.conformanceSuiteVersion ? { conformance_suite_version: opts.conformanceSuiteVersion } : {}),
    };
}
//# sourceMappingURL=discovery.js.map