/**
 * GovernedResource<T> governance fields spread constant + GovernanceMutation envelope.
 *
 * The GOVERNED_RESOURCE_FIELDS constant follows the same spread pattern as
 * COHORT_BASE_FIELDS in governance/cohort-base-fields.ts — concrete
 * instantiations spread these into their Type.Object definitions.
 *
 * @see SDD §4.1 — GovernedResource Governance Fields (FR-1.1)
 * @see SDD §4.7 — GovernanceMutation (Flatline SKP-004)
 * @since v8.0.0
 */
import { Type } from '@sinclair/typebox';
import { ConservationLawSchema } from './conservation-law.js';
import { AuditTrailSchema } from './audit-trail.js';
import { StateMachineConfigSchema } from './state-machine.js';
/**
 * Governance classification for a governed resource.
 * Maps to ADR-003/ADR-005 three-tier governance model.
 *
 * @governance protocol-fixed
 */
export const GovernanceClassSchema = Type.Union([
    Type.Literal('protocol-fixed'),
    Type.Literal('registry-extensible'),
    Type.Literal('community-defined'),
], { $id: 'GovernanceClass' });
/**
 * Shared governance fields that every GovernedResource<T> instantiation spreads.
 *
 * Usage pattern (same as COHORT_BASE_FIELDS):
 * ```typescript
 * export const GovernedCreditsSchema = Type.Object({
 *   // Resource-specific fields
 *   balance: Type.String({ pattern: '^[0-9]+$' }),
 *   // Governance fields (spread)
 *   ...GOVERNED_RESOURCE_FIELDS,
 * }, { $id: 'GovernedCredits', additionalProperties: false });
 * ```
 */
export const GOVERNED_RESOURCE_FIELDS = {
    conservation_law: ConservationLawSchema,
    audit_trail: AuditTrailSchema,
    state_machine: StateMachineConfigSchema,
    governance_class: GovernanceClassSchema,
    version: Type.Integer({
        minimum: 0,
        description: 'Monotonic resource version for optimistic concurrency (CAS). '
            + 'Required for all GovernedResource instantiations (Flatline SKP-005). '
            + 'All mutations MUST present the expected version. '
            + 'Version mismatch returns PARTIAL_APPLICATION error. '
            + 'Starts at 0 for new resources, increments on each successful mutation.',
    }),
    access_policy_ref: Type.Optional(Type.String({
        minLength: 1,
        description: 'Reference to an AccessPolicy governing mutations to this resource. '
            + 'When present, mutation evaluation SHOULD check the actor\'s context '
            + 'against this policy before applying changes. '
            + '(Bridgebuilder F6 — authorization at the governance boundary)',
    })),
    governance_extensions: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
        description: 'Extension point for future governance fields. '
            + 'Prevents additionalProperties:false from making governance '
            + 'field additions a breaking change across all instantiations. '
            + 'Keys are namespaced (e.g., "commons.checkpoint", "commons.acl"). '
            + 'Consumers MUST ignore unknown keys.',
    })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
};
/**
 * Mutation envelope for GovernedResource operations.
 *
 * Every mutation to a GovernedResource<T> is wrapped in this envelope
 * for idempotency and optimistic concurrency control.
 *
 * @see SDD §4.7 — Concurrency Model (Flatline SKP-004)
 */
export const GovernanceMutationSchema = Type.Object({
    mutation_id: Type.String({
        format: 'uuid',
        description: 'Idempotency key. Replaying same ID is a no-op.',
    }),
    expected_version: Type.Integer({
        minimum: 0,
        description: 'Expected resource version (CAS). Mismatch returns PARTIAL_APPLICATION.',
    }),
    mutated_at: Type.String({ format: 'date-time' }),
    actor_id: Type.String({
        minLength: 1,
        description: 'Identity of the actor performing this mutation. Required for audit trail '
            + 'attribution and access policy evaluation. '
            + '(Bridgebuilder F6 — authorization at the mutation boundary)',
    }),
}, { $id: 'GovernanceMutation', additionalProperties: false });
//# sourceMappingURL=governed-resource.js.map