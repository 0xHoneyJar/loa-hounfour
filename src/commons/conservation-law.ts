/**
 * ConservationLaw schema — defines invariants that must hold for a governed resource.
 *
 * Conservation laws declare named expressions that are evaluated before/after
 * state transitions. The enforcement mode controls whether violations halt
 * or warn.
 *
 * @see SDD §4.2 — ConservationLaw (FR-1.2)
 * @see constraints/GRAMMAR.md — Expression grammar for invariant expressions
 * @since v8.0.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { InvariantSchema } from './invariant.js';

/**
 * Conservation law with named invariant expressions and enforcement policy.
 *
 * Constraint (SKP-001): strict enforcement requires non-empty invariants.
 */
export const ConservationLawSchema = Type.Object(
  {
    invariants: Type.Array(InvariantSchema, {
      description:
        'Named expressions that must hold before/after state transitions. '
        + 'When enforcement is strict, at least one invariant is required.',
    }),
    enforcement: Type.Union(
      [Type.Literal('strict'), Type.Literal('advisory')],
      {
        description:
          'strict: violation halts and records audit event. '
          + 'advisory: violation warns and records audit event.',
      },
    ),
    scope: Type.Union(
      [Type.Literal('per-entry'), Type.Literal('aggregate')],
      {
        description:
          'per-entry: evaluated per state transition. '
          + 'aggregate: evaluated across all entries in the resource.',
      },
    ),
  },
  {
    $id: 'ConservationLaw',
    additionalProperties: false,
  },
);

export type ConservationLaw = Static<typeof ConservationLawSchema>;
