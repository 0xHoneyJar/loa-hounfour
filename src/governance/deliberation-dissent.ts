/**
 * DeliberationDissent — mid-deliberation concern, minority verdict, or
 * process objection raised by a juror.
 *
 * Distinct from the governance `DissentRecord` (post-decision formal
 * grievance): a `DeliberationDissent` is an in-flight signal during a
 * single deliberation. Its job is to make a dissent typed and queryable;
 * process semantics live in the consumer runtime.
 *
 * The constraint file (`DeliberationDissent.constraints.json`) holds
 * narrative-length and cited_claim_ids bounds; both are TypeBox-expressible
 * and double up at runtime as belt-and-braces guards.
 *
 * @see SDD section 3.3.3 — Specification frozen (no remaining TBDs)
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-A3, cut-line-eligible to v8.5.0)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AgentIdentitySchema } from '../schemas/agent-identity.js';

const ULID_PATTERN = '^[0-9A-HJKMNP-TV-Z]{26}$';

export const DeliberationDissentSchema = Type.Object(
  {
    dissent_id: Type.String({
      pattern: ULID_PATTERN,
      description: 'ULID (Crockford Base32, 26 chars). Aligns with verdict_id / report_id ULID convention.',
    }),
    artifact_id: Type.String({
      minLength: 1,
      description: 'FK to PanelDecisionArtifact.artifact_id (cross-record existence is consumer-enforced per NF-1).',
    }),
    juror: AgentIdentitySchema,
    concern_type: Type.Union(
      [
        Type.Literal('minority_verdict'),
        Type.Literal('process_objection'),
        Type.Literal('mid_deliberation_concern'),
      ],
      { description: 'Frozen union; invalid-vector mutation tests rely on this set being closed.' },
    ),
    narrative: Type.String({
      minLength: 1,
      maxLength: 16384,
      description: 'Free-text rationale; max length matches DelegationVoteSchema.reasoning convention.',
    }),
    cited_claim_ids: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 0,
      description: 'Optional grounding citations to PanelDecisionArtifact.claims[].claim_id. Cross-record existence is NOT enforced (consumer-side per NF-1 / R6).',
    }),
    raised_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the dissent was raised.',
    }),
    contract_version: Type.String({
      pattern: '^[1-9][0-9]*\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$',
      description: 'Semver 2.0.0-formatted protocol contract version pinned at dissent time. Major version must be >= 1; leading zeros are rejected on every component.',
    }),
  },
  {
    $id: 'DeliberationDissent',
    additionalProperties: false,
    description: 'Mid-deliberation concern, minority verdict, or process objection. Distinct lifecycle from governance DissentRecord.',
  },
);
export type DeliberationDissent = Static<typeof DeliberationDissentSchema>;
