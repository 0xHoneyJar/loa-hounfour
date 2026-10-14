# ScopeOfAutonomy — shape, inheritance and stop-work

> **Since:** v8.8.0 (FR-C1). **Schema:** `ScopeOfAutonomySchema` (`$id: ScopeOfAutonomy`),
> exported from `@0xhoneyjar/loa-hounfour` and `@0xhoneyjar/loa-hounfour/governance`.
> **Evaluators:** `evaluateScopeInheritance`, `evaluateScopeActivity`.
> **Constraints:** `constraints/ScopeOfAutonomy.constraints.json` (SOA-1..SOA-7).

A `ScopeOfAutonomy` records the autonomy a principal grants an agent. The
record is aligned to the structured scope-of-autonomy record described in
public model behaviour policies: what the agent may pursue, what it may
spend and touch, when it must stop and ask, and when the grant ends.

Hounfour ships the shape and pure evaluators over it. Deciding whether a
concrete action falls inside a scope, and whether the principal may grant
the scope at all, is consumer policy ([ADR-010](../adr/ADR-010-class-vs-policy-boundary.md)).

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `scope_id` | uuid | Stable identifier. |
| `principal_id` | string, min 1 | Who granted the scope. Opaque; an `AgentIdentity.agent_id` or `OrgIdentity.org_id` by convention. |
| `agent_id` | string, min 1 | The subject agent. |
| `parent_scope_id` | uuid, optional | Parent scope. Absent means a root scope. |
| `permitted_sub_goals` | string[1..256], 1..64 items | Distinct (SOA-1). Opaque strings. |
| `side_effect_budget.max_cost_micro` | micro-USD string, optional | Absent means no cost limit set by this scope. |
| `side_effect_budget.max_wall_clock_ms` | integer ≥ 0, optional | Absent means no duration limit set by this scope. |
| `side_effect_budget.data_access` | `{ resource, mode }[]`, ≤ 64 | Required; may be empty. `mode` is `read`, `write` or `read_write`. |
| `allowed_tools` | string[1..128], ≤ 256 items, optional | Absent means the scope does not restrict tools. |
| `clarification_triggers` | string[1..512], ≤ 32 items | May be empty. |
| `ending_condition.kind` | `time_limit`, `goal_satisfied`, `budget_exhausted`, `explicit_stop`, `composite` | |
| `ending_condition.latest_time` | date-time, optional | Required when `kind` is `time_limit` (SOA-2). |
| `ending_condition.description` | string ≤ 1024, optional | |
| `stop_work.requested` | boolean | |
| `stop_work.requested_at` | date-time, optional | Required when `requested` is true (SOA-4). |
| `stop_work.requested_by` | string, optional | |
| `stop_work.propagates_to_children` | literal `true` | A stop on a parent always binds its children. |
| `issued_at` | date-time | |
| `expires_at` | date-time, optional | Strictly after `issued_at` (SOA-3). |
| `additional_details` | string ≤ 2048, optional | |
| `contract_version` | `MAJOR.MINOR.PATCH` | |

Every object level is `additionalProperties: false`.

## Constraints

| Id | Evaluator | Rule |
|----|-----------|------|
| SOA-1 | library | `permitted_sub_goals` values are distinct. |
| SOA-2 | library | `kind == 'time_limit'` implies `latest_time` is present. |
| SOA-3 | library | `expires_at` is absent or strictly after `issued_at`. |
| SOA-4 | library | `stop_work.requested == true` implies `requested_at` is present. |
| SOA-5 | library | `latest_time` is not after `expires_at` when both are present. |
| SOA-6 | runtime-deferred | A child scope is within its parent (see below). |
| SOA-7 | runtime-deferred | `principal_id` is authorized to grant this scope to `agent_id`. |

SOA-1..5 run in the registered cross-field validator, so
`validate(ScopeOfAutonomySchema, x)` rejects violations with errors
prefixed `SOA-<n>:`. Cross-language runners that implement only the
structural tier report the `invalid-cross-field` fixtures as
`pass-cross-field-deferred`.

## Inheritance (SOA-6)

