/**
 * GovernedResource<T> governance fields spread constant + GovernanceMutation envelope.
 *
 * The GOVERNED_RESOURCE_FIELDS constant follows the same spread pattern as
 * COHORT_BASE_FIELDS in governance/cohort-base-fields.ts — concrete
 * instantiations spread these into their Type.Object definitions.
 *
 * @see SDD §4.1 — GovernedResource Governance Fields (FR-1.1)
 * @see SDD §4.7 — GovernanceMutation (Flatline SKP-004)
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Governance classification for a governed resource.
 * Maps to ADR-003/ADR-005 three-tier governance model.
 *
 * @governance protocol-fixed
 */
export declare const GovernanceClassSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"protocol-fixed">, import("@sinclair/typebox").TLiteral<"registry-extensible">, import("@sinclair/typebox").TLiteral<"community-defined">]>;
export type GovernanceClass = Static<typeof GovernanceClassSchema>;
/**
 * Shared governance fields that every GovernedResource<T> instantiation spreads.
 *
 * Usage pattern (same as COHORT_BASE_FIELDS):
 * ```typescript
 * export const GovernedCreditsSchema = Type.Object({
 *   // Resource-specific fields
 *   balance: Type.String({ pattern: '^[0-9]+$' }),
 *   // Governance fields (spread)
 *   ...GOVERNED_RESOURCE_FIELDS,
 * }, { $id: 'GovernedCredits', additionalProperties: false });
 * ```
 */
export declare const GOVERNED_RESOURCE_FIELDS: {
    readonly conservation_law: import("@sinclair/typebox").TObject<{
        invariants: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            invariant_id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            expression: import("@sinclair/typebox").TString;
            severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"info">]>;
            description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        enforcement: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"advisory">]>;
        scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"per-entry">, import("@sinclair/typebox").TLiteral<"aggregate">]>;
    }>;
    readonly audit_trail: import("@sinclair/typebox").TObject<{
        entries: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            entry_id: import("@sinclair/typebox").TString;
            timestamp: import("@sinclair/typebox").TString;
            event_type: import("@sinclair/typebox").TString;
            actor_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            payload: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
            entry_hash: import("@sinclair/typebox").TString;
            previous_hash: import("@sinclair/typebox").TString;
            hash_domain_tag: import("@sinclair/typebox").TString;
        }>>;
        hash_algorithm: import("@sinclair/typebox").TLiteral<"sha256">;
        genesis_hash: import("@sinclair/typebox").TString;
        integrity_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"unverified">, import("@sinclair/typebox").TLiteral<"quarantined">]>;
        checkpoint_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        checkpoint_index: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
    readonly state_machine: import("@sinclair/typebox").TObject<{
        states: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            name: import("@sinclair/typebox").TString;
            description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            entry_conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
            exit_conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        }>>;
        transitions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            from: import("@sinclair/typebox").TString;
            to: import("@sinclair/typebox").TString;
            event: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            guard: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        initial_state: import("@sinclair/typebox").TString;
        terminal_states: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    readonly governance_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"protocol-fixed">, import("@sinclair/typebox").TLiteral<"registry-extensible">, import("@sinclair/typebox").TLiteral<"community-defined">]>;
    readonly version: import("@sinclair/typebox").TInteger;
    readonly access_policy_ref: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    readonly governance_extensions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    readonly contract_version: import("@sinclair/typebox").TString;
};
/**
 * Mutation envelope for GovernedResource operations.
 *
 * Every mutation to a GovernedResource<T> is wrapped in this envelope
 * for idempotency and optimistic concurrency control.
 *
 * @see SDD §4.7 — Concurrency Model (Flatline SKP-004)
 */
export declare const GovernanceMutationSchema: import("@sinclair/typebox").TObject<{
    mutation_id: import("@sinclair/typebox").TString;
    expected_version: import("@sinclair/typebox").TInteger;
    mutated_at: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
}>;
export type GovernanceMutation = Static<typeof GovernanceMutationSchema>;
//# sourceMappingURL=governed-resource.d.ts.map