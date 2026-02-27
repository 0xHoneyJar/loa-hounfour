/**
 * Constraint Lifecycle Governance — the self-amending protocol.
 *
 * Connects GovernanceProposal outcomes to constraint file state transitions,
 * enabling communities to propose, validate, and enact constraint changes
 * through governance.
 *
 * In the FAANG framing, this is Ethereum's EIP process meets Google's
 * Zanzibar authorization lifecycle — community-governed protocol constraints
 * with formal verification via type signatures.
 *
 * @see DR-S4 — Constraint lifecycle governance
 * @since v7.6.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Lifecycle status of a protocol constraint.
 *
 * State machine:
 *   proposed → under_review → enacted | rejected
 *   enacted → deprecated
 *   rejected, deprecated → (terminal)
 */
export declare const ConstraintLifecycleStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"under_review">, import("@sinclair/typebox").TLiteral<"enacted">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"deprecated">]>;
export type ConstraintLifecycleStatus = Static<typeof ConstraintLifecycleStatusSchema>;
/**
 * Valid state transitions for constraint lifecycle.
 */
export declare const CONSTRAINT_LIFECYCLE_TRANSITIONS: Record<ConstraintLifecycleStatus, readonly ConstraintLifecycleStatus[]>;
/**
 * A constraint candidate proposed for enactment.
 *
 * Includes all fields necessary to define a constraint, plus an optional
 * dry_run_result from validation against the type signature. This enables
 * communities to verify constraint candidates before voting to enact them.
 *
 * @since v7.6.0 — DR-S4
 */
export declare const ConstraintCandidateSchema: import("@sinclair/typebox").TObject<{
    candidate_id: import("@sinclair/typebox").TString;
    constraint_id: import("@sinclair/typebox").TString;
    schema_id: import("@sinclair/typebox").TString;
    expression: import("@sinclair/typebox").TString;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"info">]>;
    type_signature: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TString>;
    fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    description: import("@sinclair/typebox").TString;
    dry_run_result: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        valid: import("@sinclair/typebox").TBoolean;
        errors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>>;
}>;
export type ConstraintCandidate = Static<typeof ConstraintCandidateSchema>;
/**
 * Records a state transition in a constraint's lifecycle.
 *
 * Links to the GovernanceProposal that drove the transition, creating
 * an audit trail from proposal to enactment.
 *
 * @since v7.6.0 — DR-S4
 */
export declare const ConstraintLifecycleEventSchema: import("@sinclair/typebox").TObject<{
    event_id: import("@sinclair/typebox").TString;
    constraint_id: import("@sinclair/typebox").TString;
    proposal_id: import("@sinclair/typebox").TString;
    from_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"under_review">, import("@sinclair/typebox").TLiteral<"enacted">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"deprecated">]>;
    to_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"under_review">, import("@sinclair/typebox").TLiteral<"enacted">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"deprecated">]>;
    enacted_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ConstraintLifecycleEvent = Static<typeof ConstraintLifecycleEventSchema>;
//# sourceMappingURL=constraint-lifecycle.d.ts.map