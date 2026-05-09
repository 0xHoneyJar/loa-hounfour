# FR-A6 Consumer Integration Audit — v8.5.0 → v8.6.0

> **Artifact state**: **FRAMEWORK MERGED — GATE NOT YET CLEARED.**
> Merging this PR ships the audit framework + per-consumer questionnaire
> + ORD-5 firing-rate query + decision matrix. **It does NOT clear the
> cycle-005 ship gate** this doc defines. The gate is cleared only
> when every §5 completion checkbox is ticked AND §5.4's live status
> table is fully populated. Reviewers approving the framework-merge
> are NOT approving gate-cleared status; the cycle-005 PR-A3.12 ship
> tracks the gate-cleared status separately in NOTES.md (operator-
> private). Per Meta release-readiness precedent, conflating
> framework-merged with gate-cleared causes cross-team coordination
> failures — this banner is the explicit separation.

> **Operational status:** framework + dispatched questionnaire; per-consumer answers tracked in operator-side notes (consumer responses do not land in the committed surface — only material drift surfaces here as targeted patches).

| Field | Value |
|---|---|
| FR | FR-A6 — consumer integration validation review |
| Audit date | 2026-05-09 |
| Trigger | v8.5.0 substrate-agnostic naming + v8.6.0 cycle-005 cluster ship |
| Decision matrix | material drift → targeted patches in this PR (additive only); cosmetic drift → reuse-audit log entry, no patch; no drift → close |
| Method | hounfour-side audit (this doc) + per-consumer questionnaire dispatched to each downstream repo's maintainer (operator-driven, parallel) |
| ORD-5 promotion gate | firing rate <1% over RC window → promote `severity: 'warning'` → `'error'`; 1-5% → defer to v8.7.0; >5% → vocabulary expansion required |
| Anonymization | per pollution invariant, downstream consumers are referenced as Consumer A / B / N — concrete repo names live only in operator-private notes (not committed) |

---

## 1. Why this audit gates the cycle-005 ship

The v8.5.0 substrate-agnostic naming pass renamed several schema surfaces from wedge-fitted names (`SyntheticDeliberation*`, `ProtocolPanel*`, etc.) to substrate-agnostic ones (`Assertion`, `PanelVerdict`, `PanelDecisionArtifact`, `DeliberationDissent`, etc.). v8.6.0 (cycle-005) ships a fresh schema cluster (PhaseCompletionEnvelope tier-1/tier-2, OracleDigest, EpicCheckpoint, PlanSignoffEnvelope, PlanAmendmentRequest, Challenge, CanonicalRun) plus contract changes (FR-A4 ORD-3 fail-closed opt-in, FR-A5 ed25519 narrowing) on top of v8.5.0.

Every downstream consumer that integrated against the v8.4.0 surface needs to:

1. Confirm `package.json` pins `@0xhoneyjar/loa-hounfour` at a range that resolves v8.5.0 — `^8.4.0` resolves the new minor under standard npm semver and is sufficient at the install layer; `^8.5.0` is the recommended explicit pin so a future re-pin doesn't accidentally backslide. (The contradiction between "anything ≥ ^8.4.0 works" and "we recommend ^8.5.0" is intentional: the first is a portability claim, the second is a hygiene claim.)
2. Confirm any direct schema-name references migrated to v8.5.0 names (or that they were never holding the wedge-fitted names directly).
3. Decide whether to opt into v8.6.0's new contract surfaces (FR-A4 fail-closed, FR-B* schemas, FR-A2 cross-runner harness) at their own cadence.

**Material vs cosmetic** (single definition, owns both directions):

