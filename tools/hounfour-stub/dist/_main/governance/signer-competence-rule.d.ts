/**
 * Layer-3 rule that decides whether a signer's trust profile is
 * sufficient to authorize a matched action.
 *
 * The rule's `action_pattern` is a glob-or-regex-ish action descriptor
 * (consumer-defined matching strategy); when an action matches the
 * pattern, the consumer compares the signer's `CapabilityScopedTrust`
 * against `required_capability_scopes` per `match_strategy` (default
 * `'subset'`). Hounfour ships the *shape* — the pattern matcher and
 * the comparator are consumer concerns per ADR-010.
 *
 * `required_capability_scopes` MUST bind to the canonical
 * `CapabilityScope` vocabulary; ORD-5 sub-rule (warn mode) emits a
 * `vocabulary_drift` manifest entry when consumer payloads include
 * non-canonical scope keys.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/authority-cascade.md
 * @since v8.5.0 (PR-A2.2)
 */
import { type Static } from '@sinclair/typebox';
export declare const SignerCompetenceRuleSchema: import("@sinclair/typebox").TObject<{
    rule_id: import("@sinclair/typebox").TString;
    action_pattern: import("@sinclair/typebox").TString;
    required_capability_scopes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"inference">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"audit">, import("@sinclair/typebox").TLiteral<"composition">]>>;
    threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    revoked: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type SignerCompetenceRule = Static<typeof SignerCompetenceRuleSchema>;
//# sourceMappingURL=signer-competence-rule.d.ts.map