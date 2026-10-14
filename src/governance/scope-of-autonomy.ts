/**
 * `ScopeOfAutonomy` — structured record of the autonomy a principal grants
 * to an agent: which sub-goals it may pursue, what side effects it may cause,
 * which tools it may call, when it must stop and ask, and when the grant
 * ends. Scopes form an inheritance tree via `parent_scope_id`; a child scope
 * MUST stay within its parent (SOA-6, evaluated by
 * `evaluateScopeInheritance()` in `./scope-of-autonomy-eval.ts`).
 *
 * The record is aligned to the structured scope-of-autonomy record described
 * in public model behaviour policies (sub-goals, side-effect budget,
 * clarification triggers, ending condition, stop-work). Hounfour ships the
 * shape; the consumer runtime decides what an action means against it
 * (ADR-010: shape, not authority).
 *
 * ## Library-evaluated constraints (enforced by `validate()`)
 *
 * Registered as a cross-field validator (`validateScopeOfAutonomy`), so
 * `validate(ScopeOfAutonomySchema, x)` rejects violations:
 *
 * - **SOA-1** `permitted_sub_goals` values are distinct.
 * - **SOA-2** `ending_condition.kind == 'time_limit'` implies
 *   `ending_condition.latest_time` is present.
 * - **SOA-3** `expires_at` is absent or strictly after `issued_at`.
 * - **SOA-4** `stop_work.requested == true` implies `stop_work.requested_at`
 *   is present.
 * - **SOA-5** when both `ending_condition.latest_time` and `expires_at` are
 *   present, `latest_time` is not after `expires_at`.
 *
 * ## Consumer-evaluated constraints
 *
 * - **SOA-6** a child scope is within its parent. `validate()` evaluates it
 *   when the consumer supplies the resolved parent via
 *   `{ scopeContext: { parent_scope } }`; otherwise it surfaces an
 *   unverified-obligations entry with `reason: 'scope_parent_context_deferred'`.
 * - **SOA-7** `principal_id` is authorized to grant this scope to `agent_id`.
 *   Pure consumer authority (ADR-010); never evaluated by the library.
 *
 * ## Explicit non-constraints
 *
 * - **SOA-N1** The library does NOT decide whether a sub-goal string matches
 *   an action. `permitted_sub_goals` entries are opaque strings; semantic
 *   matching ("does 'refactor the parser' cover editing tokenizer.ts?") is
 *   consumer policy. Inheritance compares sub-goals by exact string only.
 * - **SOA-N2** The library does NOT enforce wall-clock expiry at
 *   `validate()` time. `validate()` has no clock; a scope whose `expires_at`
 *   is in the past is still structurally valid. Consumers call
 *   `evaluateScopeActivity(scope, now)` with an injected `now`.
 * - **SOA-N3** `allowed_tools` is NOT cross-checked against any tool
 *   registry. Tool names are opaque strings; absent `allowed_tools` means the
 *   scope does not restrict tools (the consumer's own defaults apply).
 * - `principal_id` and `agent_id` are NOT resolved against `AgentIdentity` /
 *   `OrgIdentity` records. They are opaque identifiers; resolution is
 *   consumer state.
 * - `clarification_triggers` are NOT interpreted. They are display text the
 *   consumer runtime evaluates; the library only bounds their size.
 * - `side_effect_budget.max_cost_micro` is NOT reconciled against spend.
 *   Metering is consumer state; the library compares limits only between a
 *   child and its parent (SOA-6).
 *
 * ## Decisions (SDD §1 left these open)
 *
 * - SOA-1 is enforced by the cross-field validator rather than by a DSL
 *   `unique_values` expression: the DSL builtin only compares a named field
 *   of object elements, and `permitted_sub_goals` is an array of strings.
 * - The cross-field validator enforces all five library rules (SOA-1..5),
 *   not only SOA-2/3/4, so `validate()` and the constraint file agree.
 * - `stop_work.propagates_to_children` is pinned to `true`: a stop request
 *   on a parent always binds its children (see STOP_WORK_NOT_INHERITED in
 *   the inheritance evaluator).
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/scope-of-autonomy.md
 * @since v8.8.0 (PR-C1, FR-C1)
 */
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';
import { parseIsoDateTimeStrict } from '../validators/formats.js';

/** Access mode for a data resource named in a side-effect budget. */
export const DataAccessModeSchema = Type.Union(
  [Type.Literal('read'), Type.Literal('write'), Type.Literal('read_write')],
  {
    description:
      "Access mode granted on a data resource. 'read_write' covers both 'read' and 'write'.",
  },
);