- **Material drift** = a *consumer-observable behavior change* between v8.4.0 and v8.6.0 that requires either (a) a hounfour patch to restore prior behavior, or (b) a documented consumer-side migration. Material drift can be hounfour-side (broken contract — patch lands here) or consumer-side (consumer code observes behavior it didn't before — MIGRATION.md entry, no hounfour patch). Both classes are "material"; the matrix in §4 splits them by who owns the change.
- **Cosmetic drift** = a naming-only difference in non-load-bearing surfaces (comments, doc strings, internal variable names) that does not affect runtime or types. No patch, no migration; reuse-audit log entry only.

## 2. Hounfour-side surface inventory (v8.5.0 → v8.6.0)

The contracts below are what each downstream consumer is checked against. All exports live under `@0xhoneyjar/loa-hounfour` package subpaths (`/core`, `/economy`, `/governance`, `/constraints`, `/integrity`, `/composition`, `/commons`, `/vectors`).

### 2.1 Renamed schemas (v8.4.0 → v8.5.0)

| v8.4.0 wedge-fitted | v8.5.0 substrate-agnostic | Consumer action |
|---|---|---|
| `SyntheticDeliberationOutputSchema` | `PanelDecisionArtifactSchema` | Update import name; types compatible. |
| `SyntheticDeliberationVerdictSchema` | `PanelVerdictSchema` | Update import name. |
| `OrgOverseerSchema` | `OrgIdentitySchema` | Update import name. |
| `OrgOverseerRepresentativeDelegationSchema` | `OrgRepresentativeDelegationSchema` | Update import name. |
| `*ProtocolPanel*` (various) | `*Panel*` (de-prefixed) | Bulk rename. |

The v8.5.0 ship was 2026-05-07 (tag); consumers that pinned to `^8.5.0` between then and 2026-05-09 saw the rename.

### 2.2 New v8.6.0 schemas (cycle-005)

| Schema | $id | Status |
|---|---|---|
| `PhaseCompletionEnvelopeTier1Schema` | `PhaseCompletionEnvelopeTier1` | Tier-1 envelope (agent emission) |
| `PhaseCompletionEnvelopeSchema` | `PhaseCompletionEnvelope` | Tier-2 envelope (cluster-wrapped) |
| `OracleDigestSchema` | `OracleDigest` | per-pulse digest |
| `OracleHealthEnvelopeSchema` | `OracleHealthEnvelope` | per-cluster health snapshot |
| `EscalationEnvelopeSchema` | `EscalationEnvelope` | per-escalation envelope |
| `RollbackPlanSchema` | `RollbackPlan` | per-EPIC rollback artifact |
| `LatencyHistogramEnvelopeSchema` | `LatencyHistogramEnvelope` | per-phase latency envelope |
| `EpicCheckpointSchema` | `EpicCheckpoint` | per-EPIC checkpoint state |
| `PlanSignoffEnvelopeSchema` | `PlanSignoffEnvelope` | plan content-hash signoff |
| `PlanAmendmentRequestSchema` | `PlanAmendmentRequest` | plan-amendment proposal |
| `ChallengeSchema` | `Challenge` | challenge envelope (FR-A1) |
| `ChallengeTypeSchema` | `ChallengeType` | 9-member enum |
| `ChallengeRequestedEffectSchema` | `ChallengeRequestedEffect` | 6-member enum |
| `CanonicalRunSchema` | `CanonicalRun` | required-phases-per-EPIC source-of-truth (FR-B1) |
| `RequiredPhaseSchema` | `RequiredPhase` | inner shape |
| `PhaseKindSchema` | `PhaseKind` | 5-member enum |

### 2.3 New v8.6.0 contract surfaces

- **FR-A4**: `validate(schema, payload, { failClosed: true })` opts into fail-closed semantics for `'x-chain-bearing'` schemas. Default `failClosed: false` preserves v8.5.x behavior; v9.0.0 will flip the default.
- **FR-A2** (PR-A3.9): `parity_protocol_version: 1.1.0` cross-language conformance harness across TS / Python / Go / Rust. Manifest vocabulary widened to include `'pass-cross-field-deferred'` for `invalid-cross-field` bucket fixtures.
- **FR-A3** (ORD-5): `ord-5-capability-scope-vocabulary` constraint stays at `severity: 'warning'` for v8.6.0; promotion gate is this audit.
- **FR-A5**: ed25519 signature patterns narrowed `{86,88}` → `{86}` on `OrgRepresentativeDelegation`, `PanelVerdict`, `CrossScoreReport`. Cryptographic impossibility per RFC 4648 §5; no consumer producing spec-conformant signatures should be affected.
- **FR-B2 NFR-4**: 4 KB canonical-JSON cap on `PhaseCompletionEnvelope` via `Type.Transform`.
- **FR-C1/C2/C3** (PR-A3.3): state-bearing constraint builtins (`nonce_unique_per_signer_window`, `sequence_monotonic_per_cluster`, `chain_validator_prev_hash`) — consumers passing `chainContext` into `validate(...)` opt into library-side checking.
- **FR-C4** (PR-A3.6): `plan_content_hash_unchanged_since_signoff` builtin emits NA-3 `SIGNOFF_TTL_OBSERVED` on hash-match.

## 3. Per-consumer questionnaire

Dispatched to each downstream consumer's maintainer (or AI agent instance working that consumer's repo). Each section corresponds to a contract axis the consumer's integration surface touches.

