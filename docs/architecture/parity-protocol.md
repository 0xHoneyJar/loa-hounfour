# Parity Protocol — Cross-Runner Conformance Contract

> **Parity-protocol version**: `1.0.0` (introduced alongside hounfour `v8.4.0`).
> **Audience**: Cross-runner implementers (TypeScript / Go / Python / Rust); release coordinators consuming `@0xhoneyjar/loa-hounfour`.

The **parity protocol** is the versioned contract that governs cross-runner agreement. The TypeScript implementation in this repository is the source-of-truth reference; per-language ports — Go, Python, Rust — are required to produce byte-equal results on a defined corpus of conformance vectors. The protocol exists so that consumers running the same library in different languages can rely on identical structural validity, constraint evaluation, and error shape.

This document is the consumer-facing translation of the cross-runner contract. The runtime sweep driver is [`scripts/cross-runner.ts`](../../scripts/cross-runner.ts); the vector corpora live under [`vectors/`](../../vectors/); the per-language runner adapters are referenced from `scripts/cross-runner.ts`.

## 1. Versioning Discipline

The parity-protocol version is **independent of the schema/contract version**. It bumps only when parity *expectations* change:

| Change kind | Bumps `parity-protocol-version`? | Bumps `contract_version`? |
|---|---|---|
| New schema added (additive MINOR) | No | Yes (e.g., 8.4.0 → 8.5.0) |
| New constraint rule on existing schema | No (rule lands in matrix as additive scope) | Yes |
| New builtin (e.g., a sibling to `is_valid_dag`) | Yes (PATCH or MINOR depending on shape compatibility) | Yes |
| Error envelope shape change | Yes (likely MAJOR — breaking) | Yes |
| Cross-runner determinism rule change (e.g., iteration order) | Yes (MAJOR if previously-valid runners would now disagree) | Possibly |
| Asymmetric ratification under override path (consumer co-signs late) | PATCH (e.g., 1.0.0 → 1.0.1) recording asymmetric record | No |

`contract_version` lives in `src/version.ts` and `package.json`. `parity-protocol-version` lives in this document and in the handoff JSON. They are intentionally decoupled: most consumer-facing release work is additive at the schema level (no parity-protocol bump), and the parity bump captures the rare cross-runner contract change.

## 2. Parity Expectation Matrix

For every release that adds schemas, constraint rules, or builtins, all four runners **MUST** produce byte-equal results on the following surfaces:

| Surface | TypeScript reference | Go | Python | Rust |
|---|---|---|---|---|
| `validate(<Schema>, fixture) == true` for every entry in `vectors/<Schema>/valid/` | source-of-truth | match | match | match |
| `validate(<Schema>, fixture) == false` for every entry in `vectors/<Schema>/invalid/` | source-of-truth | match | match | match |
| Failing-rule identity on invalid vectors (which rule rejected the input) | source-of-truth | match | match | match |
| `is_valid_dag(...)` boolean + diagnostic on every entry in `vectors/is-valid-dag/{valid,invalid}/` (incl. `.trace.json` op-count companions) | source-of-truth | match | match | match |
| `extract_path(...)` results on every entry in `vectors/extract-path/{valid,invalid}/` | source-of-truth | match | match | match |
| Error envelope `code` + `path` + `context` (per [`docs/architecture/error-codes.md`](./error-codes.md)) on every rejecting fixture | source-of-truth | match | match | match |
| Signing-conformance corpora at `vectors/signing/` (canonicalization, signature pattern, signing-context binding) | source-of-truth | match | match | match |

**Excluded from cross-runner equality** (locale-affordant; not normative):

- Error envelope `message` strings — runners MAY produce localized prose.
- Internal log lines, debug traces, performance counters.
- Resource limits (memory, timeouts) — runners MAY refuse oversize inputs earlier than the reference, provided they emit a normative `DAG_INPUT_OVERSIZE` envelope.

## 3. Vector Parity Scope

The v8.4.0 vector corpora that fall under parity:

