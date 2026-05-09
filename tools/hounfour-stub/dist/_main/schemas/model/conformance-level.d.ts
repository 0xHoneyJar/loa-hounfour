import { type Static } from '@sinclair/typebox';
/**
 * Conformance level vocabulary for provider trust verification.
 *
 * Graduated trust model (Ostrom Principle 1 — Boundaries):
 * - self_declared: Provider asserts conformance without verification
 * - community_verified: Conformance vectors pass community review
 * - protocol_certified: Full conformance suite + governance approval
 */
export declare const ConformanceLevelSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"self_declared">, import("@sinclair/typebox").TLiteral<"community_verified">, import("@sinclair/typebox").TLiteral<"protocol_certified">]>;
export type ConformanceLevel = Static<typeof ConformanceLevelSchema>;
/** Ordered levels from least to most trusted. */
export declare const CONFORMANCE_LEVEL_ORDER: Record<ConformanceLevel, number>;
//# sourceMappingURL=conformance-level.d.ts.map