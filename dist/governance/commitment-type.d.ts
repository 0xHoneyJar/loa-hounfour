/**
 * `CommitmentType` — discriminator vocabulary for `CommitmentRoot`.
 *
 * Four substrate-agnostic anchor categories covering the v8.5.0
 * commitment surface: estate checkpoint, recall receipt, transition
 * bundle, revocation checkpoint. Each commits a different kind of
 * artifact via its `subject_hash`.
 *
 * Per ADR-010 hounfour ships the *category vocabulary* (this enum)
 * plus the commitment envelope (`CommitmentRoot`); consumers ship
 * the policy that produces the committed artifact and the on-chain
 * adapter that anchors `CommitmentRoot` records.
 *
 * @see CommitmentRootSchema
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const CommitmentTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"estate_checkpoint">, import("@sinclair/typebox").TLiteral<"recall_receipt">, import("@sinclair/typebox").TLiteral<"transition_bundle">, import("@sinclair/typebox").TLiteral<"revocation_checkpoint">]>;
export type CommitmentType = Static<typeof CommitmentTypeSchema>;
//# sourceMappingURL=commitment-type.d.ts.map