import { type Static } from '@sinclair/typebox';
/**
 * Personality tier classification for agent bears.
 *
 * @see SDD §2.2 — PersonalityAssignment Schema (FR-2)
 */
export declare const PersonalityTierSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"premium">]>;
export type PersonalityTier = Static<typeof PersonalityTierSchema>;
/**
 * Personality assignment binding an NFT to its personality configuration.
 *
 * Fields `archetype`, `ancestor`, `era`, and `element` are extensible strings —
 * the protocol defines structure, not domain vocabulary. Exact enum values
 * live in the consuming service's personality configuration.
 *
 * @see SDD §2.2 — PersonalityAssignment Schema (FR-2)
 */
export declare const PersonalityAssignmentSchema: import("@sinclair/typebox").TObject<{
    token_id: import("@sinclair/typebox").TString;
    archetype: import("@sinclair/typebox").TString;
    ancestor: import("@sinclair/typebox").TString;
    era: import("@sinclair/typebox").TString;
    element: import("@sinclair/typebox").TString;
    tier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"premium">]>;
    fingerprint_hash: import("@sinclair/typebox").TString;
}>;
export type PersonalityAssignment = Static<typeof PersonalityAssignmentSchema>;
//# sourceMappingURL=personality-assignment.d.ts.map