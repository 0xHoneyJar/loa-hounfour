/**
 * GovernedCredits — governed credit lot schema.
 *
 * Maps to loa-freeside's lot_invariant (I-1 through I-5).
 * Conservation law: balance + reserved + consumed == original_allocation.
 *
 * @see SDD §4.5.1 — GovernedCredits
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Governed credit lot with conservation law enforcement.
 *
 * All financial values are string-encoded micro-USD (^[0-9]+$) — no floating point.
 */
export declare const GovernedCreditsSchema: import("@sinclair/typebox").TObject<{
    conservation_law: import("@sinclair/typebox").TObject<{
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
    audit_trail: import("@sinclair/typebox").TObject<{
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
    state_machine: import("@sinclair/typebox").TObject<{
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
    governance_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"protocol-fixed">, import("@sinclair/typebox").TLiteral<"registry-extensible">, import("@sinclair/typebox").TLiteral<"community-defined">]>;
    version: import("@sinclair/typebox").TInteger;
    access_policy_ref: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    governance_extensions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    contract_version: import("@sinclair/typebox").TString;
    lot_id: import("@sinclair/typebox").TString;
    balance: import("@sinclair/typebox").TString;
    original_allocation: import("@sinclair/typebox").TString;
    reserved: import("@sinclair/typebox").TString;
    consumed: import("@sinclair/typebox").TString;
    currency: import("@sinclair/typebox").TLiteral<"micro-usd">;
}>;
export type GovernedCredits = Static<typeof GovernedCreditsSchema>;
//# sourceMappingURL=governed-credits.d.ts.map