export type DataAccessMode = Static<typeof DataAccessModeSchema>;

/** One (resource, mode) grant inside a side-effect budget. */
export const DataAccessGrantSchema = Type.Object(
  {
    resource: Type.String({
      minLength: 1,
      maxLength: 512,
      description:
        'Opaque resource identifier (path, table, bucket, URI). Compared by exact string; the library does not interpret it.',
    }),
    mode: DataAccessModeSchema,
  },
  { additionalProperties: false },
);

export type DataAccessGrant = Static<typeof DataAccessGrantSchema>;

/** Bounds on the side effects an agent may cause while acting in a scope. */
export const SideEffectBudgetSchema = Type.Object(
  {
    max_cost_micro: Type.Optional(
      Type.String({
        ...MicroUSDUnsigned,
        description:
          'Maximum spend in string-encoded micro-USD. Absent means the scope sets no cost limit (an inherited parent limit still applies under SOA-6).',
      }),
    ),
    max_wall_clock_ms: Type.Optional(
      Type.Integer({
        minimum: 0,
        description:
          'Maximum wall-clock duration in milliseconds. Absent means the scope sets no duration limit.',
      }),
    ),
    data_access: Type.Array(DataAccessGrantSchema, {
      maxItems: 64,
      description:
        'Data resources the agent may touch and in which mode. Always present; an empty array grants no data access.',
    }),
  },
  { additionalProperties: false },
);

export type SideEffectBudget = Static<typeof SideEffectBudgetSchema>;

/** Kind of condition that ends a scope. */
export const EndingConditionKindSchema = Type.Union(
  [
    Type.Literal('time_limit'),
    Type.Literal('goal_satisfied'),
    Type.Literal('budget_exhausted'),
    Type.Literal('explicit_stop'),
    Type.Literal('composite'),
  ],
  { description: 'Kind of condition that ends the scope.' },
);

export type EndingConditionKind = Static<typeof EndingConditionKindSchema>;

/** When the scope ends. */
export const EndingConditionSchema = Type.Object(
  {
    kind: EndingConditionKindSchema,
    latest_time: Type.Optional(
      Type.String({
        format: 'date-time',
        description:
          "Latest instant at which the scope ends. Required when kind is 'time_limit' (SOA-2); MUST NOT be after expires_at (SOA-5).",
      }),
    ),
    description: Type.Optional(
      Type.String({
        maxLength: 1024,
        description: 'Human-readable statement of the ending condition.',
      }),
    ),
  },
  { additionalProperties: false },
);

export type EndingCondition = Static<typeof EndingConditionSchema>;

/** Stop-work state of a scope. */
export const StopWorkSchema = Type.Object(
  {
    requested: Type.Boolean({
      description: 'True once a stop has been requested. A requested stop ends the scope immediately.',
    }),
    requested_at: Type.Optional(
      Type.String({
        format: 'date-time',
        description: 'Instant the stop was requested. Required when requested is true (SOA-4).',
      }),
    ),
    requested_by: Type.Optional(
      Type.String({
        description: 'Opaque identifier of whoever requested the stop.',
      }),
    ),
    propagates_to_children: Type.Literal(true, {
      description:
        'Pinned to true: a stop on a parent scope always binds every child scope (SOA-6 STOP_WORK_NOT_INHERITED).',
    }),
  },
  { additionalProperties: false },
);

export type StopWork = Static<typeof StopWorkSchema>;

