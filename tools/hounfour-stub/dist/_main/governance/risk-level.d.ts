/**
 * `RiskLevel` — risk classification for `Assertion` payloads.
 *
 * Four substrate-agnostic ordinal levels covering the spectrum from
 * routine to severe. The classification is vocabulary only; *risk
 * thresholds* (what triggers panel routing, sanctions, escalation)
 * are consumer-side per ADR-010.
 *
 * Member set locked in PR-A2.3 reuse-audit.
 *
 * @see AssertionSchema
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const RiskLevelSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
export type RiskLevel = Static<typeof RiskLevelSchema>;
//# sourceMappingURL=risk-level.d.ts.map