```text
vectors/PanelDecisionArtifact/{valid,invalid}/
vectors/PanelVerdict/{valid,invalid}/
vectors/DeliberationDissent/{valid,invalid}/
vectors/CrossScoreReport/{valid,invalid}/
vectors/OrgIdentity/{valid,invalid}/
vectors/OrgRepresentativeDelegation/{valid,invalid}/
vectors/SuccessionPolicy/{valid,invalid}/
vectors/is-valid-dag/{valid,invalid}/  (+ per-fixture .trace.json companions)
vectors/extract-path/{valid,invalid}/
vectors/signing/                       (canonicalization + signature corpora)
```

Pre-existing v8.0–v8.3 vector subtrees remain in scope by inheritance; no new parity work is required for them in v8.4.0 beyond the cross-runner sweep that exercises the full corpus.

## 4. Builtin Behaviors With Normative Algorithms

Two cross-language hazards are pinned by reference pseudocode in this document's sibling references. Implementers do not have authorial discretion on either:

### 4.1 `is_valid_dag` op-counted post-order DFS

Reference algorithm in `src/constraints/evaluator.ts` (TypeScript reference). Per-runner ports **MUST** implement:

- A 100,000-op cap on the combined cost of indexing + DFS-enter + ref-resolve operations.
- A 10,000-item input pre-guard (`DAG_INPUT_OVERSIZE` with `kind: 'items_count'`).
- A 1,048,576-byte serialized-payload pre-guard (`DAG_INPUT_OVERSIZE` with `kind: 'bytes'`).
- Declared-array-order traversal (no use of language-default Map iteration order, which differs across languages).
- Structured diagnostics emitted per [`docs/architecture/error-codes.md`](./error-codes.md): `DAG_OP_CAP_EXCEEDED`, `DAG_CYCLE_DETECTED`, `DAG_DANGLING_REF`, `DAG_MISSING_ID_FIELD`, `DAG_NON_STRING_ID_FIELD`, `DAG_DUPLICATE_ID`, `DAG_INPUT_OVERSIZE`.

Each entry in `vectors/is-valid-dag/` carries a `.trace.json` companion recording the expected op count and terminating phase (`indexing`, `dfs`, or `ref-resolve`). Runners MUST produce byte-identical traces.

### 4.2 `extract_path` dotted-field resolution

The dotted-field accessor used by `is_valid_dag` (and reusable by other builtins) carries known cross-language hazards: TypeScript uses optional-chaining (`obj?.field?.subfield`); Go uses reflection over `map[string]any` or struct tags; Python uses chained `getattr` / `__getitem__`; Rust pattern-matches on a `serde_json::Value`. The reference behavior:

- Top-level field present → return the value.
- Nested field via dot path (e.g., `'grounding.claim_id'`) → walk in order; return value at terminus.
- Any intermediate is `null`, `undefined`, or non-object → return `undefined` (NOT throw).
- Array-index syntax (`'claims[0].id'`) → **not supported** in v8.4.0; runners MUST reject consistently. A vector exists at `vectors/extract-path/invalid/array-index-syntax-001.json` to assert this.
- Empty path string → return `undefined`.

All four runners MUST produce equivalent results across the entire `vectors/extract-path/` corpus.

## 5. Error Envelope Equivalence

The cross-runner equivalence rule (NORMATIVE):

```text
Two error envelopes E1 and E2 are equivalent ⟺
  E1.code == E2.code              (string equality)
  AND E1.path == E2.path           (string equality after canonicalization)
  AND E1.context == E2.context     (deep structural equality, ignoring key order)
```

The `message` field is excluded from comparison. The `path` field uses RFC 9535 JSONPath dot-notation: `$.<field>` for top-level, `$.<field>.<subfield>` for nested, `$.<field>[<index>]` for array indices. The full code list and per-code `context` shapes are pinned in [`docs/architecture/error-codes.md`](./error-codes.md).

## 6. Warn-Only Window Threshold

For the v8.4.0 release cycle, the consumer-side parity check operates as `warn` (non-blocking) until the **first of**:

- `PR-A1.6` is merged into `main` and **48 hours have elapsed**, OR
- The signed `v8.4.0` git tag has been pushed and CI has published to npm.

After whichever comes first, parity-check transitions to `fail-CI` and divergence is a release-blocking failure. The warn-only window exists to give cross-runner implementers a coordinated grace period after the canonical TypeScript implementation merges. After v8.4.0, every subsequent release has parity-check default-on at `fail-CI` from the moment the release branch opens.

