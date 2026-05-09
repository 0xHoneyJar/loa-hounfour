/**
 * `AssertionStatus` — lifecycle vocabulary for `Assertion`.
 *
 * Eight substrate-agnostic states: `candidate` (pre-admission) plus
 * seven post-admission states covering the assertion lifecycle.
 * The state machine itself (which transitions are valid) is
 * consumer-side per ADR-010 and surfaced via `Assertion`'s
 * runtime-deferred A3 manifest entry.
 *
 * Member set per `prd.md:454`.
 *
 * @see AssertionSchema
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { Type } from '@sinclair/typebox';
export const AssertionStatusSchema = Type.Union([
    Type.Literal('candidate', {
        description: 'Pre-admission; not yet signed. The only NON-crypto-bearing variant.',
    }),
    Type.Literal('admitted', {
        description: 'Signed and accepted into the assertion store.',
    }),
    Type.Literal('superseded', {
        description: 'Replaced by a newer admitted assertion; original signatures preserved.',
    }),
    Type.Literal('challenged', {
        description: 'Under formal challenge; signatures still meaningful for audit.',
    }),
    Type.Literal('revoked', {
        description: 'Invalidated by sanction; original signatures preserved for audit chain.',
    }),
    Type.Literal('forgotten', {
        description: 'Subject of a ForgetRecord; references forget_record_id (A2 manifest entry).',
    }),
    Type.Literal('escrow', {
        description: 'Awaiting reveal / unsealing; signatures present but content covered.',
    }),
    Type.Literal('archived', {
        description: 'Moved to cold storage; signatures preserved for provenance.',
    }),
], {
    $id: 'AssertionStatus',
    description: 'Lifecycle vocabulary for Assertion. Eight states: candidate (pre-admission, non-crypto-bearing) + admitted | superseded | challenged | revoked | forgotten | escrow | archived (post-admission, crypto-bearing).',
});
//# sourceMappingURL=assertion-status.js.map