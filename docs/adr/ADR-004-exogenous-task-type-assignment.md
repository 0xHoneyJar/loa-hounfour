# ADR-004: Exogenous Task Type Assignment

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Bridgebuilder Second Reading — PR #36, Meditation V (Goodhart Risk)

## Context

v7.10.0 introduced task-dimensional reputation scoring. The scoring cascade (`task_cohort → aggregate → tier_default`) creates a legible scoring surface. Once agents or routing systems know that task-type-specific scores influence routing decisions, they have an incentive to classify ambiguous tasks into categories where their scores are highest.

This is a direct instance of Goodhart's Law: "When a measure becomes a target, it ceases to be a good measure."

## Decision

**`task_type` assignment MUST be exogenous to the scored agent.**

Specifically:

1. The **routing layer** (Finn, Dixie, or the system initiating inference) assigns `task_type` before the model sees the task.
2. The **scored model** MUST NOT influence its own task classification. The model receives work already classified — it does not self-report its task type.
3. **Self-classification is prohibited**: A `ReputationEvent` where the `task_type` was determined by the model being scored is non-conformant, even if the event is otherwise structurally valid.
4. This is a **meta-constraint** — it governs how the protocol is used, not how individual JSON documents validate. It cannot be expressed in the constraint DSL or JSON Schema.

### Enforcement

This constraint is enforced at the integration layer, not the schema layer:

- **Finn**: The ensemble router classifies tasks before dispatching to models.
- **Dixie**: The knowledge governance layer classifies tasks before model invocation.
- **Freeside**: Economic events carry task_type from the routing decision, not from model output.

Protocol-level enforcement is limited to documentation (this ADR) and normative language in the `ReputationEvent` JSDoc.

## Consequences

- Downstream consumers (Finn, Dixie, Freeside) are responsible for ensuring exogenous assignment.
- The protocol cannot validate this constraint at the schema level — it is a process constraint, not a data constraint.
- Future protocol versions MAY add a `classifier_id` field to `ReputationEvent` to make the classification provenance auditable.
- `ReputationEvent` JSDoc SHOULD include normative language: "task_type MUST be assigned by the routing layer, not the scored agent (ADR-004)."

## Industry Precedent

- **Google Ad Quality Score**: Scoring signals are opaque to advertisers. Advertisers cannot see or influence the quality scoring formula — they can only improve their ad quality. If scoring signals were visible and manipulable, advertisers would optimize for signals rather than quality.
- **Netflix Recommendation**: Users don't self-report genre preferences for scoring purposes. The system infers preferences from behavior. Self-reported preferences are treated as a separate signal with lower weight.
- **Academic Peer Review**: Reviewers are assigned by editors, not chosen by authors. Self-selected reviewers create selection bias that undermines the scoring system.
