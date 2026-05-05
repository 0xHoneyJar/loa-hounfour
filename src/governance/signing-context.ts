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
import { Type, type Static } from '@sinclair/typebox';

export const SigningContextSchema = Type.Object(
  {
    audience: Type.String({
      minLength: 1,
      description: 'Consumer-defined identifier the signature is bound to (e.g., the org_id or service principal).',
    }),
    scope: Type.String({
      minLength: 1,
      description: 'Deliberation- or lifecycle-context binding (e.g., "panel-v1/security-review", "org-delegation/grant").',
    }),
    contract_version: Type.String({
      pattern: '^[1-9][0-9]*\\.[0-9]+\\.[0-9]+$',
      description: 'Semver-formatted protocol contract version pinned to the signing event. Major version must be >= 1; leading-zero majors are rejected per SDD section 3.6 PV-4.',
    }),
  },
  {
    $id: 'SigningContext',
    additionalProperties: false,
    description: 'Audience/scope/contract_version envelope bound under signature for cross-context replay protection.',
  },
);
export type SigningContext = Static<typeof SigningContextSchema>;
