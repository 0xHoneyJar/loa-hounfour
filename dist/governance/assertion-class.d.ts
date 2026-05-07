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
import { type Static } from '@sinclair/typebox';
export declare const AssertionClassSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
export type AssertionClass = Static<typeof AssertionClassSchema>;
//# sourceMappingURL=assertion-class.d.ts.map