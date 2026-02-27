/**
 * Protocol governance configuration — the beginning of governance-configurable parameters.
 *
 * GovernanceConfig allows protocol parameters to be overridden from their
 * hardcoded defaults. In v5.3.0, this covers reservation tier minimums and
 * advisory warning thresholds. Future versions will add more parameters.
 *
 * This is NOT a runtime configuration file. It is a protocol-level schema
 * that defines the structure of governance parameters. How these parameters
 * are proposed, debated, and adopted is out of scope for v5.3.0.
 *
 * @see SPEC-V52-001 — Bridgebuilder Review III finding
 * @see RESERVATION_TIER_MAP — default values
 * @see ADVISORY_WARNING_THRESHOLD_PERCENT — default advisory threshold
 */
import { type Static } from '@sinclair/typebox';
/**
 * Structured mission alignment declaration (v5.4.0 — BB-37 Finding #6).
 *
 * Replaces free-text string with structured type that supports categorization
 * and external reference. All fields optional except `statement`.
 */
export declare const MissionAlignmentSchema: import("@sinclair/typebox").TObject<{
    statement: import("@sinclair/typebox").TString;
    category: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"research">, import("@sinclair/typebox").TLiteral<"commerce">, import("@sinclair/typebox").TLiteral<"public_good">, import("@sinclair/typebox").TLiteral<"education">, import("@sinclair/typebox").TLiteral<"infrastructure">]>>;
    url: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type MissionAlignment = Static<typeof MissionAlignmentSchema>;
export declare const GovernanceConfigSchema: import("@sinclair/typebox").TObject<{
    governance_version: import("@sinclair/typebox").TString;
    reservation_tiers: import("@sinclair/typebox").TObject<{
        self_declared: import("@sinclair/typebox").TInteger;
        community_verified: import("@sinclair/typebox").TInteger;
        protocol_certified: import("@sinclair/typebox").TInteger;
    }>;
    advisory_warning_threshold_percent: import("@sinclair/typebox").TInteger;
    /** v5.4.0 — Sandbox economy permeability axis (Virtual Agent Economies, arXiv:2509.10147). */
    sandbox_permeability: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"impermeable">, import("@sinclair/typebox").TLiteral<"semi_permeable">, import("@sinclair/typebox").TLiteral<"permeable">]>>;
    sandbox_permeability_rationale: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    mission_alignment: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        statement: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"research">, import("@sinclair/typebox").TLiteral<"commerce">, import("@sinclair/typebox").TLiteral<"public_good">, import("@sinclair/typebox").TLiteral<"education">, import("@sinclair/typebox").TLiteral<"infrastructure">]>>;
        url: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type GovernanceConfig = Static<typeof GovernanceConfigSchema>;
/**
 * Default GovernanceConfig matching current hardcoded values.
 * Used as fallback when no explicit config is provided.
 */
export declare const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig;
//# sourceMappingURL=governance-config.d.ts.map