`evaluateScopeInheritance(child, parent)` returns
`{ within_parent, violations[] }`. It is pure: no clock and no I/O. Both
inputs must already pass `validate()`.

| Code | Child is within parent when |
|------|-----------------------------|
| `PARENT_ID_MISMATCH` | `child.parent_scope_id` equals `parent.scope_id`. |
| `SUB_GOAL_NOT_IN_PARENT` | Every child sub-goal is one of the parent's, by exact string. |
| `COST_EXCEEDS_PARENT` | The parent sets no cost limit, or the child sets one that is ≤ the parent's (BigInt compare). |
| `WALL_CLOCK_EXCEEDS_PARENT` | The parent sets no duration limit, or the child sets one that is ≤ the parent's. |
| `DATA_ACCESS_EXCEEDS_PARENT` | Every child `(resource, mode)` is covered by the parent's modes on the same resource. |
| `TOOL_NOT_IN_PARENT` | The parent sets no `allowed_tools`, or the child sets a subset. |
| `LATEST_TIME_AFTER_PARENT` | The parent sets no `latest_time`, or the child sets one that is not later. |
| `EXPIRES_AFTER_PARENT` | The parent sets no `expires_at`, or the child sets one that is not later. |
| `STOP_WORK_NOT_INHERITED` | The parent has no stop request, or the child carries one too. |

An absent parent limit is unbounded. An absent child limit under a bounded
parent is a violation, because the child would otherwise claim more than
the parent granted.

Mode coverage: `read_write` covers `read` and `write`. The parent's modes
on a resource are combined, so a parent granting `read` and `write` in two
entries covers a child's `read_write`. Resources match by exact string;
there is no prefix or glob semantics.

The relation is reflexive and transitive, and it is monotone in the
parent: widening a parent never turns a within-parent child into a
violation. The test suite checks these properties with fast-check.

### In `validate()`

For a scope that carries `parent_scope_id`:

| Call | Outcome |
|------|---------|
| `validate(S, child)` | `valid: true` with a SOA-6 manifest entry, `evaluator: 'consumer'`, `reason: 'scope_parent_context_deferred'`. |
| `validate(S, child, { scopeContext: { parent_scope } })`, child within parent | `valid: true`, no SOA-6 entry. |
| Same, child outside parent | `valid: false`, one `SCOPE_INHERITANCE_VIOLATION: <CODE> at <field>: …` error per violation, plus manifest entries with `reason: 'scope_inheritance_violation'`. |
| Same, `parent_scope` not a valid ScopeOfAutonomy | `valid: false`, errors prefixed `SCOPE_PARENT_CONTEXT_INVALID:`. |

A root scope carries no SOA-6 obligation. The consumer resolves the parent
from its own store; the library never looks it up.

## Activity and stop-work

`evaluateScopeActivity(scope, now)` takes the clock as an argument and
returns `{ active, reason }`. Reasons are checked in this order:

1. `stop_work_requested` — a requested stop ends the scope at once.
2. `not_yet_issued` — `now` is before `issued_at`.
3. `expired` — `now` is at or after `expires_at`.
4. `latest_time_passed` — `now` is at or after `ending_condition.latest_time`.
5. `active` otherwise.

`expires_at` and `latest_time` are exclusive bounds. An invalid `now`
throws `RangeError`.

Stop-work propagates down the tree. `propagates_to_children` is pinned to
`true`, and SOA-6 flags any child that does not carry its parent's stop
request. A consumer that stops a parent must therefore re-issue or update
each child with `stop_work.requested: true`; until it does, the child fails
inheritance against the stopped parent. A child may stop on its own while
its parent continues.

## Deliberately not enforced

- **SOA-N1.** The library does not decide whether a sub-goal string matches
  an action. Semantic matching is consumer policy.
- **SOA-N2.** `validate()` does not check expiry against a clock. Use
  `evaluateScopeActivity` with an injected `now`.
- **SOA-N3.** `allowed_tools` is not checked against any tool registry.
- `principal_id` and `agent_id` are not resolved to identity records.
- `clarification_triggers` are not interpreted.
- Spend is not metered or reconciled against `max_cost_micro`.
- SOA-7 grant authority is never evaluated by the library.
