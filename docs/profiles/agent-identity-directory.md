# Agent identity profile: directory identity

> Profile `directory-identity` of `AgentIdentityBinding` (v8.8.0, SDD §4, FR-C5).

Organizations that run agents usually already keep an identity directory
for people and services. This profile binds a hounfour `AgentIdentity` to
one object in such a directory. The binding names the directory, the
object, the human role accountable for the agent, and the object's
lifecycle state when the binding was recorded.

## Binding record

```json
{
  "binding_id": "7d1e4c2a-0b3f-4c5d-9e6f-000000000003",
  "agent_id": "research-agent",
  "profile": "directory-identity",
  "directory": {
    "directory_kind": "entra",
    "tenant_id": "tenant-0001",
    "object_id": "obj-7f3a",
    "accountable_role": "Platform Operations Lead",
    "lifecycle_state": "active"
  },
  "bound_at": "2026-10-14T09:30:00Z",
  "bound_by_signer_id": "signer-ops-1",
  "contract_version": "8.8.0"
}
```

| Field | Meaning |
|-------|---------|
| `directory.directory_kind` | `entra`, `okta`, `ldap`, or `other`. |
| `directory.tenant_id` | Tenant or realm of the directory. Opaque. |
| `directory.object_id` | The agent's object id in that directory. Opaque. |
| `directory.accountable_role` | The human role answerable for the agent. A role, not a named person. |
| `directory.lifecycle_state` | `active`, `suspended`, or `retired` at `bound_at`. |

When `profile` is `directory-identity`, the `directory` block must be
present and the `a2a` and `vc` blocks must be absent (AIB-2).

> **The JSON Schema alone does not enforce this rule.** `validate()`
> enforces it through the registered cross-field validator. TypeBox
> `Value.Check` and JSON Schema validators running the published
> `schemas/agent-identity-binding.schema.json` accept a record whose
> blocks do not match its `profile`. TypeScript consumers call
> `validate()`. Consumers in other languages must implement AIB-1..3
> themselves, using `constraints/AgentIdentityBinding.constraints.json`
> as the specification.

## Principles

**One identity per agent.** Each agent has exactly one directory object,
and that object belongs to exactly one agent. Shared service accounts
hide which agent acted. Consumers enforce this across their binding
records. The library cannot, because a single record does not show the
others (AIB-N4).

**A single inventory.** The directory is the inventory of agents. An
agent that acts without a directory object is unaccounted for. Consumers
reconcile the set of bound `agent_id` values against the directory.

**An accountable human role.** Every agent has a human role that answers
for it. A role survives staff changes, so the binding records the role
and the directory resolves who holds it today.

**Lifecycle follows the directory.** Suspending or retiring the
directory object is how the organization stops an agent. Consumers record
a new binding when the state changes and refuse to act for agents whose
current binding is not `active`. Non-active bindings are still valid
records (AIB-N5), because history matters for audit.

## Field mapping: AgentIdentity to directory object

| AgentIdentity field | Directory field | Notes |
|---------------------|-----------------|-------|
| `agent_id` | `object_id` within `tenant_id` | The binding is the join between them. |
| `display_name` | display name | Kept in sync by the consumer. |
| `capabilities` | group or app-role assignments | Directory assignments grant access. Hounfour capabilities describe what the agent does. |
| `delegation_authority` | no direct field | Consumer policy. |
| `trust_scopes` | conditional-access or policy assignments | Consumer policy. |
| none | `accountable_role` | Recorded on the binding, not on `AgentIdentity`. |
| none | `lifecycle_state` | Recorded on the binding at `bound_at`. |

## What the library does not do

- It does not query the directory or check that the object exists.
- It does not validate `accountable_role` against any directory (AIB-N2).
- It does not enforce one binding per agent across records (AIB-N4).
- It does not require `lifecycle_state` to be `active` (AIB-N5).
- It does not verify the binding `signature` (AIB-4) or the binder's
  authority (AIB-5).
