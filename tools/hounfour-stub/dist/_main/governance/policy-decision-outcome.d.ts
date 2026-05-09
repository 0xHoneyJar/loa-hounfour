/**
 * Outcome enum for policy-decision shapes (`AccessDecision.outcome`,
 * `SignerCompetenceResult.outcome`).
 *
 * 5 members covering the spectrum from definitely-allow to
 * definitely-reject plus the two intermediate review states. Hounfour
 * ships the *shape* — consumers ship the policy that picks one of
 * these outcomes; per ADR-010 the library does not adjudicate.
 *
 * RULE-1 of the class-vs-policy lint flags exported function returns
 * carrying this union outside `src/validators/`. *Enum values* used
 * inside policy-decision shapes (this file) are not lint targets;
 * exported policy-evaluator functions returning the union are.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.2)
 */
import { type Static } from '@sinclair/typebox';
export declare const PolicyDecisionOutcomeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"allow">, import("@sinclair/typebox").TLiteral<"deny">, import("@sinclair/typebox").TLiteral<"needs_review">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"rejected">]>;
export type PolicyDecisionOutcome = Static<typeof PolicyDecisionOutcomeSchema>;
//# sourceMappingURL=policy-decision-outcome.d.ts.map