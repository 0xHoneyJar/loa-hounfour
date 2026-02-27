/**
 * Agent Identity Schema — canonical identity for protocol participants.
 *
 * v6.0.0 BREAKING: Replaces flat `trust_level` with `trust_scopes`
 * (CapabilityScopedTrust). Trust is now per-capability-scope, enabling
 * an agent to be `sovereign` for billing but only `basic` for governance.
 *
 * Includes dual-read adapter (FL-SPRINT-001) for migration from v5.5.0.
 *
 * @see SDD §2.2 — Capability-Scoped Trust (FR-2)
 * @see SDD §2.6 — Agent Identity
 * @since v5.5.0 (trust_level), v6.0.0 (trust_scopes — BREAKING)
 */
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
/**
 * Trust level assigned to an agent within a capability scope.
 *
 * Trust levels form a total order: untrusted < basic < verified < trusted < sovereign.
 * Delegation requires 'verified' or above within the delegation scope.
 *
 * @governance protocol-fixed
 */
export const TrustLevelSchema = Type.Union([
    Type.Literal('untrusted'),
    Type.Literal('basic'),
    Type.Literal('verified'),
    Type.Literal('trusted'),
    Type.Literal('sovereign'),
], {
    $id: 'TrustLevel',
    description: 'Trust level assigned to an agent. Forms a total order from untrusted to sovereign.',
});
/**
 * Ordered trust levels for comparison.
 */
export const TRUST_LEVELS = ['untrusted', 'basic', 'verified', 'trusted', 'sovereign'];
/**
 * Minimum trust level required for delegation authority.
 */
export const DELEGATION_TRUST_THRESHOLD = 'verified';
/**
 * Capability scope — the domain within which a trust level applies.
 *
 * Each scope represents an independent axis of authorization:
 * - billing: financial operations, cost allocation, budget management
 * - governance: voting, proposal creation, parameter changes
 * - inference: model invocation, completion requests
 * - delegation: authority delegation to other agents
 * - audit: read access to audit trails, transaction history
 * - composition: multi-agent ensemble orchestration (v6.0.0)
 *
 * @governance registry-extensible
 */
export const CapabilityScopeSchema = Type.Union([
    Type.Literal('billing'),
    Type.Literal('governance'),
    Type.Literal('inference'),
    Type.Literal('delegation'),
    Type.Literal('audit'),
    Type.Literal('composition'),
], {
    $id: 'CapabilityScope',
    description: 'Domain within which a trust level applies (v6.0.0).',
});
export const CAPABILITY_SCOPES = [
    'billing', 'governance', 'inference', 'delegation', 'audit', 'composition',
];
/**
 * Capability-scoped trust — per-scope trust levels with a default fallback.
 *
 * The `scopes` record maps each CapabilityScope to an independent TrustLevel.
 * The `default_level` provides the trust level for any scope not explicitly listed.
 *
 * This replaces the flat trust_level field from v5.5.0, enabling partial-order
 * authorization: an agent can be sovereign for billing but basic for governance.
 */
export const CapabilityScopedTrustSchema = Type.Object({
    scopes: Type.Object({
        billing: Type.Optional(TrustLevelSchema),
        governance: Type.Optional(TrustLevelSchema),
        inference: Type.Optional(TrustLevelSchema),
        delegation: Type.Optional(TrustLevelSchema),
        audit: Type.Optional(TrustLevelSchema),
        composition: Type.Optional(TrustLevelSchema),
    }, {
        additionalProperties: false,
        description: 'Per-scope trust levels. Missing scopes fall back to default_level.',
    }),
    default_level: TrustLevelSchema,
}, {
    $id: 'CapabilityScopedTrust',
    additionalProperties: false,
    description: 'Per-capability-scope trust levels with default fallback (v6.0.0, BREAKING).',
});
/**
 * Agent type classification.
 *
 * @governance registry-extensible
 */
export const AgentTypeSchema = Type.Union([
    Type.Literal('model'),
    Type.Literal('orchestrator'),
    Type.Literal('human'),
    Type.Literal('service'),
    Type.Literal('composite'),
], {
    $id: 'AgentType',
    description: 'Classification of agent type in the protocol.',
});
/**
 * Canonical agent identity schema (v6.0.0).
 *
 * BREAKING: `trust_level` replaced with `trust_scopes`.
 * Use `parseAgentIdentity()` for dual-read migration from v5.5.0 data.
 */
