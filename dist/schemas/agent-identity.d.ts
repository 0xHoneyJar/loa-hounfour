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
import { type Static } from '@sinclair/typebox';
/**
 * Trust level assigned to an agent within a capability scope.
 *
 * Trust levels form a total order: untrusted < basic < verified < trusted < sovereign.
 * Delegation requires 'verified' or above within the delegation scope.
 *
 * @governance protocol-fixed
 */
export declare const TrustLevelSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
export type TrustLevel = Static<typeof TrustLevelSchema>;
/**
 * Ordered trust levels for comparison.
 */
export declare const TRUST_LEVELS: readonly ["untrusted", "basic", "verified", "trusted", "sovereign"];
/**
 * Minimum trust level required for delegation authority.
 */
export declare const DELEGATION_TRUST_THRESHOLD: TrustLevel;
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
export declare const CapabilityScopeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"audit">, import("@sinclair/typebox").TLiteral<"composition">]>;
export type CapabilityScope = Static<typeof CapabilityScopeSchema>;
export declare const CAPABILITY_SCOPES: readonly ["billing", "governance", "inference", "delegation", "audit", "composition"];
/**
 * Capability-scoped trust — per-scope trust levels with a default fallback.
 *
 * The `scopes` record maps each CapabilityScope to an independent TrustLevel.
 * The `default_level` provides the trust level for any scope not explicitly listed.
 *
 * This replaces the flat trust_level field from v5.5.0, enabling partial-order
 * authorization: an agent can be sovereign for billing but basic for governance.
 */
export declare const CapabilityScopedTrustSchema: import("@sinclair/typebox").TObject<{
    scopes: import("@sinclair/typebox").TObject<{
        billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
        governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
        inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
        delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
        audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
        composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
    }>;
    default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
}>;
export type CapabilityScopedTrust = Static<typeof CapabilityScopedTrustSchema>;
/**
 * Agent type classification.
 *
 * @governance registry-extensible
 */
export declare const AgentTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
export type AgentType = Static<typeof AgentTypeSchema>;
/**
 * Canonical agent identity schema (v6.0.0).
 *
 * BREAKING: `trust_level` replaced with `trust_scopes`.
 * Use `parseAgentIdentity()` for dual-read migration from v5.5.0 data.
 */
export declare const AgentIdentitySchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
    display_name: import("@sinclair/typebox").TString;
    agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
    capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    trust_scopes: import("@sinclair/typebox").TObject<{
        scopes: import("@sinclair/typebox").TObject<{
            billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
            governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
            inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
            delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
            audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
            composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
        }>;
        default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
    }>;
    delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    max_delegation_depth: import("@sinclair/typebox").TInteger;
    governance_weight: import("@sinclair/typebox").TNumber;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type AgentIdentity = Static<typeof AgentIdentitySchema>;
/**
 * Get the ordinal index of a trust level in the hierarchy.
 * untrusted=0, basic=1, verified=2, trusted=3, sovereign=4.
 */
export declare function trustLevelIndex(level: TrustLevel): number;
/**
 * Get the trust level for a specific capability scope.
 * Falls back to `default_level` if the scope is not explicitly set.
 */
export declare function trustLevelForScope(trust: CapabilityScopedTrust, scope: CapabilityScope): TrustLevel;
/**
 * Check if a trust level meets or exceeds a threshold within a specific scope.
 */
export declare function meetsThresholdForScope(trust: CapabilityScopedTrust, scope: CapabilityScope, threshold: TrustLevel): boolean;
/**
 * Compute the effective (minimum) trust level across all defined scopes.
 * This provides backward-compatible "worst-case" trust for code that
 * needs a single trust level (e.g., display, logging).
 */
export declare function effectiveTrustLevel(trust: CapabilityScopedTrust): TrustLevel;
/**
 * Convert a flat v5.5.0 trust level to v6.0.0 CapabilityScopedTrust.
 * Sets all scopes to the same level — the conservative migration path.
 */
export declare function flatTrustToScoped(level: TrustLevel): CapabilityScopedTrust;
/**
 * Parse agent identity data from either v5.5.0 or v6.0.0 format.
 *
 * This dual-read adapter enables gradual migration:
 * - v5.5.0 data (with `trust_level`): auto-converts via `flatTrustToScoped()`
 * - v6.0.0 data (with `trust_scopes`): passes through unchanged
 *
 * @throws if the input doesn't match either format after conversion
 */
export declare function parseAgentIdentity(data: unknown): AgentIdentity;
//# sourceMappingURL=agent-identity.d.ts.map