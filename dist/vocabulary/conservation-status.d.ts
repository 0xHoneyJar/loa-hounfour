import { type Static } from '@sinclair/typebox';
/**
 * Conservation verification status — tristate result of pricing conservation check.
 *
 * Instance of the Epistemic Tristate pattern (docs/patterns/epistemic-tristate.md):
 * - `conserved`: known good — billing cost matches protocol-computed cost (delta === 0).
 * - `violated`: known bad — billing cost differs from computed cost (delta !== 0).
 * - `unverifiable`: unknown — conservation cannot be determined (e.g., missing pricing_snapshot).
 *
 * @governance protocol-fixed
 * @see SDD §3.1 — ConservationResult tristate
 * @see docs/patterns/epistemic-tristate.md — Pattern documentation
 */
export declare const ConservationStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"conserved">, import("@sinclair/typebox").TLiteral<"violated">, import("@sinclair/typebox").TLiteral<"unverifiable">]>;
export type ConservationStatus = Static<typeof ConservationStatusSchema>;
/** All conservation statuses. */
export declare const CONSERVATION_STATUSES: readonly ConservationStatus[];
//# sourceMappingURL=conservation-status.d.ts.map