## 7. Handoff Checklist (Machine-Readable Schema)

The co-signed handoff is recorded as JSON. Fields and their meanings:

```jsonc
{
  // The version of THIS document. Bumps independently of the schema release.
  "parity_protocol_version": "1.0.0",

  // The hounfour release this handoff is gating.
  "hounfour_release": "v8.4.0",

  // The consumer's release tag that consumes the matching hounfour release.
  // May be omitted under the override path; recorded retroactively when known.
  "consumer_release": "<consumer-tag>" /* optional */,

  // ISO 8601 timestamp at which the last required signature landed.
  "co_signed_at": "<ISO 8601>",

  // List of GitHub-handle-shaped signers. Standard path: 2 entries
  // (maintainer + consumer release lead). Override path: 1 entry (maintainer).
  "co_signers": ["@janitooor"],

  // Vector subtrees the signers acknowledge as in-scope for the parity check.
  "scope_acknowledged": [
    "vectors/PanelDecisionArtifact/...",
    "vectors/PanelVerdict/...",
    "vectors/DeliberationDissent/...",
    "vectors/CrossScoreReport/...",
    "vectors/OrgIdentity/...",
    "vectors/OrgRepresentativeDelegation/...",
    "vectors/SuccessionPolicy/...",
    "vectors/is-valid-dag/...",
    "vectors/extract-path/...",
    "vectors/signing/..."
  ],

  // Runtime-deferred consumer obligations the consumer-side test suite
  // attests to having implemented. v8.4.0 introduces ORD-1, ORD-2.
  "obligations_acked": ["ORD-1", "ORD-2"],

  // OPTIONAL: upper-bound forecast for human reading. The actual close time
  // is derived at CI evaluation time from the event timestamps below — this
  // field is informational, not the gating value.
  "warn_window_closes_at_upper_bound": "<ISO 8601>" /* optional */,

  // OPTIONAL: human-readable explanation of the warn-window close rule.
  "warn_window_basis": "<text>" /* optional */,

  // OPTIONAL: per-event timestamps that feed the actual warn-window close
  // computation. CI fills each field when the corresponding event lands;
  // the earliest non-null timestamp across the merge+48h and tag-fire fields
  // is the closing event.
  "warn_window_event_inputs": {
    "pr_a1_6_merged_at": "<ISO 8601 | null>",
    "pr_a1_6_merge_plus_48h": "<ISO 8601 | null>",
    "signed_tag_v840_at": "<ISO 8601 | null>",
    "note": "<text>"
  } /* optional */,

  // OPTIONAL: deferred-cosign deadline for the override path (60 days from
  // co_signed_at). Past this date, asymmetric ratification is recorded via
  // a parity-protocol PATCH bump.
  "deferred_co_sign_deadline": "<ISO 8601>" /* optional, override path only */,

  // OPTIONAL: human-readable explanation of the deferred-cosign window.
  "deferred_co_sign_note": "<text>" /* optional */,

  // OPTIONAL: present only on override path. One of:
  //   "co-signed"             — both maintainer and consumer lead signed
  //   "designated-alternate"  — consumer's designated alternate signed
  //   "maintainer-override"   — maintainer signed alone; deferred-co-sign window opens
  "signature_basis": "co-signed" /* optional */,

  // OPTIONAL: ISO 8601 timestamp at which the 7-business-day override window
  // opened (sponsoring consumer release lead pinged). Required when
  // signature_basis == 'maintainer-override' so reviewers can verify the
  // window elapsed before invocation.
  "override_window_opened_at": "<ISO 8601>" /* optional, override path only */,

  // OPTIONAL: human-readable description of the event that opened the
  // 7-business-day override window (e.g., the PR thread or coordination
  // channel ping). Required when signature_basis == 'maintainer-override'.
  "override_window_open_event": "<text>" /* optional, override path only */,

  // OPTIONAL: ISO 8601 timestamp at which the 7-business-day override window
  // closed without consumer response (= co_signed_at on the override path).
  // Required when signature_basis == 'maintainer-override'.
  "override_window_closed_at": "<ISO 8601>" /* optional, override path only */,

  // OPTIONAL: required when signature_basis == 'maintainer-override'.
  // Free-text rationale for invoking the override path. Cites the
  // override_window_opened_at + 7-business-day arithmetic so reviewers can
  // verify the override is well-formed.
  "override_reason": "<text>" /* optional, override path only */
}
```

