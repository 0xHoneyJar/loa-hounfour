/**
 * PanelDecisionArtifact — deliberation input.
 *
 * Captures the proposed action, trust context (routing decision + scope),
 * a grounded claim DAG, the deliberation question, and a per-dimension
 * scoring rubric. Cross-field invariants — DAG validity, grounding
 * type-specific field requirements, and confidence-vs-routing coupling —
 * live in `constraints/PanelDecisionArtifact.constraints.json`.
 *
 * @see SDD section 3.3.1 — Required fields and cross-field constraints
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-A1)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AgentIdentitySchema } from '../schemas/agent-identity.js';

/**
 * Provenance information for a single Claim.
 *
 * The `type` literal selects which auxiliary fields are semantically
 * required. Cross-field rules live in `PanelDecisionArtifact.constraints.json`:
 *
 * - `tool_output`         → `output_hash` matches `^sha256:[a-f0-9]{64}$` (length 71). Rule PDA-3.
 * - `acknowledged_judgment` → `source` is non-null AND `justification.length > 0`. Rule PDA-5.
 * - `claim_reference`     → `claim_id` references a sibling claim (DAG edge). Rule lands with the constraint file in PR-A1.4.
 * - `artifact_reference`  → `artifact_id` references a parent artifact (DAG edge). Rule lands with the constraint file in PR-A1.4.
 *
 * The four-type set is **deliberate and closed for v8.4.0**. Consumers MUST NOT
 * silently treat an unknown `type` as valid; extension is a future additive
 * release decision, not a per-consumer choice.
 *
 * The schema declares the surface; cross-field enforcement is the constraint
 * file's job (and is what `'x-cross-field-validated': true` advertises).
 */
export const ClaimGroundingSchema = Type.Object(
  {
    type: Type.Union(
      [
        Type.Literal('tool_output'),
        Type.Literal('acknowledged_judgment'),
        Type.Literal('claim_reference'),
        Type.Literal('artifact_reference'),
      ],
      { description: 'Grounding category determining which auxiliary fields apply.' },
    ),
    artifact_id: Type.Optional(
      Type.String({
        minLength: 1,
        description: 'Parent artifact reference for DAG closure (used by is_valid_dag).',
      }),
    ),
    claim_id: Type.Optional(
      Type.String({
        minLength: 1,
        description: 'Parent claim reference for DAG closure (used by is_valid_dag).',
      }),
    ),
    output_hash: Type.Optional(
      Type.String({
        pattern: '^sha256:[a-f0-9]{64}$',
        description: 'Canonical sha256:<64-hex> hash; required when type=tool_output.',
      }),
    ),
    source: Type.Optional(AgentIdentitySchema),
    justification: Type.Optional(
      Type.String({
        minLength: 1,
        description: 'Human-readable rationale; required when type=acknowledged_judgment.',
      }),
    ),
  },
  {
    $id: 'ClaimGrounding',
    additionalProperties: false,
    description: 'Provenance for a single Claim. Type-specific field requirements enforced by constraint file.',
  },
);
export type ClaimGrounding = Static<typeof ClaimGroundingSchema>;

/**
 * Single grounded claim within a PanelDecisionArtifact claim DAG.
 *
 * `confidence: 'speculative'` triggers cross-field rule PDA-4: the artifact's
 * `trust_context.routing_decision` MUST be `'panel'`. Speculative claims
 * cannot ride an `auto-honor` or `auto-reject` routing path.
 */
export const ClaimSchema = Type.Object(
  {
    claim_id: Type.String({
      minLength: 1,
      description: 'Stable identifier within the artifact; serves as the DAG node key.',
    }),
    grounding: ClaimGroundingSchema,
    confidence: Type.Union(
      [
        Type.Literal('high_confidence'),
        Type.Literal('plausible'),
        Type.Literal('speculative'),
      ],
      { description: 'Asserted confidence level. speculative forces panel routing per PDA-4.' },
    ),
  },
  {
    $id: 'Claim',
    additionalProperties: false,
    description: 'Single grounded claim; node in the PanelDecisionArtifact claim DAG.',
  },
);
export type Claim = Static<typeof ClaimSchema>;

/**
 * Action proposed for deliberation. `payload` is intentionally
 * untyped (consumer-defined shape) so the deliberation primitive
 * generalises across action types.
 */
export const ProposedActionSchema = Type.Object(
  {
    action_type: Type.String({
      minLength: 1,
      maxLength: 256,
      description: 'Consumer-defined action category.',
    }),
    target_id: Type.String({
      minLength: 1,
      description: 'Identifier of the entity the action targets.',
    }),
    payload: Type.Record(Type.String(), Type.Unknown(), {
      description: 'Pass-through action data; library does not constrain payload shape.',
    }),
  },
  {
    $id: 'ProposedAction',
    additionalProperties: false,
    description: 'Action proposed for deliberation; payload is consumer-defined.',
  },
);
export type ProposedAction = Static<typeof ProposedActionSchema>;

/**
 * Trust context: who/what is asking, by what route, and why.
 *
 * `routing_decision` is the literal union pinned by the source RFC.
 * `scope` and `reason` are free-text; the library does not constrain
 * their internal grammar.
 */
export const TrustContextSchema = Type.Object(
  {
    routing_decision: Type.Union(
      [
        Type.Literal('panel'),
        Type.Literal('auto-honor'),
        Type.Literal('auto-reject'),
      ],
      { description: 'Routing path for this artifact.' },
    ),
    scope: Type.String({
      minLength: 1,
      description: 'Domain or capability scope the deliberation falls under.',
    }),
    reason: Type.String({
      minLength: 1,
      description: 'Human-readable rationale for the routing decision.',
    }),
  },
  {
    $id: 'TrustContext',
    additionalProperties: false,
    description: 'Routing decision + scope + reason for a deliberation.',
  },
);
export type TrustContext = Static<typeof TrustContextSchema>;

export const PanelDecisionArtifactSchema = Type.Object(
  {
    artifact_id: Type.String({
      format: 'uuid',
      description: 'Deliberation correlation key (UUID v4).',
    }),
    proposed_action: ProposedActionSchema,
    trust_context: TrustContextSchema,
    claims: Type.Array(ClaimSchema, {
      description: 'Grounded claim DAG; cross-field DAG validity enforced by constraint file (is_valid_dag).',
    }),
    question: Type.String({
      minLength: 1,
      description: 'The deliberation question.',
    }),
    scoring_rubric: Type.Record(Type.String(), Type.Unknown(), {
      description: 'Per-dimension scoring config. Conventional keys (per CrossScoreReport dimensions): `output_score`, `reasoning_score`, `grounding_score` — each typically `{ weight: number 0..1, description?: string }`. The schema accepts any keys to avoid pinning a tight v8.4.0 shape; a stricter `Type.Object` form MAY land additively in a later release.',
    }),
    created_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 / RFC 3339 creation timestamp.',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version pinned at artifact creation.',
    }),
  },
  {
    $id: 'PanelDecisionArtifact',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Deliberation input: proposed action, trust context, grounded claim DAG, question, and scoring rubric. Cross-field rules in constraints/PanelDecisionArtifact.constraints.json.',
  },
);
export type PanelDecisionArtifact = Static<typeof PanelDecisionArtifactSchema>;
