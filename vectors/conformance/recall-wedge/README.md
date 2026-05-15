# Recall Wedge round-trip conformance corpus

End-to-end conformance corpus exercising the **Straylight Recall Wedge**
composition over existing Hounfour primitives. The five fixtures in this
directory are linked by deterministic cross-record references so that a
runner can validate each artifact under its own schema *and* assert the
composition rules between them.

See [`docs/architecture/recall-wedge-composition.md`](../../../docs/architecture/recall-wedge-composition.md)
for the contract-level mapping between the wedge requirements and the
Hounfour primitives consumed here.

## Envelope shape

Every JSON file in `vectors/conformance/**` must validate against
`ConformanceVectorSchema` — i.e. the standard envelope:

```jsonc
{
  "vector_id":        "conformance-recall-wedge-NNN",
  "category":         "recall-wedge",        // registered in ConformanceCategorySchema (v8.7.0)
  "description":      "...",
  "contract_version": "8.7.0",
  "input":            { /* the domain payload — Assertion, RecallRequest, … */ },
  "expected_output":  {},
  "expected_valid":   true,
  "metadata":         { "wedge_role": "...", "schema_ref": "...", ... }
}
```

The Recall Wedge corpus places the original domain payload under
`input` so that:

- the global vector harness (`tests/vectors/conformance-validation.test.ts`)
  passes its `ConformanceVectorSchema` check on every file, and
- the dedicated wedge harness (`tests/vectors/recall-wedge-vectors.test.ts`)
  reads `vector.input` to validate each artifact under its TypeBox
  domain schema and to walk the cross-record references documented
  below.

The `category` is `recall-wedge` for all five vectors — registered as
a top-level conformance category in
`src/vocabulary/conformance-category.ts` (v8.7.0) so that the
directory `vectors/conformance/recall-wedge/` and the vector
`category` field agree under
`tests/vectors/conformance-validation.test.ts`'s Category-Directory
Consistency check. The Recall Wedge composition itself is the
consumer-side contract specified by ADR-010 over the underlying
Hounfour primitives.

## Contents

| File | `metadata.schema_ref` | Role |
|---|---|---|
| `assertion-admitted.json` | `AssertionSchema` (status: `admitted`) | The signed observation that becomes the subject of the recall. |
| `recall-request.json` | `RecallRequestSchema` | The recall request scoped to `surface_context: "private"`. |
| `recall-pack.json` | `RecallPackSchema` | The assembled bundle; one item references the assertion. |
| `recall-receipt.json` | `RecallReceiptSchema` | Signed acknowledgment over `recall-pack.input.pack_hash`. |
| `commitment-root.json` | `CommitmentRootSchema` (`commitment_type: "recall_receipt"`) | Optional onchain anchor over the receipt body hash. |

## Cross-record reference invariants

The corpus is *content-coherent* (the linking fields agree) but
*not crypto-verified* — the fixtures use placeholder hashes and Ed25519
values matching the existing per-schema corpora. Per ADR-010 the
hash-domain reconciliation and signature verification are consumer
obligations; the corpus exists to assert the *shape* of the round-trip
and the structural references between records.

All references below are between `input` payloads (the domain objects
inside the envelopes):

| Invariant | Holds because |
|---|---|
| `recall-pack.input.recall_request_ref === recall-request.input.request_id` | `22222222-2222-4222-8222-222222222222` on both sides. |
| `recall-receipt.input.pack_hash === recall-pack.input.pack_hash` | `sha256:3333…3333` on both sides. |
| `commitment-root.input.subject_hash === recall-receipt.input.receipt_hash` | `sha256:4444…4444` on both sides; `commitment_type` is `recall_receipt`. |
| The packed item `item_id` references the assertion's `assertion_id` | `11111111-1111-4111-8111-111111111111` on both sides via the `assertion-` prefix in `item_id`. |

The `tests/vectors/recall-wedge-vectors.test.ts` harness exercises each
of these invariants alongside per-schema structural validation and
the envelope-level `ConformanceVectorSchema` check.

## What this corpus does NOT cover

- **Constraint-layer `Assertion` rules (A1/A2/A3)** — covered by
  `vectors/Assertion/{valid,invalid}/` and
  `tests/governance/recall-forget-commit-vectors.test.ts`.
- **Per-schema invalid fixtures** — see the per-schema invalid corpora
  under `vectors/<Schema>/invalid/`.
- **Crypto verification of `signature_envelope` / hash recomputation** —
  consumer obligation per ADR-010 (`x-crypto-bearing` schemas surface
  `CRYPTO_DEFERRED` unless `{ acceptDeferred: true }` is passed).
- **Estate transitions** — `EstateTransition` was deferred from v8.5.0
  PR-A2.3 and not picked up in cycle-005. The composition doc explains
  the available `AgentEstate` + `AgentEstateStatus` +
  `CommitmentRoot{commitment_type:'transition_bundle'}` substitute.
