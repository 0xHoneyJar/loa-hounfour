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
import { Type } from '@sinclair/typebox';
export const PolicyDecisionOutcomeSchema = Type.Union([
    Type.Literal('allow', {
        description: 'Action is permitted; consumer may proceed.',
    }),
    Type.Literal('deny', {
        description: 'Action is denied; consumer MUST NOT proceed.',
    }),
    Type.Literal('needs_review', {
        description: 'Decision deferred to a human or higher-trust process. Consumer holds the action.',
    }),
    Type.Literal('verified', {
        description: 'Cryptographic / class-validation step succeeded. Pair with another field for the policy verdict.',
    }),
    Type.Literal('rejected', {
        description: 'Cryptographic / class-validation step failed. Distinct from policy-level deny.',
    }),
], {
    $id: 'PolicyDecisionOutcome',
    description: 'Outcome enum for policy-decision shapes (AccessDecision.outcome, SignerCompetenceResult.outcome). 5 substrate-agnostic members.',
});
//# sourceMappingURL=policy-decision-outcome.js.map