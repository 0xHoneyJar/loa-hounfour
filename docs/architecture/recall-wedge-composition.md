# Recall Wedge composition

This document describes the **Straylight Recall Wedge** as a composition
of existing `loa-hounfour` primitives. Hounfour ships the *shape* of
each primitive (TypeBox schema + JSON Schema + constraints + conformance
vectors); the wedge ships the *runtime* that orchestrates them. This
boundary is the same class-vs-policy split documented in
[`ADR-010`](../adr/ADR-010-class-vs-policy-boundary.md).

The wedge does **not** introduce new schemas. Every requirement listed
below is satisfied by primitives already present in the v8.5.0 PR-A2.3
surface (`Assertion` / `Recall*` / `Forget` / `Commitment*` /
`AgentEstate*`), plus the v8.6.0 PR-A3.7 `Challenge` layer, plus the
v8.4.0 `OrgIdentity` / signing-context envelope. The only contract-side
addition required for the wedge is a soft-registry entry under
`AUDIT_EVENT_TYPES_KNOWN_PREFIXES` (the `0xhoneyjar:straylight:` prefix)
and the conformance round-trip corpus under
`vectors/conformance/recall-wedge/`.

---

## Requirement → primitive mapping

| Recall Wedge requirement | Hounfour primitive | Source | Notes |
|---|---|---|---|
| Actor estate identity | `AgentEstate` + `AgentEstateStatus` | `src/governance/agent-estate.ts`, `agent-estate-status.ts` | 5-state lifecycle (`provisioning` / `active` / `paused` / `transferring` / `dissolved`); state-machine validity is consumer-side per ADR-010. |
| Signed typed assertions | `Assertion` (8-variant status-discriminated union) | `src/governance/assertion.ts` | `candidate` is shape-only; the other 7 variants are crypto-bearing and require `signatures: SignatureEnvelope[]` (`minItems: 1`). |
| Assertion class (illocutionary force) | `AssertionClass` | `src/governance/assertion-class.ts` | 7-member core (`attestation` / `observation` / `assessment` / `consent` / `delegation` / `commitment` / `disclosure`) + 3-segment consumer-namespace fallback. |
| Assertion lifecycle status | `AssertionStatus` | `src/governance/assertion-status.ts` | 8 members; transition validity is consumer-side (Assertion's A3 manifest entry). |
| Assertion provenance | `ClaimGrounding` (extended in PR-A2.3) | `src/governance/panel-decision-artifact.ts` | Reused as the `provenance: ClaimGrounding[]` field on `Assertion`. |
| Signature envelope | `SignatureEnvelope` | `src/governance/signature-envelope.ts` | `x-crypto-bearing: true`. Ed25519 unpadded base64url; `signed_payload_hash` is `sha256(safeCanonicalize(payload))`. |
| Signer competence (Layer 3 of authority cascade) | `SignerCompetenceRule` + `SignerCompetenceResult` | `src/governance/signer-competence-rule.ts`, `signer-competence-result.ts` | Result envelope carries a `PolicyDecisionOutcome`. |
| Keyring (Layer 2) | `Keyring` + `SignerEntry` + `SignerType` + `SignerStatus` + `SignatureType` | `src/governance/keyring.ts`, `signer-entry.ts`, etc. | Composes with v8.4.0 `OrgIdentity` (Layer 1). |
| Policy decision vocabulary | `PolicyDecisionOutcome` | `src/governance/policy-decision-outcome.ts` | 5 members (`allow` / `deny` / `needs_review` / `verified` / `rejected`). |
| Challenge | `Challenge` + `ChallengeType` + `ChallengeRequestedEffect` | `src/governance/challenge.ts`, `challenge-types.ts` | v8.6.0 PR-A3.7. Lazy-link to `Assertion.assertion_id` via `target_assertion_id`. Crypto-bearing. |
| Revocation / sanction | `Sanction` + `RevocationPolicy` + `DisputeRecord` | `src/schemas/sanction.ts`, `permission-boundary.ts`, `dispute-record.ts` | Compose with `Assertion.status: 'revoked'`. |
| Forget primitive | `ForgetRecord` | `src/governance/forget-record.ts` | 4-variant discriminated union; `crypto_full_destruction` requires `legal_mandate_reference`. See `forget-record-semantics.md` for the verifiability truth table. |
| Recall request | `RecallRequest` | `src/governance/recall-request.ts` | Carries `subject_agent_id`, `SurfaceContext`, `ReceiptDetailLevel`, optional `requestor_signer_id`. |
| Recall pack | `RecallPack` | `src/governance/recall-pack.ts` | Items + redaction summary + exclusion summary + content-addressed `pack_hash`. |
| Recall receipt | `RecallReceipt` | `src/governance/recall-receipt.ts` | Crypto-bearing; commits to the pack via `pack_hash` literal (does NOT recurse into pack body). |
| Surface scoping | `SurfaceContext` | `src/governance/surface-context.ts` | 5-member core (`public` / `private` / `system` / `demo` / `test`) + 3-segment consumer namespace. |
| Privacy + risk classification | `PrivacyScope` + `RiskLevel` | `src/governance/privacy-scope.ts`, `risk-level.ts` | Carried on every `Assertion`. |
| Receipt detail level | `ReceiptDetailLevel` | `src/governance/receipt-detail-level.ts` | Verbosity selector for the matching receipt. |
| Optional commitment root | `CommitmentRoot` + `CommitmentType` | `src/governance/commitment-root.ts`, `commitment-type.ts` | 4 anchor categories: `estate_checkpoint` / `recall_receipt` / `transition_bundle` / `revocation_checkpoint`. Crypto-bearing AND integrity-bearing. |
| Audit/event trace vocabulary | `AUDIT_EVENT_TYPES_KNOWN_PREFIXES` + `isThreeSegmentEventType` + `extractEventTypePrefix` | `src/vocabulary/audit-event-types.ts` | 3-segment `<github-org>:<consumer>:<event>` pattern; `0xhoneyjar:straylight:` is registered in the soft registry. |
| Canonicalization | `safeCanonicalize` (RFC 8785 + NFC + 100KB cap) | `src/utilities/safe-canonicalize.ts` | Re-exported at root barrel. Single sanctioned call site for hash-domain canonicalization. |

---

## Round-trip flow

```
                     ┌─────────────────────┐
                     │   AgentEstate       │  status: active
                     │   (controller +     │
                     │    keyring binding) │
                     └─────────┬───────────┘
                               │ controller signs
                               ▼
                     ┌─────────────────────┐
                     │   Assertion         │  status: admitted
                     │   (signed,          │  recall_scope: private
                     │    classed,         │
                     │    provenanced)     │
                     └─────────┬───────────┘
                               │ subject of
                               ▼
                     ┌─────────────────────┐
                     │   RecallRequest     │  surface: private
                     │                     │  detail: standard
                     └─────────┬───────────┘
                               │ produces
                               ▼
                     ┌─────────────────────┐
                     │   RecallPack        │  pack_hash = H
                     │   (items +          │
                     │    redactions +     │
                     │    exclusions)      │
                     └─────────┬───────────┘
                               │ acknowledged by
                               ▼
                     ┌─────────────────────┐
                     │   RecallReceipt     │  pack_hash = H
                     │   (signed)          │  receipt_hash = Z
                     └─────────┬───────────┘
                               │ optionally anchored by
                               ▼
                     ┌─────────────────────┐
                     │   CommitmentRoot    │  commitment_type:
                     │                     │     recall_receipt
                     │                     │  subject_hash = Z
                     └─────────────────────┘
```

Each arrow is a **lazy-link string-equality reference** per the
[`sdd.md`](sdd.md) §1.5 lazy-link convention — Hounfour does not own
the join, the consumer does. The conformance corpus at
`vectors/conformance/recall-wedge/` exercises every link with
deterministic UUIDs and placeholder hashes, and
`tests/vectors/recall-wedge-vectors.test.ts` asserts the equalities at
runtime.

## Audit/event vocabulary

The soft-registry entry registers `0xhoneyjar:straylight:` as the
3-segment prefix the wedge uses for `AuditEntry.event_type` strings.
The conventional event-type vocabulary documented above the registry
covers the recall lifecycle:

```
0xhoneyjar:straylight:assertion.admitted
0xhoneyjar:straylight:assertion.challenged
0xhoneyjar:straylight:assertion.revoked
0xhoneyjar:straylight:assertion.forgotten
0xhoneyjar:straylight:estate.transition.applied
0xhoneyjar:straylight:recall.request.received
0xhoneyjar:straylight:recall.pack.assembled
0xhoneyjar:straylight:recall.receipt.signed
0xhoneyjar:straylight:commitment.anchored
```

These types are **informational** — Hounfour does not enforce them,
and the wedge MAY mint additional types under the same prefix without
re-registering. `isThreeSegmentEventType()` and
`extractEventTypePrefix()` are the structural-validation helpers
consumers should call.

## Canonicalization path

Every hash field on the Recall Wedge artifacts (`Assertion.body_hash`,
`SignatureEnvelope.signed_payload_hash`, `RecallPack.pack_hash`,
`RecallReceipt.receipt_hash`, `CommitmentRoot.subject_hash`) is computed
by the consumer as `sha256(safeCanonicalize(payload))`, where
`safeCanonicalize` is the sanctioned helper at
`src/utilities/safe-canonicalize.ts` re-exported from the root barrel.
The helper enforces NFC normalization on every string value, RFC 8785
canonical JSON, and a 100 KB serialized-byte cap. RULE-5 of the
class-vs-policy structural lint blocks direct `canonicalize` package
imports outside that file, so any wedge-side hash code path that bypasses
the cap is visible in code review.

See [`hashing-spec-freeze-v8.5.md`](hashing-spec-freeze-v8.5.md) for the
hash-domain freeze that load-bears each `*_hash` field above.

## Crypto-bearing safe-by-default

The wedge surface includes five crypto-bearing schemas:

- `Assertion` (variant-aware: 7 of 8 variants)
- `SignatureEnvelope`
- `RecallReceipt`
- `Challenge`
- `CommitmentRoot` (also `x-integrity-bearing`)

`validate(<schema>, payload)` returns
`{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` for these
schemas unless the caller passes `{ acceptDeferred: true }`. The wedge
runtime MUST opt in *and* reconcile the unverified-obligations manifest
(verify Ed25519 signatures, recompute hashes against the canonical body)
before treating the artifact as authoritative.

## What this composition does NOT cover

- **`EstateTransition` / `TransitionReceipt`** — explicitly deferred
  from v8.5.0 PR-A2.3 to cycle-005 and not picked up there. The wedge's
  estate-transition recording uses the existing primitives:
    1. Update `AgentEstate.status` from one `AgentEstateStatus` member
       to another. State-machine validity is consumer-side per ADR-010.
    2. Anchor the transition record by minting a `CommitmentRoot` with
       `commitment_type: 'transition_bundle'` over the canonicalized
       transition body. `CommitmentTypeSchema` reserves the
       `transition_bundle` member explicitly for this case (see the
       inline description in `src/governance/commitment-type.ts:28-30`).
    3. Emit an audit event under
       `0xhoneyjar:straylight:estate.transition.applied`.
- **Runtime orchestration / endpoint surfaces** — Hounfour ships
  contracts only; the wedge runtime is a downstream concern.
- **Onchain anchor adapters** — `CommitmentRoot.anchor_chain_id` and
  `anchor_tx_hash` are optional opaque fields that Hounfour does not
  parse. The chain-side adapter is consumer code per ADR-010.

## Cross-references

- [`ADR-010`](../adr/ADR-010-class-vs-policy-boundary.md) — class-vs-policy boundary the wedge composition respects.
- [`authority-cascade.md`](authority-cascade.md) — three-layer authority cascade (`OrgIdentity` → `Keyring` → `SignerCompetenceRule`) the assertion + receipt signers reach into.
- [`forget-record-semantics.md`](forget-record-semantics.md) — verifiability truth table for the four `forget_scope` variants the wedge calls into for `assertion.forgotten` events.
- [`hashing-spec-freeze-v8.5.md`](hashing-spec-freeze-v8.5.md) — the hash-domain freeze that load-bears every `*_hash` field on the wedge artifacts.
- [`vectors/conformance/recall-wedge/`](../../vectors/conformance/recall-wedge/) — the round-trip conformance corpus.
- [`tests/vectors/recall-wedge-vectors.test.ts`](../../tests/vectors/recall-wedge-vectors.test.ts) — the per-schema + composition-invariant harness.
