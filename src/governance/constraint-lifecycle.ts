/**
 * Constraint Lifecycle Governance — the self-amending protocol.
 *
 * Connects GovernanceProposal outcomes to constraint file state transitions,
 * enabling communities to propose, validate, and enact constraint changes
 * through governance.
 *
 * In the FAANG framing, this is Ethereum's EIP process meets Google's
 * Zanzibar authorization lifecycle — community-governed protocol constraints
 * with formal verification via type signatures.
 *
 * @see DR-S4 — Constraint lifecycle governance
 * @since v7.6.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Constraint Lifecycle Status
// ---------------------------------------------------------------------------

/**
 * Lifecycle status of a protocol constraint.
 *
 * State machine:
 *   proposed → under_review → enacted | rejected
 *   enacted → deprecated
 *   rejected, deprecated → (terminal)
 */
export const ConstraintLifecycleStatusSchema = Type.Union(
  [
    Type.Literal('proposed'),
    Type.Literal('under_review'),
    Type.Literal('enacted'),
    Type.Literal('rejected'),
    Type.Literal('deprecated'),
  ],
  {
    $id: 'ConstraintLifecycleStatus',
    description: 'Lifecycle status of a protocol constraint within governance.',
  },
);

export type ConstraintLifecycleStatus = Static<typeof ConstraintLifecycleStatusSchema>;

/**
 * Valid state transitions for constraint lifecycle.
 */
export const CONSTRAINT_LIFECYCLE_TRANSITIONS: Record<ConstraintLifecycleStatus, readonly ConstraintLifecycleStatus[]> = {
  proposed: ['under_review', 'rejected'],
  under_review: ['enacted', 'rejected'],
  enacted: ['deprecated'],
  rejected: [],
  deprecated: [],
} as const;

// ---------------------------------------------------------------------------
// Constraint Candidate — dry-run validation
// ---------------------------------------------------------------------------

/**
 * A constraint candidate proposed for enactment.
 *
 * Includes all fields necessary to define a constraint, plus an optional
 * dry_run_result from validation against the type signature. This enables
 * communities to verify constraint candidates before voting to enact them.
 *
 * @since v7.6.0 — DR-S4
 */
export const ConstraintCandidateSchema = Type.Object(
  {
    candidate_id: Type.String({ format: 'uuid' }),
    constraint_id: Type.String({
      minLength: 1,
      description: 'Proposed constraint ID (e.g., "my-custom-check").',
    }),
    schema_id: Type.String({
      minLength: 1,
      description: 'Target schema this constraint applies to.',
    }),
    expression: Type.String({
      minLength: 1,
      description: 'Constraint expression in the DSL.',
    }),
    severity: Type.Union([
      Type.Literal('error'),
      Type.Literal('warning'),
      Type.Literal('info'),
    ], {
      description: 'Severity of constraint violation.',
    }),
    type_signature: Type.Record(Type.String(), Type.String(), {
      description: 'Type signature mapping field names to types.',
    }),
    fields: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Fields this constraint references.',
    }),
    description: Type.String({
      minLength: 1,
      description: 'Human-readable description of the constraint.',
    }),
    dry_run_result: Type.Optional(Type.Object({
      valid: Type.Boolean({ description: 'Whether the expression parsed and type-checked.' }),
      errors: Type.Array(Type.String(), {
        description: 'Validation errors encountered during dry-run.',
      }),
    }, {
      additionalProperties: false,
      description: 'Result of dry-run validation against type signatures.',
    })),
  },
  {
    $id: 'ConstraintCandidate',
    additionalProperties: false,
    description: 'A constraint candidate proposed for governance enactment.',
  },
);

export type ConstraintCandidate = Static<typeof ConstraintCandidateSchema>;

// ---------------------------------------------------------------------------
// Constraint Lifecycle Event
// ---------------------------------------------------------------------------

/**
 * Records a state transition in a constraint's lifecycle.
 *
 * Links to the GovernanceProposal that drove the transition, creating
 * an audit trail from proposal to enactment.
 *
 * @since v7.6.0 — DR-S4
 */
export const ConstraintLifecycleEventSchema = Type.Object(
  {
    event_id: Type.String({ format: 'uuid' }),
    constraint_id: Type.String({
      minLength: 1,
      description: 'The constraint being transitioned.',
    }),
    proposal_id: Type.String({
      format: 'uuid',
      description: 'GovernanceProposal that drove this transition.',
    }),
    from_status: ConstraintLifecycleStatusSchema,
    to_status: ConstraintLifecycleStatusSchema,
    enacted_by: Type.Optional(Type.String({
      minLength: 1,
      description: 'Agent who enacted the transition.',
    })),
    occurred_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'ConstraintLifecycleEvent',
    additionalProperties: false,
    description: 'State transition event in a constraint lifecycle.',
  },
);

export type ConstraintLifecycleEvent = Static<typeof ConstraintLifecycleEventSchema>;
