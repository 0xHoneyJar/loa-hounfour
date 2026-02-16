import { Type, type Static } from '@sinclair/typebox';

/**
 * Conservation verification status — tristate result of pricing conservation check.
 *
 * Instance of the Epistemic Tristate pattern (docs/patterns/epistemic-tristate.md):
 * - `conserved`: known good — billing cost matches protocol-computed cost (delta === 0).
 * - `violated`: known bad — billing cost differs from computed cost (delta !== 0).
 * - `unverifiable`: unknown — conservation cannot be determined (e.g., missing pricing_snapshot).
 *
 * @see SDD §3.1 — ConservationResult tristate
 * @see docs/patterns/epistemic-tristate.md — Pattern documentation
 */
export const ConservationStatusSchema = Type.Union(
  [
    Type.Literal('conserved'),
    Type.Literal('violated'),
    Type.Literal('unverifiable'),
  ],
  {
    $id: 'ConservationStatus',
    description: 'Tristate result of pricing conservation verification.',
  },
);

export type ConservationStatus = Static<typeof ConservationStatusSchema>;

/** All conservation statuses. */
export const CONSERVATION_STATUSES: readonly ConservationStatus[] = [
  'conserved',
  'violated',
  'unverifiable',
] as const;