export const ScopeOfAutonomySchema = Type.Object(
  {
    scope_id: Type.String({
      format: 'uuid',
      description: 'Stable identifier of this scope (UUID).',
    }),
    principal_id: Type.String({
      minLength: 1,
      description:
        'Who granted the scope (an AgentIdentity.agent_id or OrgIdentity.org_id). Opaque to the library; authority to grant is SOA-7 (consumer).',
    }),
    agent_id: Type.String({
      minLength: 1,
      description: 'The agent the scope applies to.',
    }),
    parent_scope_id: Type.Optional(
      Type.String({
        format: 'uuid',
        description: 'scope_id of the parent scope this scope inherits from. Absent means a root scope.',
      }),
    ),
    permitted_sub_goals: Type.Array(
      Type.String({ minLength: 1, maxLength: 256 }),
      {
        minItems: 1,
        maxItems: 64,
        description:
          'Sub-goals the agent may pursue. Distinct (SOA-1). Opaque strings; semantic matching is consumer policy (SOA-N1).',
      },
    ),
    side_effect_budget: SideEffectBudgetSchema,
    allowed_tools: Type.Optional(
      Type.Array(Type.String({ minLength: 1, maxLength: 128 }), {
        maxItems: 256,
        description:
          'Tools the agent may call. Absent means the scope does not restrict tools. Not checked against any registry (SOA-N3).',
      }),
    ),
    clarification_triggers: Type.Array(
      Type.String({ minLength: 1, maxLength: 512 }),
      {
        maxItems: 32,
        description:
          'Situations in which the agent must stop and ask its principal. May be empty. Interpreted by the consumer runtime.',
      },
    ),
    ending_condition: EndingConditionSchema,
    stop_work: StopWorkSchema,
    issued_at: Type.String({
      format: 'date-time',
      description: 'Instant the scope was issued. The scope is not active before it.',
    }),
    expires_at: Type.Optional(
      Type.String({
        format: 'date-time',
        description:
          'Instant the scope expires. Strictly after issued_at (SOA-3). Not enforced at validate() time (SOA-N2).',
      }),
    ),
    additional_details: Type.Optional(
      Type.String({
        maxLength: 2048,
        description: 'Free-text context from the principal.',
      }),
    ),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Hounfour contract version this scope was authored against.',
    }),
  },
  {
    $id: 'ScopeOfAutonomy',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description:
      'Structured scope-of-autonomy record a principal grants to an agent, aligned to the structured scope-of-autonomy record described in public model behaviour policies: permitted sub-goals, side-effect budget, allowed tools, clarification triggers, ending condition and stop-work state. Scopes inherit via parent_scope_id; a child MUST stay within its parent (SOA-6). Shape only: whether an action falls inside the scope, and whether the principal may grant it, is consumer policy (ADR-010).',
  },
);

export type ScopeOfAutonomy = Static<typeof ScopeOfAutonomySchema>;

function instant(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = parseIsoDateTimeStrict(value);
  return parsed === null ? undefined : parsed.getTime();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Cross-field validator for `ScopeOfAutonomy` (SOA-1..SOA-5). Runs after
 * the structural tier has passed; defensive against non-object input so it
 * never throws. Error strings are prefixed with the rule id.
 */
export function validateScopeOfAutonomy(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  if (!isRecord(data)) {
    return {
      valid: false,
      errors: ['SOA: structural shape precondition failed — input must be a non-null object (ScopeOfAutonomy record).'],
      warnings: [],
    };
  }
  const errors: string[] = [];

  // SOA-1: permitted_sub_goals distinct.
  const goals = data.permitted_sub_goals;
  if (Array.isArray(goals)) {
    const firstIndex = new Map<unknown, number>();
    goals.forEach((goal, i) => {
      const seen = firstIndex.get(goal);
      if (seen === undefined) {
        firstIndex.set(goal, i);
      } else {
        errors.push(
          `SOA-1: permitted_sub_goals[${i}] duplicates permitted_sub_goals[${seen}] (${JSON.stringify(goal)}); sub-goals MUST be distinct.`,
        );
      }
    });
  }

  const ending = isRecord(data.ending_condition) ? data.ending_condition : undefined;
  const latestTime = ending?.latest_time;

  // SOA-2: time_limit implies latest_time.
  if (ending?.kind === 'time_limit' && latestTime === undefined) {
    errors.push("SOA-2: ending_condition.kind is 'time_limit' but ending_condition.latest_time is absent.");
  }

  // SOA-3: expires_at strictly after issued_at.
  if (data.expires_at !== undefined) {
    const issued = instant(data.issued_at);
    const expires = instant(data.expires_at);
    if (issued === undefined || expires === undefined || !(expires > issued)) {
      errors.push(
        `SOA-3: expires_at (${String(data.expires_at)}) MUST be strictly after issued_at (${String(data.issued_at)}).`,
      );
    }
  }

  // SOA-4: requested stop carries requested_at.
  const stop = isRecord(data.stop_work) ? data.stop_work : undefined;
  if (stop?.requested === true && stop.requested_at === undefined) {
    errors.push('SOA-4: stop_work.requested is true but stop_work.requested_at is absent.');
  }

  // SOA-5: latest_time not after expires_at.
  if (latestTime !== undefined && data.expires_at !== undefined) {
    const latest = instant(latestTime);
    const expires = instant(data.expires_at);
    if (latest === undefined || expires === undefined || latest > expires) {
      errors.push(
        `SOA-5: ending_condition.latest_time (${String(latestTime)}) MUST NOT be after expires_at (${String(data.expires_at)}).`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
