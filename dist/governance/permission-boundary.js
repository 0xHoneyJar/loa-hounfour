/**
 * Permission Boundary — MAY semantics for capability-scoped authorization.
 *
 * Defines boundaries within which agents may operate, with reporting
 * requirements and revocation policies.
 *
 * @see SDD §2.5 — PermissionBoundary Schema
 * @since v7.0.0
 */
import { Type } from '@sinclair/typebox';
// ReportingRequirement
export const ReportingRequirementSchema = Type.Object({
    required: Type.Boolean({ description: 'Whether reporting is mandatory.' }),
    report_to: Type.String({ minLength: 1, description: 'Agent or endpoint receiving reports.' }),
    frequency: Type.Union([
        Type.Literal('per_action'),
        Type.Literal('per_epoch'),
        Type.Literal('on_violation'),
    ], { description: 'How often reports must be filed.' }),
    format: Type.Union([
        Type.Literal('audit_trail'),
        Type.Literal('summary'),
        Type.Literal('detailed'),
    ], { description: 'Required report format.' }),
}, {
    $id: 'ReportingRequirement',
    additionalProperties: false,
    description: 'Reporting requirements for actions under a permission boundary.',
});
// RevocationPolicy
export const RevocationPolicySchema = Type.Object({
    trigger: Type.Union([
        Type.Literal('violation_count'),
        Type.Literal('governance_vote'),
        Type.Literal('manual'),
        Type.Literal('timeout'),
    ], { description: 'What triggers permission revocation.' }),
    violation_threshold: Type.Optional(Type.Integer({
        minimum: 1,
        description: 'Number of violations before revocation (for violation_count trigger).',
    })),
    timeout_seconds: Type.Optional(Type.Integer({
        minimum: 1,
        description: 'Seconds before timeout-based revocation.',
    })),
}, {
    $id: 'RevocationPolicy',
    additionalProperties: false,
    description: 'Policy defining when a permission boundary is revoked.',
});
// PermissionBoundary
export const PermissionBoundarySchema = Type.Object({
    boundary_id: Type.String({ format: 'uuid' }),
    scope: Type.String({ minLength: 1, description: 'Capability scope this boundary applies to.' }),
    permitted_if: Type.String({
        minLength: 1,
        description: 'Constraint expression that must hold for permission to be granted.',
    }),
    reporting: ReportingRequirementSchema,
    revocation: RevocationPolicySchema,
    severity: Type.Union([
        Type.Literal('advisory'),
        Type.Literal('monitored'),
    ], { description: 'How strictly this boundary is enforced.' }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'PermissionBoundary',
    additionalProperties: false,
    description: 'A permission boundary defining MAY semantics for capability-scoped authorization.',
});
//# sourceMappingURL=permission-boundary.js.map