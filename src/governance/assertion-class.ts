/**
 * `AssertionClass` — illocutionary-force vocabulary for `Assertion`.
 *
 * Substrate-agnostic core of seven distinct speech-act categories
 * (per D-006 in NOTES.md, locked at PR-A2.1 design-freeze gate),
 * plus a 3-segment dotted-string namespace fallback for consumer
 * extension following the same `<github-org>:<consumer>:<class>`
 * pattern as `SurfaceContext`.
 *
 * Each core member captures a distinct illocutionary force the
 * substrate-agnostic core MUST differentiate between (consent ≠
 * delegation; observation ≠ attestation; commitment ≠ disclosure).
 * Narrower sets collapse meaningfully different speech acts;
 * broader sets re-introduce wedge-fittedness.
 *
 * Hounfour does NOT register or arbitrate consumer namespace
 * uniqueness — that is consumer-coordination concern.
 *
 * @see AssertionSchema
 * @see SurfaceContextSchema — same 3-segment namespace pattern
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { Type, type Static } from '@sinclair/typebox';

export const AssertionClassSchema = Type.Union(
  [
    Type.Literal('attestation', {
      description: 'Generic "I sign this fact"; the most common form, used when the assertion is a witnessed claim.',
    }),
    Type.Literal('observation', {
      description: '"I witnessed X" without a normative judgment; lower-rigor sibling of attestation.',
    }),
    Type.Literal('assessment', {
      description: '"I evaluate Z" (rating / score / quality); bridges with the reputation domain.',
    }),
    Type.Literal('consent', {
      description: '"I authorize Y" (permission grant); paired with delegation but distinct from authority transfer.',
    }),
    Type.Literal('delegation', {
      description: '"I transfer authority to" (proxy / agency); composes with v8.4.0 OrgRepresentativeDelegation.',
    }),
    Type.Literal('commitment', {
      description: '"I bind myself to" (promise / pledge); composes with the v8.5.0 CommitmentRoot primitive.',
    }),
    Type.Literal('disclosure', {
      description: '"I disclose facts about" (transparency / report); covers transparency_report / incident_record cases.',
    }),
    Type.String({
      pattern: '^[a-z][a-z0-9]+:[a-z][a-z0-9_-]+:[a-z][a-z0-9_-]+$',
      description:
        '3-segment consumer namespace: <github-org>:<consumer>:<class>. Hounfour does not register namespaces; uniqueness is consumer-coordination concern.',
    }),
  ],
  {
    $id: 'AssertionClass',
    description:
      'Illocutionary-force vocabulary for Assertion. Substrate-agnostic core of 7 speech-act categories (attestation | observation | assessment | consent | delegation | commitment | disclosure) plus a 3-segment consumer namespace fallback. Member set locked at PR-A2.1 design-freeze gate per D-006.',
  },
);

export type AssertionClass = Static<typeof AssertionClassSchema>;
