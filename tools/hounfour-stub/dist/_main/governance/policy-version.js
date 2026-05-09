/**
 * Policy Version — versioned policies with migration validation.
 *
 * Tracks policy evolution with effective dates, supersession chains,
 * and migration validation expressions. Enables both planned upgrades
 * and emergency policy changes with rollback capability.
 *
 * In the FAANG framing: Stripe's API versioning model — every change
 * gets a dated version, old versions remain supported. But versioning
 * policies is harder than versioning APIs because policies have economic
 * consequences.
 *
 * @see DR-S8 — Policy versioning and migration
 * @since v7.6.0
 */
import { Type } from '@sinclair/typebox';
// ---------------------------------------------------------------------------
// Policy Type
// ---------------------------------------------------------------------------
/** @governance registry-extensible */
export const PolicyTypeSchema = Type.Union([
    Type.Literal('monetary'),
    Type.Literal('access'),
    Type.Literal('governance'),
    Type.Literal('constraint'),
], {
    $id: 'PolicyType',
    description: 'Category of versioned policy.',
});
// ---------------------------------------------------------------------------
// Policy Version
// ---------------------------------------------------------------------------
/**
 * A versioned policy record with migration support.
 *
 * @since v7.6.0 — DR-S8
 */
export const PolicyVersionSchema = Type.Object({
    version_id: Type.String({ format: 'uuid' }),
    policy_type: PolicyTypeSchema,
    policy_id: Type.String({
        minLength: 1,
        description: 'Identifier of the policy being versioned.',
    }),
    version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Semantic version of the policy.',
    }),
    effective_at: Type.String({ format: 'date-time' }),
    supersedes: Type.Optional(Type.String({
        format: 'uuid',
        description: 'version_id of the previous policy version this supersedes.',
    })),
    migration_validation: Type.Optional(Type.String({
        minLength: 1,
        description: 'Constraint expression that must hold during transition from old to new policy.',
    })),
    enacted_by_proposal: Type.Optional(Type.String({
        format: 'uuid',
        description: 'GovernanceProposal that enacted this version.',
    })),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'PolicyVersion',
    additionalProperties: false,
    description: 'Versioned policy record with migration support.',
});
//# sourceMappingURL=policy-version.js.map