### Q1. Pinning & version

```
What does your package.json pin for @0xhoneyjar/loa-hounfour?
- [ ] ^8.4.0  — resolves v8.5.0+ on `npm install`; fine at the install layer
- [ ] ^8.5.0  — explicit floor at the substrate-agnostic surface (RECOMMENDED if you depend on the renamed exports by name)
- [ ] 8.5.x exact  — will need a re-pin to pick up v8.6.0 features
- [ ] ^8.6.0  — already on cycle-005 surface
- [ ] 8.6.0 exact  — pinned to RC; intentional
- [ ] file: link to local hounfour-stub (RC mode)
- [ ] other: ___
```

### Q2. Direct schema-name references

```
Do you reference any of the v8.4.0 → v8.5.0 RENAMED schema names directly
in your source (imports, type names, hardcoded $id strings)?

Run from your repo root, adjusting paths to match your project layout:

  # Default (covers most layouts):
  grep -rnE 'SyntheticDeliberation|OrgOverseer|ProtocolPanel' \
      --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
      --include='*.json' --include='*.md' \
      .

  # If your repo is large and you want to scope:
  # Replace `.` with any of: src/  app/  lib/  packages/  apps/  pkg/

If non-zero matches:
- Material drift if any reference is on the import / type surface (cannot resolve).
- Cosmetic drift if it's only in comments / docs.
List matches: ___
```

### Q3. v8.5.0 substrate adoption

```
Which v8.5.0 substrate schemas does your code import?
- [ ] AssertionSchema / AssertionStatusSchema / AssertionClassSchema
- [ ] PanelVerdictSchema / PanelDecisionArtifactSchema / DeliberationDissentSchema
- [ ] CrossScoreReportSchema
- [ ] OrgIdentitySchema / OrgRepresentativeDelegationSchema / SuccessionPolicySchema
- [ ] SignatureEnvelopeSchema / KeyringSchema / SignerEntrySchema
- [ ] ForgetRecordSchema / RecallReceiptSchema / AgentEstateSchema
- [ ] none — only v8.4.0 wedge surface
```

### Q4. Validate() invocation pattern

```
Which validate() options do you pass?
- [ ] default (no options) — Value.Check semantics + cross-field validation
- [ ] { acceptDeferred: true } — opt into UnverifiedObligationsManifest
- [ ] { failClosed: true } — opt into FR-A4 fail-closed for x-chain-bearing
- [ ] { chainContext: { granted_by_chain_records: [...] } } — provide chain records
- [ ] crossField: false — disable cross-field tier
- [ ] never call validate() — only Value.Check

Pasting your validate() call sites helps surface drift surfaces.
```

### Q5. Constraint-file evaluation

```
Do you call evaluateConstraint() / evaluateConstraintFile() on any
hounfour constraint files?

If yes: which constraint files and which builtins are exercised?
- [ ] FR-C1 nonce_unique_per_signer_window
- [ ] FR-C2 sequence_monotonic_per_cluster
- [ ] FR-C3 chain_validator_prev_hash
- [ ] FR-C4 plan_content_hash_unchanged_since_signoff
- [ ] PCE-2 signer_key_id_matches_derivation
- [ ] OD-2 utf8_byte_length_max
- [ ] LHE-1 percentiles_monotonic_nondecreasing
- [ ] no constraint-file evaluation — just structural validate()
```

### Q6. Cross-runner harness adoption (FR-A2 / PR-A3.9)

```
Are you running the cross-language conformance harness?
- [ ] Yes, all 4 runners (TS / Python / Go / Rust)
- [ ] Yes, TS only
- [ ] Yes, TS + Python only
- [ ] No — but planning to in v8.7.0
- [ ] No — TS-only consumer; cross-runner not relevant

If yes: pasting your most recent harness run output helps confirm
parity_protocol_version 1.1.0 alignment.
```

### Q7. ORD-5 firing-rate (gate question)

