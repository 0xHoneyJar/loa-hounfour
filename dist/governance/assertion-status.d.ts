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
import { type Static } from '@sinclair/typebox';
export declare const AssertionStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"candidate">, import("@sinclair/typebox").TLiteral<"admitted">, import("@sinclair/typebox").TLiteral<"superseded">, import("@sinclair/typebox").TLiteral<"challenged">, import("@sinclair/typebox").TLiteral<"revoked">, import("@sinclair/typebox").TLiteral<"forgotten">, import("@sinclair/typebox").TLiteral<"escrow">, import("@sinclair/typebox").TLiteral<"archived">]>;
export type AssertionStatus = Static<typeof AssertionStatusSchema>;
//# sourceMappingURL=assertion-status.d.ts.map