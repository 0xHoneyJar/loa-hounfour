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
import { Type } from '@sinclair/typebox';
export const CommitmentTypeSchema = Type.Union([
    Type.Literal('estate_checkpoint', {
        description: 'Periodic snapshot anchor for an AgentEstate.',
    }),
    Type.Literal('recall_receipt', {
        description: 'Anchor for a RecallReceipt body hash.',
    }),
    Type.Literal('transition_bundle', {
        description: 'Anchor for an estate-transition bundle (cycle-005 EstateTransition successor).',
    }),
    Type.Literal('revocation_checkpoint', {
        description: 'Anchor for a sanctions/revocation checkpoint roll-up.',
    }),
], {
    $id: 'CommitmentType',
    description: 'Discriminator vocabulary for CommitmentRoot. Four substrate-agnostic categories: estate_checkpoint | recall_receipt | transition_bundle | revocation_checkpoint.',
});
//# sourceMappingURL=commitment-type.js.map