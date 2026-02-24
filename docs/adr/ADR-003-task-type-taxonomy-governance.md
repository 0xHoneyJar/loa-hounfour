# ADR-003: TaskType Taxonomy Governance

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Bridgebuilder Second Reading — PR #36, Meditation II and Meditation V

## Context

v7.10.0 introduced `TaskType` as a closed union of 5 protocol-defined literals (`code_review`, `creative_writing`, `analysis`, `summarization`, `general`). The Web4 thesis argues that communities should define their own economic norms — "money must be scarce, but monies can be infinite." Applied to reputation: communities should be able to define their own task taxonomies while maintaining cross-community interoperability.

The question is: who governs the `TaskType` enum, and what is the process for extending it?

## Decision

Adopt a three-tier governance model for `TaskType`, modeled on DNS:

| Tier | Owner | Naming Convention | Extension Process |
|------|-------|-------------------|-------------------|
| **Protocol-defined** | loa-hounfour maintainers | `lowercase_word` (e.g., `code_review`) | RFC + MINOR version bump |
| **Registry-extensible** | Community governance (future) | `lowercase_word` (via registry) | Community proposal + registry |
| **Community-defined** | Individual communities | `namespace:type` (e.g., `legal-guild:contract_review`) | Local definition, no protocol change |

### Naming Convention

- **Protocol types**: Lowercase single-word with underscores (e.g., `code_review`). Listed in the `TASK_TYPES` const array.
- **Community types**: `namespace:type` format (e.g., `legal-guild:contract_review`). The colon separator mirrors DNS hierarchy. Pattern: `^[a-z][a-z0-9_-]+:[a-z][a-z0-9_]+$` (minimum 2 chars per segment to prevent degenerate namespaces).

### Portability Rules

1. **Protocol types** are portable across all communities. A `code_review` score from community A is meaningful in community B.
2. **Community types** are local by default. A `legal-guild:contract_review` score has no meaning outside the `legal-guild` community.
3. **Cross-community transfer**: When transferring reputation across communities, community-defined types map to the nearest protocol type at reduced confidence. The mapping is a consumer concern (Finn, Dixie).

### Extension Governance

Adding a new protocol-defined type requires:
1. Evidence of measurable quality divergence from existing categories
2. Impact analysis on downstream consumers (switch statement exhaustiveness)
3. Semver MINOR bump + conformance vector updates
4. Downstream notification (consumers update `default` branches)

## Consequences

- `TaskType` becomes an open enum: 5 protocol literals + a `String({ pattern })` catch-all for community types.
- `TASK_TYPES` array lists only protocol types (community types are not enumerable at the protocol level).
- Downstream consumers MUST handle unknown types via `default` case (already mandated by FR-1.4).
- Future registry-extensible types (Tier 2) require a registry service — out of scope for v7.11.0.

## Industry Precedent

- **DNS**: ICANN governs root zone, registrars govern TLDs, domain owners govern subdomains.
- **OpenAPI `x-extensible-enum`**: Enum values that can be extended by consumers without schema changes.
- **Kubernetes CRDs**: Custom Resource Definitions use `group/version` naming to namespace extensions.
- **HTTP Content-Type**: `type/subtype` format with IANA registry for standard types and `x-` prefix (deprecated) for custom types.
