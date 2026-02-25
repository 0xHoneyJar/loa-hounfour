# ADR-007: Commons Protocol Pattern

**Status**: Accepted
**Date**: 2026-02-25
**Source**: Bridgebuilder Deep Review — loa-finn #66 comment (Ostrom isomorphism discovery)

## Context

The protocol manages three distinct but structurally isomorphic economic primitives across three repositories: credits (loa-freeside), reputation (loa-hounfour/loa-dixie), and freshness (loa-dixie). Each has:

- **Conservation laws**: Named invariants that must hold (lot_invariant I-1 through I-5, reputation state machine rules, adaptive decay bounds)
- **Audit trails**: Append-only event logs with integrity verification (scoring-path-hash chains, billing audit entries)
- **State machines**: Lifecycle states with guarded transitions (escrow states, reputation cold→authoritative, credit extended→settled)

This isomorphism was first identified by Bridgebuilder Deep Review as mapping to Elinor Ostrom's 8 principles for governing commons. Rather than continuing to implement these patterns separately in each repository, we extract the common substrate as a generic `GovernedResource<T>` primitive.

## Decision

### 1. GovernedResource<T> Spread Pattern

All governed resources share governance fields via the `GOVERNED_RESOURCE_FIELDS` constant, following the same `Type.Object + spread` pattern established by `COHORT_BASE_FIELDS` in `src/governance/cohort-base-fields.ts`.

```typescript
import { GOVERNED_RESOURCE_FIELDS } from './governed-resource.js';

export const GovernedCreditsSchema = Type.Object({
  // Resource-specific fields
  lot_id: Type.String({ format: 'uuid' }),
  balance: Type.String({ pattern: '^[0-9]+$' }),
  // Governance fields (spread)
  ...GOVERNED_RESOURCE_FIELDS,
}, { $id: 'GovernedCredits', additionalProperties: false });
```

**Why spread, not `Type.Intersect`**: TypeBox `Type.Intersect` generates JSON Schema `allOf`, which some cross-language validators handle inconsistently (particularly `additionalProperties: false` inside `allOf` branches). The spread pattern produces flat schemas with standalone `$id` — maximum cross-language compatibility.

### 2. Module Placement

All Commons Protocol schemas live in `src/commons/`, a new module parallel to existing ones. This avoids touching `src/governance/` (27 files + complex exports) and provides a clean namespace.

### 3. Ostrom Principle Mapping

| Ostrom Principle | Protocol Mapping |
|-----------------|-----------------|
| 1. Clearly defined boundaries | `GovernanceClass` enum — 3 tiers |
| 2. Proportional equivalence | `ConservationLaw` — named invariants |
| 3. Collective-choice arrangements | `GovernanceMutation` — CAS + idempotency |
| 4. Monitoring | `AuditTrail` — hash chain integrity |
| 5. Graduated sanctions | Error taxonomy — 6 discriminated types |
| 6. Conflict resolution | `QuarantineRecord` + reconciliation |
| 7. Minimal recognition of rights | `DynamicContract` — reputation-gated surfaces |
| 8. Nested enterprises | `governance_extensions` — future-proofing |

### 4. Version Field Semantics

The `version` field on `GOVERNED_RESOURCE_FIELDS` is a required integer (Flatline SKP-005) for optimistic concurrency (CAS). All mutations present the expected version; mismatches return `PARTIAL_APPLICATION` error. Starts at 0 for new resources, increments on each successful mutation.

## Developer Guide: Adding a New Governed Resource

To add a new governed resource type (e.g., `GovernedBandwidth`):

### Step 1: Create the schema file

```typescript
// src/commons/governed-bandwidth.ts
import { Type, type Static } from '@sinclair/typebox';
import { GOVERNED_RESOURCE_FIELDS } from './governed-resource.js';

export const GovernedBandwidthSchema = Type.Object({
  // Resource-specific fields
  channel_id: Type.String({ minLength: 1 }),
  allocated_bps: Type.Integer({ minimum: 0 }),
  used_bps: Type.Integer({ minimum: 0 }),

  // Governance fields (spread) — ALWAYS last
  ...GOVERNED_RESOURCE_FIELDS,
}, {
  $id: 'GovernedBandwidth',
  additionalProperties: false,
});

export type GovernedBandwidth = Static<typeof GovernedBandwidthSchema>;
```

### Step 2: Create constraint file

```json
{
  "$schema": "https://loa-hounfour.dev/schemas/constraint-file.json",
  "schema_id": "GovernedBandwidth",
  "origin": "genesis",
  "contract_version": "8.0.0",
  "expression_version": "1.0",
  "constraints": [
    {
      "id": "bw-01",
      "expression": "used_bps <= allocated_bps",
      "severity": "error",
      "message": "Used bandwidth cannot exceed allocation"
    }
  ]
}
```

### Step 3: Add exports

1. Add to `src/commons/index.ts` barrel
2. Add conformance vectors in `vectors/conformance/commons/governed-bandwidth/`
3. Add to `vectors/manifest.json`

### Step 4: Conservation law invariants

Define at least one conservation invariant in the constraint file. For strict enforcement, ensure the `invariants` array in the `ConservationLaw` field is non-empty.

## Consequences

- New governed resource types are **schema configuration** — same governance infrastructure with different resource-specific fields.
- The 3 existing isomorphisms (credits, reputation, freshness) become the canonical reference implementations.
- Cross-language consumers get flat JSON Schema files (no `allOf` complexity).
- Future governance field additions use `governance_extensions` without breaking `additionalProperties: false`.

## Industry Precedent

- **Kubernetes CRDs**: Custom Resource Definitions follow the same pattern — shared metadata (apiVersion, kind, metadata, spec, status) with custom spec fields. GovernedResource is our CRD.
- **Terraform Providers**: Every resource has shared lifecycle hooks (create, read, update, delete) with resource-specific schema. Same pattern.
- **Elinor Ostrom's 8 Principles**: Nobel Prize-winning framework for governing common-pool resources. The protocol maps directly to these principles, providing rigorous theoretical grounding for the governance model.
