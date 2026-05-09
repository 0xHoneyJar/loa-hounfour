/**
 * Signing context — audience/scope/contract_version envelope bound under signature.
 *
 * Shared sub-schema referenced by PanelVerdictSchema, CrossScoreReportSchema,
 * and OrgRepresentativeDelegationSchema. Provides protocol-level cross-context
 * replay protection (consumers reject signatures whose `signing_context` does
 * not match the local audience/scope), analogous to JWT `aud` claims and
 * AWS SigV4 scope binding.
 *
 * @see SDD section 3.3.2 — `signing_context` field on PanelVerdict
 * @since v8.4.0
 */
import { Type } from '@sinclair/typebox';
export const SigningContextSchema = Type.Object({
    audience: Type.String({
        minLength: 1,
        description: 'Consumer-defined identifier the signature is bound to (e.g., the org_id or service principal).',
    }),
    scope: Type.String({
        minLength: 1,
        description: 'Deliberation- or lifecycle-context binding (e.g., "panel-v1/security-review", "org-delegation/grant").',
    }),
    contract_version: Type.String({
        pattern: '^[1-9][0-9]*\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$',
        description: 'Semver 2.0.0-formatted protocol contract version pinned to the signing event. Major version must be >= 1 (no major-zero pre-1.0 versions); leading zeros are rejected on every component (e.g., "8.04.0" and "8.0.01" are invalid). MIN_SUPPORTED_VERSION (6.0.0) sets the floor for runtime compatibility checks; the schema layer enforces the format only.',
    }),
}, {
    $id: 'SigningContext',
    additionalProperties: false,
    description: 'Audience/scope/contract_version envelope bound under signature for cross-context replay protection.',
});
//# sourceMappingURL=signing-context.js.map