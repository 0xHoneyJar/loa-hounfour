# Epistemic Tristate Pattern

## Definition

A three-valued logic pattern for trust-sensitive assertions where the system
must distinguish between "known to be true," "known to be false," and "unknown."

## When to Use

Use the Epistemic Tristate when your subsystem:
- Makes trust assertions that could be unverifiable at runtime
- Deals with verification that depends on external state (keys, snapshots, context)
- Must communicate uncertainty honestly rather than defaulting to pass/fail

Decision rubric: If "false" and "I don't know" would require different consumer
actions, you need three states, not two.

## Instances in loa-hounfour

| Subsystem | Type | States | File |
|-----------|------|--------|------|
| Conservation | `ConservationStatus` | `conserved \| violated \| unverifiable` | `vocabulary/conservation-status.ts` |
| Signature | `SignatureVerificationResult` | `verified: true \| false \| 'unverifiable'` | `utilities/signature.ts` |
| Conformance | Implicit | match \| mismatch \| missing dimension | `utilities/conformance-matcher.ts` |

## Why Not a Generic Type?

The instances differ in shape:
- `ConservationStatus` is a string literal union (TypeBox schema)
- `SignatureVerificationResult` is a discriminated union with mixed types
- Conformance matching is implicit (missing dimension = unknown)

Forcing a generic type would sacrifice type safety for uniformity.
The pattern's value is in **naming**, not **abstracting**.

Decision: FL-PRD-006 — "instances differ too much for generic type."

## Parallels

| System | Tristate | Problem Solved |
|--------|----------|----------------|
| Kubernetes conditions | `True \| False \| Unknown` | Controllers can't distinguish "unhealthy" from "haven't checked" |
| Protobuf field presence | set \| default \| absent | `has_field()` distinguishes explicit default from absent |
| Certificate Transparency | good \| revoked \| unknown | OCSP responders may not have revocation data yet |
| SQL NULL | true \| false \| NULL | Ternary logic for missing/unknown data |
| Lukasiewicz (1920) | 1 \| 0 \| 1/2 | Formalized three-valued propositional logic |

## Invariant

All three states MUST be distinguishable -- no two states may collapse to
the same consumer behavior. If consumers treat "false" and "unknown" identically,
the tristate has degenerated to a boolean and should be simplified.

See: `constraints/EpistemicTristate.constraints.json`