**Field-rename note.** Earlier drafts of this section referenced a single `warn_window_closes_at` field. Pass-3 replaced that with `warn_window_closes_at_upper_bound` plus `warn_window_event_inputs` after the consensus reviewer flagged a static-precompute-of-a-dynamic-rule conflict: a single timestamp cannot honor "first-of (PR-A1.6 merged + 48h) OR tag fire" semantics. The new shape lets CI compute the real close time from observed events while the upper bound stays human-readable. Implementations parsing pre-pass-3 handoffs SHOULD map the legacy `warn_window_closes_at` to `warn_window_closes_at_upper_bound`.

Both repositories — `loa-hounfour` and the consumer integration repo — commit the handoff JSON before the signed `v8.4.0` tag fires. The hounfour-side artifact lives at `docs/architecture/parity-protocol.handoff.json`.

## 8. Timeout / Override Policy

The co-signed handoff must not become a permanent release blocker if the consumer's release lead is unavailable. Four resolution paths:

| Scenario | Action | `signature_basis` |
|---|---|---|
| Both signers reachable within 5 business days of PR-A1.6 merge | **Standard path:** co-signed handoff JSON committed; tag fires per normal cadence. | `co-signed` |
| Consumer release lead unavailable; consumer org has a designated alternate | Alternate signs; `co_signers` records the alternate. Maintainer proceeds. | `designated-alternate` |
| Consumer release lead unavailable AND no alternate within 7 business days of PR-A1.6 merge | **Override path:** maintainer commits the handoff alone; tag fires with risk flag in `CHANGELOG.md` ("released under deferred-co-sign window"). Consumer co-signs retroactively when available. Failure to co-sign within 60 days post-tag triggers a parity-protocol PATCH bump (1.0.0 → 1.0.1) recording the asymmetric ratification. The 60-day window absorbs typical holiday + on-call rotation gaps. | `maintainer-override` |
| Co-sign in deadlock (signers disagree on scope) | **Halt path:** tag held; signers raise the disagreement to a documented escalation thread. Tag does NOT fire under disagreement. Consistent with the cycle-level cut-line philosophy: better to ship floor scope on time than full scope late and broken. | (no handoff committed) |

The override path is the well-documented escape hatch; the default expectation is co-signature.

## 9. Conformance Sweep Driver

The TypeScript driver lives at [`scripts/cross-runner.ts`](../../scripts/cross-runner.ts). It:

1. Discovers vector subtrees under `vectors/` per the in-scope list (§3).
2. Runs every fixture against the local TypeScript reference and any per-language runners that are wired in.
3. Reports divergences as an aggregated table; non-zero exit on any disagreement.
4. Produces the per-fixture trace artifacts that the handoff JSON references.

Per-language runner adapters live under `scripts/cross-runner.ts` (TypeScript path) and the per-language directories that the script wires (typically `runners/go/`, `runners/python/`, `runners/rust/` in consumer integration repositories — these are not committed in this repository). Consumer integration repos are responsible for keeping their per-language runners current with the canonical TypeScript reference; the parity protocol pins the contract that gates that responsibility.

## 10. Anti-Patterns

- **Don't** rely on `JSON.stringify` (TypeScript), `json.dumps` (Python), `encoding/json` (Go), or `serde_json` (Rust) for canonicalization. Each produces a different byte string for the same logical input. Use an RFC 8785 implementation in every runner.
- **Don't** rely on language-default map iteration order during DAG traversal. Use the declared-array order of the `items` argument.
- **Don't** treat `extract_path('claims[0].id', ...)` as a graceful degradation. v8.4.0 rejects it consistently; relying on a permissive runner produces records that fail in stricter ones.
- **Don't** localize error envelope `code` strings. The codes are normative across runners; only `message` is locale-affordant.
- **Don't** invent new error codes per runner. The taxonomy in [`docs/architecture/error-codes.md`](./error-codes.md) is closed for v8.4.0; additions are MINOR releases of the parity protocol.
