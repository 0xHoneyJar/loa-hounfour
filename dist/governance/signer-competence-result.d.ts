/**
 * Outcome record produced by evaluating a signer's competence against
 * an action and a `SignerCompetenceRule`.
 *
 * Hounfour ships the *shape* of the result; the consumer's policy
 * engine fills it in. `outcome` is a `PolicyDecisionOutcome` so the
 * result aligns with the broader `AccessDecision` vocabulary that the
 * v8.5.0 EXTEND threads through the economic boundary.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/authority-cascade.md
 * @since v8.5.0 (PR-A2.2)
 */
import { type Static } from '@sinclair/typebox';
export declare const SignerCompetenceResultSchema: import("@sinclair/typebox").TObject<{
    result_id: import("@sinclair/typebox").TString;
    signer_id: import("@sinclair/typebox").TString;
    rule_id_matched: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    outcome: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"allow">, import("@sinclair/typebox").TLiteral<"deny">, import("@sinclair/typebox").TLiteral<"needs_review">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"rejected">]>;
    evaluated_at: import("@sinclair/typebox").TString;
}>;
export type SignerCompetenceResult = Static<typeof SignerCompetenceResultSchema>;
//# sourceMappingURL=signer-competence-result.d.ts.map