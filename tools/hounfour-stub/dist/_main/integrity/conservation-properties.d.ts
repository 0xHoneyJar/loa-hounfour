/**
 * Conservation Properties — formalized invariants with LTL temporal logic.
 *
 * Each property specifies an economic truth that must hold across all system
 * states. The LTL formula provides a machine-verifiable specification;
 * the enforcement field classifies how the runtime ensures compliance.
 *
 * Extracted from arrakis conservation-properties.ts (the Linux→POSIX pattern).
 *
 * @see SDD §2.1 — Conservation Properties (FR-1)
 * @see Issue #13 §1 — 14 conservation properties from arrakis
 * @see arXiv:2512.16856 — Distributional AGI Safety
 */
import { type Static } from '@sinclair/typebox';
/**
 * Enforcement mechanism for a conservation invariant.
 */
export declare const EnforcementMechanismSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"db_check">, import("@sinclair/typebox").TLiteral<"application">, import("@sinclair/typebox").TLiteral<"reconciliation">, import("@sinclair/typebox").TLiteral<"db_unique">]>;
export type EnforcementMechanism = Static<typeof EnforcementMechanismSchema>;
export declare const ENFORCEMENT_MECHANISMS: readonly EnforcementMechanism[];
/**
 * Universe (scope) of a conservation invariant.
 */
export declare const InvariantUniverseSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"single_lot">, import("@sinclair/typebox").TLiteral<"account">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"bilateral">]>;
export type InvariantUniverse = Static<typeof InvariantUniverseSchema>;
/**
 * A single conservation invariant with LTL temporal logic specification.
 */
export declare const ConservationPropertySchema: import("@sinclair/typebox").TObject<{
    invariant_id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    ltl_formula: import("@sinclair/typebox").TString;
    universe: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"single_lot">, import("@sinclair/typebox").TLiteral<"account">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"bilateral">]>;
    enforcement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"db_check">, import("@sinclair/typebox").TLiteral<"application">, import("@sinclair/typebox").TLiteral<"reconciliation">, import("@sinclair/typebox").TLiteral<"db_unique">]>;
    error_codes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    reconciliation_failure_codes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"critical">, import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ConservationProperty = Static<typeof ConservationPropertySchema>;
/**
 * Registry of all conservation properties for an economic system.
 */
export declare const ConservationPropertyRegistrySchema: import("@sinclair/typebox").TObject<{
    registry_id: import("@sinclair/typebox").TString;
    properties: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        invariant_id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        ltl_formula: import("@sinclair/typebox").TString;
        universe: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"single_lot">, import("@sinclair/typebox").TLiteral<"account">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"bilateral">]>;
        enforcement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"db_check">, import("@sinclair/typebox").TLiteral<"application">, import("@sinclair/typebox").TLiteral<"reconciliation">, import("@sinclair/typebox").TLiteral<"db_unique">]>;
        error_codes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        reconciliation_failure_codes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"critical">, import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    total_count: import("@sinclair/typebox").TInteger;
    coverage: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TInteger>;
    liveness_properties: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        liveness_id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        ltl_formula: import("@sinclair/typebox").TString;
        companion_safety: import("@sinclair/typebox").TString;
        universe: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"single_lot">, import("@sinclair/typebox").TLiteral<"account">, import("@sinclair/typebox").TLiteral<"platform">, import("@sinclair/typebox").TLiteral<"bilateral">]>;
        timeout_behavior: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"reaper">, import("@sinclair/typebox").TLiteral<"escalation">, import("@sinclair/typebox").TLiteral<"reconciliation">, import("@sinclair/typebox").TLiteral<"manual">]>;
        timeout_seconds: import("@sinclair/typebox").TInteger;
        error_codes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"critical">, import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    liveness_count: import("@sinclair/typebox").TInteger;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ConservationPropertyRegistry = Static<typeof ConservationPropertyRegistrySchema>;
/**
 * Canonical 14 conservation properties extracted from arrakis.
 *
 * @see Issue #13 §1 — original arrakis conservation-properties.ts
 */
export declare const CANONICAL_CONSERVATION_PROPERTIES: readonly ConservationProperty[];
//# sourceMappingURL=conservation-properties.d.ts.map