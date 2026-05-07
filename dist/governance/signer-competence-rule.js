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
import { Type } from '@sinclair/typebox';
import { CapabilityScopeSchema } from '../schemas/agent-identity.js';
export const SignerCompetenceRuleSchema = Type.Object({
    rule_id: Type.String({
        format: 'uuid',
        description: 'Stable opaque identifier for this rule (UUID v4).',
    }),
    action_pattern: Type.String({
        minLength: 1,
        maxLength: 256,
        description: 'Action descriptor matched against incoming action references. Consumer-defined matching strategy (glob, regex, prefix); hounfour does not interpret.',
    }),
    required_capability_scopes: Type.Array(CapabilityScopeSchema, {
        minItems: 1,
        description: 'Capability scopes a signer\'s trust profile MUST satisfy for this rule to authorize. Bind to the canonical CapabilityScope vocabulary; consumer-side extensions trigger an ORD-5 vocabulary_drift manifest entry (warn mode).',
    }),
    threshold: Type.Optional(Type.Integer({
        minimum: 1,
        maximum: 1000,
        description: 'Optional minimum precedence_score for matching SignerEntry profiles. Used when multiple signers may satisfy a rule; consumers without precedence semantics can ignore.',
    })),
    revoked: Type.Optional(Type.Boolean({
        description: 'When true, the rule no longer applies regardless of pattern match. Consumers MUST treat revoked rules as if absent.',
    })),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Hounfour contract version this rule was authored against.',
    }),
}, {
    $id: 'SignerCompetenceRule',
    additionalProperties: false,
    description: 'Layer-3 rule pairing an action pattern with the capability-scope set required to authorize matching actions. Composes with Layer-2 SignerEntry.scoped_trust.',
});
//# sourceMappingURL=signer-competence-rule.js.map