```
Have you observed the ORD-5 capability-scope-vocabulary check fire
in your validation logs / unverified_obligations manifests over the
v8.6.0 RC shadow window (since 2026-05-07)?

The script below counts firings against total validations. It assumes
your validation logs are JSON-lines with one record per `validate(...)`
call — the JSON shape that matters is:

    { ..., "schema": "OrgRepresentativeDelegation", ... }
    { ..., "unverified_obligations": { "unverified_rules": [
        { "rule_id": "ORD-5", ... }
    ] } }

If your logging shape differs, replace the JSON-shaped patterns below
with your equivalent. The numerator must count ONLY ORD-5 emissions
on the unverified_obligations manifest, NOT mentions of "ORD-5" in
arbitrary log content (stack traces, debug strings, etc.) — that
distinction is what makes the firing-rate gate meaningful.

#!/bin/bash
# ORD-5 firing-rate query (run in consumer repo's log-archive dir).
# Requires jq (POSIX-portable) to parse each line as JSON instead of
# pattern-matching at the line-text level — iter-2 F-003 mitigation:
# grep-based counting overcounts if a line carries multiple events,
# embedded JSON, or non-validation records that happen to contain
# the pattern keys. The promotion gate is too consequential to drive
# off line-level heuristics.
#
# Assumed log shape (JSONL — one JSON object per line):
#   { "schema": "<SchemaName>", "valid": <bool>,
#     "unverified_obligations": {
#       "unverified_rules": [
#         { "rule_id": "<id>", ... }
#       ]
#     },
#     ...
#   }
#
# Adjust the jq selectors below if your shape differs (e.g. nested
# under "validation_result", "manifest", etc.). The script's
# guarantees rest on the input being valid JSON-per-line; mixed
# log streams must be filtered to validation records first.
set -euo pipefail
LOG_GLOB="${1:-logs/*.jsonl}"

if ! command -v jq >/dev/null 2>&1; then
  echo "FATAL: jq is required. Install via package manager (apt: jq, brew: jq, etc.)." >&2
  exit 2
fi

# iter-3 mitigation: distinguish "log archive empty" from "log archive
# present but no validation records observed". Silently treating both
# as 0/0 is the Knight Capital ambiguous-empty-state pattern — gate
# decisions cannot ride on it. Resolve glob to a concrete file list
# first; zero matches is a hard signal requiring acknowledgment.
shopt -s nullglob 2>/dev/null || true
# Accept both `path/*.jsonl` glob form and explicit single path.
RESOLVED_FILES=( $LOG_GLOB )
if [[ ${#RESOLVED_FILES[@]} -eq 0 ]]; then
  echo "FATAL: glob '$LOG_GLOB' matched zero files. Either no log archive" >&2
  echo "       exists for the v8.6.0 RC shadow window, or the glob is wrong." >&2
  echo "       Provide an explicit path or fix the glob; do not let absence" >&2
  echo "       of files be misread as 'no firings observed' (Knight Capital" >&2
  echo "       ambiguous-empty-state pattern)." >&2
  exit 3
fi

# Total validation records: each input line that parses as a JSON
# object with a top-level `schema` field. Non-JSON lines (logger
# preamble, stack traces, etc.) are filtered by jq's `select(...)`
# after surviving the initial parse. `cat` over the resolved file
# list ensures we operate on real bytes, not on an empty stream.
TOTAL_VALIDATIONS=$(cat "${RESOLVED_FILES[@]}" \
  | jq -c 'select(type == "object" and has("schema"))' \
  | wc -l)

# ORD-5 firings: validation records whose `unverified_obligations.
# unverified_rules[]` array contains an entry with rule_id == "ORD-5".
# Counts records, not rule entries — a record with two ORD-5 entries
# still counts as one firing event, matching the gate's per-validation
# semantics.
ORD5_FIRINGS=$(cat "${RESOLVED_FILES[@]}" \
  | jq -c 'select(type == "object" and has("schema") and
           (.unverified_obligations.unverified_rules // [] |
            map(.rule_id == "ORD-5") | any))' \
  | wc -l)

echo "Glob: $LOG_GLOB (${#RESOLVED_FILES[@]} file(s) matched)"
echo "Total validation records: $TOTAL_VALIDATIONS"
echo "ORD-5-firing records: $ORD5_FIRINGS"

# Minimum-sample-size floor (iter-2 F-001 mitigation):
# ratios computed on tiny denominators are noise. The promotion gate
# requires N ≥ 1000 validation records before any decision is
# binding. Below the floor, the result is "INSUFFICIENT_DATA" — the
# audit closes with the consumer marked as "no signal" rather than
# letting absence of data be misread as signal of absence.
SAMPLE_SIZE_FLOOR=1000
if [[ "$TOTAL_VALIDATIONS" -lt "$SAMPLE_SIZE_FLOOR" ]]; then
  echo "Sample size below floor (${SAMPLE_SIZE_FLOOR}); decision: INSUFFICIENT_DATA"
  echo "  → in the integration report, mark this consumer as 'no signal'"
  echo "  → the gate cannot be declared satisfied from this consumer alone"
  exit 0
fi

PCT=$(awk -v n="$ORD5_FIRINGS" -v d="$TOTAL_VALIDATIONS" \
     'BEGIN { printf "%.4f", (n * 100.0) / d }')
echo "Firing rate: ${PCT}%"

Decision gate (per consumer, after sample-size floor):
- <1% AND total ≥ 1000 → contributes vote: PROMOTE
- 1-5% AND total ≥ 1000 → contributes vote: DEFER (to v8.7.0)
- >5% AND total ≥ 1000 → contributes vote: BLOCK (vocabulary expansion required)
- total < 1000 → INSUFFICIENT_DATA; consumer cannot vote on the gate

Aggregate gate (across all responding consumers):
- ALL responding consumers vote PROMOTE → promotion ships in this PR
- BLOCK quorum (≥2 distinct consumers vote BLOCK independently) →
  promotion blocked; vocabulary expansion required before re-attempting
  in v8.7.0
- BLOCK singleton (exactly 1 consumer votes BLOCK; others PROMOTE
  or DEFER) → escalate to maintainer review, NOT auto-block. Idiosyncratic
  consumer traffic (e.g., synthetic test load, atypical capability
  scope) should not unilaterally veto a release. The maintainer
  triages: confirms the BLOCK is grounded in real consumer traffic
  (not test artifacts) and either upholds the BLOCK (vocabulary
  expansion required) or downgrades to DEFER (single-consumer signal
  insufficient for promotion but not for blockade). Reasoning logged
  in NOTES.md operator-private notes.
- MIXED vote (some PROMOTE, some DEFER, no BLOCK quorum) → defer to v8.7.0
- ALL responding consumers INSUFFICIENT_DATA → ship the audit framework
  only; promotion deferred to v8.7.0 with a "shadow window inadequate
  on first pass" entry

Appeal path: a consumer voting BLOCK (singleton or quorum) can be
appealed by the maintainer or another consumer producing evidence
that the firing was driven by atypical traffic (e.g., capability-scope
vocabulary used in a test harness rather than in production). Appeal
outcomes ship as a footnote in the operator-private NOTES.md log;
the public audit doc records only the final aggregate vote.
```

### Q8. v8.6.0 schema adoption intent

```
Which v8.6.0 schemas do you intend to import in the next cycle?
(For prioritization of consumer-channel docs in v8.6.0 GA.)
- [ ] PhaseCompletionEnvelope (Tier-1 / Tier-2)
- [ ] OracleDigest / OracleHealthEnvelope
- [ ] EscalationEnvelope / RollbackPlan / LatencyHistogramEnvelope
- [ ] EpicCheckpoint
- [ ] PlanSignoffEnvelope / PlanAmendmentRequest
- [ ] Challenge / ChallengeType / ChallengeRequestedEffect
- [ ] CanonicalRun / RequiredPhase / PhaseKind
- [ ] none — staying on v8.5.0 substrate
```

### Q9. Drift findings

```
Has anything broken since you bumped from v8.4.0 to v8.5.0 (or from
v8.5.0 to v8.6.0)? Type errors, schema-mismatch errors,
unverified_obligations entries you weren't expecting, etc.

Free-form. Copy any error messages or stack traces. If nothing broke,
say so explicitly — that's a confirmatory signal.
```

## 4. Decision matrix

After consumer answers land, drift is classified per:

| Drift class | Trigger | Action |
|---|---|---|
| **Material — broken contract** | Consumer code cannot resolve a hounfour symbol; types don't match; runtime error during normal use | Targeted additive patch in PR-A3.10 (e.g., ship a deprecated alias re-export). Document as MIGRATION.md entry. |
| **Material — unverified-obligation surprise** | Consumer's existing validate() calls now produce `unverified_obligations` they don't handle | Document as MIGRATION.md entry; consumer ships a manifest-handling update. No hounfour patch. |
| **Cosmetic — naming only** | Consumer comments / docs reference the renamed surface | Reuse-audit log entry only. No patch. |
| **No drift** | Consumer already on substrate-agnostic naming; no broken imports | Confirmatory entry in audit log. No patch. |

ORD-5 promotion: separate decision per Q7's firing-rate data. Promotion is a `severity` edit on the ORD-5 entry of [`constraints/OrgRepresentativeDelegation.constraints.json`](../../constraints/OrgRepresentativeDelegation.constraints.json) (one line: `"severity": "warning"` → `"severity": "error"`) plus +N acceptance vectors covering the new error-mode behavior.

## 5. Status & explicit completion criteria

Per-consumer dispatched questionnaires + ORD-5 firing-rate queries are operator-driven parallel work. The audit is **complete** only when ALL of the following hold:

### 5.1 Dispatch completeness

- [ ] Every known downstream consumer has been contacted with the §3 questionnaire. Consumer count and identities recorded in operator-private notes (anonymized roll-up posted here as Consumer A / B / N).
- [ ] Each consumer's response status is one of: `responded` (answers provided), `offline` (no log archive available, explicitly noted), `declined` (consumer maintainer declined to participate, noted with reason), or `pending` (still awaiting reply by the cycle-005 close).
- [ ] Pending count below cycle-005 ship threshold: ≤1 consumer in `pending` at ship time, with the gate held open OR the pending consumer documented as a v8.7.0 follow-up commitment.

### 5.2 ORD-5 promotion criteria

The promotion gate cannot be declared satisfied by absence of data. Specifically:

- [ ] At least **two** distinct responding consumers contributed a vote (PROMOTE / DEFER / BLOCK / INSUFFICIENT_DATA per §3 Q7's decision gate).
- [ ] At least **one** responding consumer cleared the sample-size floor (≥1000 validation records). If zero clear the floor, the gate result is INSUFFICIENT_DATA and promotion defers to v8.7.0 with a "first-pass shadow window inadequate" entry.
- [ ] Aggregate vote computed per §3 Q7's aggregate-gate rules.

### 5.3 Drift triage criteria

- [ ] Every Q9 free-form response triaged as material-broken-contract / material-unverified-obligation / cosmetic / no-drift per §4.
- [ ] Material-broken-contract findings have either a landed patch in this PR OR a forward-pointer commit message naming the v8.7.0 follow-up.
- [ ] Material-unverified-obligation findings have a MIGRATION.md entry.
- [ ] Cosmetic findings logged in the reuse-audit log.

### 5.4 Live status (filled in as operator dispatches resolve)

| Consumer | Status | Sample size | Vote (Q7) | Drift findings (Q9) |
|---|---|---|---|---|
| Consumer A | pending | — | — | — |
| Consumer B | pending | — | — | — |
| Consumer N | pending | — | — | — |

**Targeted patches in this PR**: pending §5.3 triage.

**ORD-5 promotion decision**: pending §5.2 criteria; current state INSUFFICIENT_DATA.

> §5.4 above is the cycle-005 ship gate. Until every row is populated and §5.1 + §5.2 + §5.3 boxes are checked, the audit is INCOMPLETE and the cycle-005 PR-A3.12 ship is conditional on either (a) completing the audit or (b) explicitly carrying ORD-5 promotion + outstanding consumer responses to v8.7.0 with a NOTES.md entry.

---

## 6. References (committed surface only)

- [`MIGRATION.md`](../../MIGRATION.md) — committed migration notes; targeted patches will land here
- [`scripts/run-cross-runners.sh`](../../scripts/run-cross-runners.sh) — Q6's surface (cross-language conformance harness)
- [`constraints/OrgRepresentativeDelegation.constraints.json`](../../constraints/OrgRepresentativeDelegation.constraints.json) — ORD-5 constraint; promotion lands here
- [`docs/audits/fr-a5-ed25519-corpus-2026-05.md`](./fr-a5-ed25519-corpus-2026-05.md) — sibling cycle-005 consumer-corpus audit (pattern reference for this doc's shape)

@since v8.6.0 — PR-A3.10 (FR-A6).