export const AgentIdentitySchema = Type.Object({
    agent_id: Type.String({
        pattern: '^[a-z][a-z0-9_-]{2,63}$',
        description: 'Unique agent identifier (lowercase, 3-64 chars).',
    }),
    display_name: Type.String({
        minLength: 1,
        maxLength: 128,
        description: 'Human-readable agent display name.',
    }),
    agent_type: AgentTypeSchema,
    capabilities: Type.Array(Type.String({ minLength: 1 }), {
        minItems: 1,
        description: 'Non-empty list of agent capabilities.',
    }),
    trust_scopes: CapabilityScopedTrustSchema,
    delegation_authority: Type.Array(Type.String({ minLength: 1 }), {
        description: 'Permissions this agent may delegate. Requires delegation scope >= verified.',
    }),
    max_delegation_depth: Type.Integer({
        minimum: 0,
        maximum: 10,
        description: 'Maximum delegation chain depth this agent may create.',
    }),
    governance_weight: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Voting weight in governance proposals (0-1).',
    }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
        description: 'Extensible metadata key-value store.',
    })),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'AgentIdentity',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Canonical agent identity with capability-scoped trust (v6.0.0, BREAKING).',
});
// ---------------------------------------------------------------------------
// Trust Helper Functions (S1-T7)
// ---------------------------------------------------------------------------
/**
 * Get the ordinal index of a trust level in the hierarchy.
 * untrusted=0, basic=1, verified=2, trusted=3, sovereign=4.
 */
export function trustLevelIndex(level) {
    const idx = TRUST_LEVELS.indexOf(level);
    if (idx === -1)
        throw new RangeError(`Unknown trust level: ${level}`);
    return idx;
}
/**
 * Get the trust level for a specific capability scope.
 * Falls back to `default_level` if the scope is not explicitly set.
 */
export function trustLevelForScope(trust, scope) {
    return trust.scopes[scope] ?? trust.default_level;
}
/**
 * Check if a trust level meets or exceeds a threshold within a specific scope.
 */
export function meetsThresholdForScope(trust, scope, threshold) {
    return trustLevelIndex(trustLevelForScope(trust, scope)) >= trustLevelIndex(threshold);
}
/**
 * Compute the effective (minimum) trust level across all defined scopes.
 * This provides backward-compatible "worst-case" trust for code that
 * needs a single trust level (e.g., display, logging).
 */
export function effectiveTrustLevel(trust) {
    let minIdx = trustLevelIndex(trust.default_level);
    for (const scope of CAPABILITY_SCOPES) {
        const level = trust.scopes[scope];
        if (level !== undefined) {
            const idx = trustLevelIndex(level);
            if (idx < minIdx)
                minIdx = idx;
        }
    }
    return TRUST_LEVELS[minIdx];
}
/**
 * Convert a flat v5.5.0 trust level to v6.0.0 CapabilityScopedTrust.
 * Sets all scopes to the same level — the conservative migration path.
 */
export function flatTrustToScoped(level) {
    const scopes = {};
    for (const scope of CAPABILITY_SCOPES) {
        scopes[scope] = level;
    }
    return { scopes: scopes, default_level: level };
}
/**
 * Parse agent identity data from either v5.5.0 or v6.0.0 format.
 *
 * This dual-read adapter enables gradual migration:
 * - v5.5.0 data (with `trust_level`): auto-converts via `flatTrustToScoped()`
 * - v6.0.0 data (with `trust_scopes`): passes through unchanged
 *
 * @throws if the input doesn't match either format after conversion
 */
export function parseAgentIdentity(data) {
    if (typeof data !== 'object' || data === null) {
        throw new TypeError('parseAgentIdentity: input must be a non-null object');
    }
    const record = data;
    // v6.0.0 format — has trust_scopes
    if ('trust_scopes' in record && record.trust_scopes !== undefined) {
        if (!Value.Check(AgentIdentitySchema, data)) {
            const errors = [...Value.Errors(AgentIdentitySchema, data)];
            throw new TypeError(`parseAgentIdentity: invalid v6.0.0 data: ${errors[0]?.message ?? 'unknown error'}`);
        }
        return data;
    }
    // v5.5.0 format — has trust_level, convert to trust_scopes
    if ('trust_level' in record && typeof record.trust_level === 'string') {
        const v550 = record;
        const { trust_level, ...rest } = v550;
        const converted = {
            ...rest,
            trust_scopes: flatTrustToScoped(trust_level),
        };
        if (!Value.Check(AgentIdentitySchema, converted)) {
            const errors = [...Value.Errors(AgentIdentitySchema, converted)];
            throw new TypeError(`parseAgentIdentity: invalid v5.5.0 data after conversion: ${errors[0]?.message ?? 'unknown error'}`);
        }
        return converted;
    }
    throw new TypeError('parseAgentIdentity: input has neither trust_scopes (v6.0.0) nor trust_level (v5.5.0)');
}
//# sourceMappingURL=agent-identity.js.map