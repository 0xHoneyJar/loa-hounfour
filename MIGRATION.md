<!-- docs-version: 8.6.0-inflight -->

# Migration & Schema Evolution Guide

> Cross-version communication strategy for `@0xhoneyjar/loa-hounfour` consumers.

---

## Policy: `PSEUDO-MAJOR-EQUIVALENT-NULL` classification

> **Scope:** narrowing changes that would, under strict semver, require a
> major bump, but for which the narrowed-out range is provably unreachable
> by any spec-conformant input.

A change MAY be classified `PSEUDO-MAJOR-EQUIVALENT-NULL` and shipped under
a minor bump if and only if **all four** of the following are committed
artifacts in the same PR:

1. **Cryptographic / structural impossibility proof.** The narrowed-out
   range must be unreachable by spec-conformant inputs. The proof is the
   load-bearing evidence (e.g., RFC-derived byte-length math, formal
   protocol invariant). A surveyed-empty consumer corpus is corroborative
   only — the impossibility argument is what gates the bump.
2. **Consumer-corpus audit.** A reproducible script that surveys every
   known consumer for any payload that would no longer validate. Result
   tabulated per-repo. Audit committed under `docs/audits/`.
3. **MIGRATION.md classification entry.** Names the affected schemas,
   before/after patterns, the impossibility proof, and a forward-pointer
   to the rollback target if a real `pollution event` surfaces post-ship.
4. **Negative conformance fixtures.** Fixtures asserting schema-level
   rejection of the narrowed-out range; picked up by the existing test
   runner so regressions surface in CI.

**Evidence asymmetry rule.** When the impossibility proof and the audit
disagree (e.g., a corpus hit on a payload the spec says is impossible),
the proof wins for the classification but the corpus hit is treated as
a producer-side spec violation requiring its own resolution. When the
audit is incomplete (consumers skipped), the impossibility proof must
carry the full load alone.

**Pollution event obligation.** If any consumer surfaces a real payload
in the narrowed-out range post-ship, the change is treated as a
pollution event against the audit. The rollback path documented in the
MIGRATION.md classification entry activates immediately; the v9.0.0
re-tightening absorbs the eventual return to the narrower pattern.

**Norm-decay guard.** Each invocation of `PSEUDO-MAJOR-EQUIVALENT-NULL`
must reference both the four required artifacts AND the strength of the
impossibility proof. The first invocation (FR-A5, this document) sets
precedent. Future invocations citing this policy must demonstrate
equally bulletproof impossibility — the bar does not lower with usage.

### Acceptable proof classes

To prevent norm decay through subjective proof-strength judgment, the
classes of impossibility proof that qualify under this policy are
enumerated:

| Proof class | Qualifying example | Disqualifying example |
|---|---|---|
| **RFC-mandated byte-length encoding math** | "Ed25519 signatures are 64 bytes; RFC 4648 §5 unpadded base64url encodes 64 bytes to exactly 86 characters" (FR-A5) | "Most signatures we've seen are 86 chars" |
| **Cryptographic-primitive output size** | "SHA-256 outputs 32 bytes; hex-encoded `^[a-f0-9]{64}$` cannot accept any other length" | "Our consumers all use SHA-256" |
| **Formal protocol invariants** | "RFC 8785 forbids whitespace in canonical JSON; `\s` characters cannot appear in any spec-conformant payload" | "We've never seen whitespace in payloads" |

**Disqualifying proof classes** (NOT acceptable under this policy):

- "No observed consumer use" alone — corpus-survey evidence is
  corroborative only; it is not a proof class on its own.
- "We control the producer side" — controlling current producers does
  not constrain future producers or non-conformant third-party libraries.
- "The narrowed-out range is ambiguous in the spec" — ambiguity is not
  impossibility; spec-disambiguation work belongs in a major bump.

**Second-reviewer requirement.** Any future MIGRATION.md entry invoking
`PSEUDO-MAJOR-EQUIVALENT-NULL` must include a named second-reviewer
sign-off line confirming the impossibility proof falls into one of the
qualifying proof classes above. The first invocation (FR-A5) serves as
the reviewed precedent; subsequent invocations carry their own sign-off.

The first invocation is FR-A5 below; subsequent narrowings must satisfy
the same bar.

---

## v8.5.x → v8.6.0 (Minor — pre-release: FR-A5 + FR-A4 + FR-A3)

> **Status:** in-flight on `cycle-005`. Landed changes documented below
> as they ship: FR-A5 (ed25519 pattern narrowing), FR-A4 (ORD-3 fail-
> closed opt-in via `validate({ failClosed: true })`), FR-A3 (ORD-5
> vocabulary-drift surfacing at validate() time). Remaining v8.6.0
> work — Tier-1/Tier-2 envelopes, builtins, plan-governance — lands in
> later PRs and is documented as it ships.

### FR-A4 — `validate()` `failClosed` opt-in for `x-chain-bearing` schemas

**Default behavior (NFR-1 — preserved unchanged from v8.5.x).** Calling
`validate(schema, payload)` on an `x-chain-bearing` schema (currently
only `OrgRepresentativeDelegation`) without supplying `chainContext`
continues to return `{ valid: true, unverified_obligations: { ... } }`
with the ORD-3 entry carrying `reason: 'context_absent'`. With chain
context supplied, the entry carries `reason: 'pattern_matching'`. No
v8.5.x consumer code path changes shape.

**FR-A4 opt-in (additive, off-by-default).** v8.6.0 adds a new
`failClosed?: boolean` option to `validate()`. When set to `true`, the
chain-bearing schema validates fail-closed:

```typescript
import { validate } from '@0xhoneyjar/loa-hounfour';
import { OrgRepresentativeDelegationSchema } from '@0xhoneyjar/loa-hounfour/governance';

// Chain context absent → HARD reject (instead of v8.5.x's manifest-only)
const result = validate(OrgRepresentativeDelegationSchema, payload, {
  failClosed: true,
});
// {
//   valid: false,
//   errors: ['CHAIN_CONTEXT_DEFERRED: Chain-bearing schema validated with { failClosed: true } but `chainContext.granted_by_chain_records` was not supplied. ...'],
// }

// Chain context supplied → manifest entry with new reason
const ok = validate(OrgRepresentativeDelegationSchema, payload, {
  failClosed: true,
  chainContext: { granted_by_chain_records: [/* full chain + sentinel */] },
});
// {
//   valid: true,
//   unverified_obligations: {
//     unverified_rules: [{ rule_id: 'ORD-3', reason: 'chain_context_provided', ... }],
//     ...
//   },
// }
```

The `'chain_context_provided'` reason is the explicit acknowledgment that
the consumer has assembled the chain and accepts the v9.0.0 fail-closed
default semantics ahead of the flip.

**Manifest reason matrix (per validate-call mode):**

| Mode | Chain context | Result | ORD-3 manifest reason |
|---|---|---|---|
| Default (`failClosed` unset / `false`) | absent or malformed | `valid: true` | `context_absent` |
| Default | present | `valid: true` | `pattern_matching` |
| Opt-in (`failClosed: true`) | absent or malformed | `valid: false`, error: `CHAIN_CONTEXT_DEFERRED:` | (no manifest — error is the audit signal) |
| Opt-in | present | `valid: true` | `chain_context_provided` |

Twelve cross-product fixtures under
`vectors/OrgRepresentativeDelegation/v8.6.0-fail-closed/` exercise every
cell of the matrix × {genesis-rooted, chained} record kinds.

**Consumer migration path.**

1. **Today (v8.6.0):** continue calling `validate(schema, payload)` with
   no options — behavior is identical to v8.5.x. No work required.
2. **Pre-v9.0.0 hardening (recommended):** opt in to fail-closed
   semantics in production code paths where chain assembly is feasible.
   Pass `{ failClosed: true, chainContext: { granted_by_chain_records: [...] } }`
   to receive the `chain_context_provided` acknowledgment manifest entry.
   Audits can attribute v9.0.0 readiness state per-record from the
   manifest reason.
3. **v9.0.0 (forward-pointer):** `failClosed: true` becomes the default.
   Code paths still calling `validate(schema, payload)` without chain
   context will start receiving `{ valid: false, errors: ['CHAIN_CONTEXT_DEFERRED: ...'] }`.
   Consumers MUST either supply chain context or explicitly opt out via
   `{ failClosed: false }` (which the v9.0.0 release notes will frame as
   a v9.0.x-only escape hatch removed in v10.0.0). The `'context_absent'`
   reason will be retired in v9.0.0; the `'pattern_matching'` reason
   stays for non-fail-closed code paths.

**Type-surface compatibility (TypeScript consumers).** v8.6.0 adds
`'chain_context_provided'` to the `UnverifiedObligationReason` union
type. Runtime-wise this is strict-additive — pre-v8.6.0 consumers who
ignore the field continue to work — but TypeScript consumers using
exhaustive-switch patterns (e.g. `assertNever(reason)` in the default
branch of a `switch (reason)`) will fail compilation on upgrade until
they add a case for `'chain_context_provided'`. This is the standard
"runtime-additive, type-strict-breaking" pattern for discriminated-union
extensions. Add a default branch or an explicit `'chain_context_provided'`
case before bumping the dependency. The same caveat applies to any
future additions to this union; consumers preferring stricter
compile-time guarantees may pin the type via
`Extract<UnverifiedObligationReason, 'context_absent' | 'pattern_matching' | ...>`
to opt out of additivity at the type level.

**Stable error-prefix matching contract.** The `CHAIN_CONTEXT_DEFERRED:`
prefix on the `errors[0]` string is a **stable matching contract**
through v9.0.0. Consumers programmatically distinguishing this error
from generic TypeBox structural errors (which share the same `string[]`
channel) MAY rely on `errors.some(e => e.startsWith('CHAIN_CONTEXT_DEFERRED:'))`.
A structured error variant (e.g. an enumerated error-code field) is a
candidate for v9.0.0 alongside the default-flip — track the upgrade in
the v9.0.0 release notes if it lands. Until then, the prefix is the
contract.

**The `x-chain-bearing` schema flag.** v8.6.0 adds
`'x-chain-bearing': true` to `OrgRepresentativeDelegationSchema`'s
TypeBox options, mirroring the existing `'x-crypto-bearing'` /
`'x-integrity-bearing'` flags. The validator routes the failClosed
opt-in path on this flag; future schemas opting into the same
fail-closed contract simply add the flag and inherit the routing.

### FR-A3 — ORD-5 vocabulary-drift surfacing at `validate()` time

**v8.5.x behavior.** ORD-5 (`capability_scope` keys MUST be in the
canonical CapabilityScope vocabulary: `billing | governance | inference
| delegation | audit | composition`) is defined in
`constraints/OrgRepresentativeDelegation.constraints.json` with
`severity: 'warning'` and `evaluator: 'library'`, but only the
`npm run check:constraints` static lint surfaced it. Calling
`validate()` returned no manifest entry for non-canonical keys — the
authorization-drift signal lived only in the lint output.

**v8.6.0 change (additive only).** `validate()` now surfaces ORD-5 as a
manifest entry at runtime. For each `capability_scope` key outside the
canonical set, one entry is emitted:

```typescript
{
  rule_id: 'ORD-5',
  evaluator: 'library',
  reason: 'vocabulary_drift',
  evaluation_note: 'capability_scope key "<key>" is outside the canonical vocabulary. ...',
  consumer_acknowledgment_required: true,
  ...
}
```

The `valid: true | false` outcome **does not change** — ORD-5 stays at
`severity: 'warning'` for v8.6.0 per the cycle-005 soak window. Promotion
to `severity: 'error'` (which would flip ORD-5 onto the `valid: false`
path) is a PR-A3.10 decision driven by soak telemetry — consumers are
asked to aggregate `reason: 'vocabulary_drift'` entry counts per
calendar window across their record corpus and surface the fire rate to
the maintainer ahead of the PR-A3.10 review.

**Consumer migration path.**

1. **Today (v8.6.0):** existing fixtures using canonical keys
   (`governance`, `billing`, etc.) emit no ORD-5 entries — no test
   changes required.
2. **Drift detection:** add a manifest-walk step in your conformance
   suite that flags `reason: 'vocabulary_drift'` entries and surfaces
   the per-key fire counts. The aggregation period (daily, weekly) and
   the surfacing channel (dashboard, log line, alert) is consumer-
   chosen — hounfour does not specify either.
3. **Pre-PR-A3.10 (mid-cycle-005):** report aggregate fire rates back to
   the maintainer so the soak telemetry can drive the promotion
   decision. Fire rate <1% → promote to error in PR-A3.10; 1–5% → defer
   to v8.7.0; >5% → expand the canonical vocabulary first.

**Authoritative telemetry surface.** ORD-5 fires from two surfaces in
v8.6.0: the `npm run check:constraints` static lint (developer-time
signal, surfaces the rule definition + per-fixture violations) and the
`validate()` runtime manifest (per-record signal, surfaces a
`reason: 'vocabulary_drift'` entry per non-canonical key on each
validation pass). The two surfaces are non-overlapping in practice —
the lint runs at build time on committed fixtures; the manifest fires
at runtime on consumer payloads — but for soak-telemetry aggregation
driving the PR-A3.10 promotion decision, **the runtime manifest is
authoritative**. The static lint is a developer-time ergonomic; do
not aggregate fire counts from its output.

**Telemetry exclusion: fail-closed records.** When `validate(...,
{ failClosed: true })` returns `{ valid: false, errors: [CHAIN_CONTEXT_DEFERRED:...] }`,
the early-return path bypasses ORD-5 surfacing — the record is rejected
outright and no manifest is emitted. Consumers aggregating
`reason: 'vocabulary_drift'` fire counts MUST exclude fail-closed
rejections from the denominator for fire-rate calculation; the fire
rate is conventionally defined over **records that produced a manifest**
(i.e. `valid: true` results), not over the total call count. This
matters for the PR-A3.10 promotion-decision thresholds — a high
fail-closed rejection rate combined with a moderate vocabulary-drift
rate could otherwise misrepresent the soak telemetry. Document the
denominator choice in your aggregation pipeline.

### FR-A5 — Signature pattern narrowing on three v8.4.0 schemas

In v8.6.0 the `signature` field on `OrgRepresentativeDelegation`,
`PanelVerdict`, and `CrossScoreReport` narrows from
`^ed25519:[A-Za-z0-9_-]{86,88}$` to `^ed25519:[A-Za-z0-9_-]{86}$`.

**Classification: `PSEUDO-MAJOR-EQUIVALENT-NULL`.** A schema-pattern
narrowing is, in the abstract, a strict-non-additive change — payloads
that previously validated may newly fail. In this concrete case the
v8.6.0 consumer-corpus audit returned **zero hits** for `{87,88}`-form
ed25519 signatures across every consumer repo on file at audit time.
No records are affected. The change is therefore released under a minor
bump (alongside the other additive v8.6.0 work) rather than a major
bump, with this MIGRATION entry providing the explicit decision trail.

| Property | Value |
|---|---|
| Classification | `PSEUDO-MAJOR-EQUIVALENT-NULL` |
| Affected schemas | `OrgRepresentativeDelegation`, `PanelVerdict`, `CrossScoreReport` |
| Pre-narrowing pattern | `^ed25519:[A-Za-z0-9_-]{86,88}$` |
| Post-narrowing pattern | `^ed25519:[A-Za-z0-9_-]{86}$` |
| Audit result | Zero hits for `{87,88}` forms across consumer corpus |
| Uniformity outcome | All five ed25519-bearing schemas in v8.6.0 (the three above plus v8.5.0 `SignatureEnvelope` and `RecallReceipt`) emit the same 86-char pattern |
| Negative-fixture coverage | +20 invalid fixtures asserting rejection of `{87,88}` forms (7 / 7 / 6 across the three schemas) |

**Why the audit gates the bump.** The constitutional rule is "narrowing
is breaking unless the narrowed-out range is provably empty in the wild."
The audit is the proof. If a future consumer surfaces a `{87,88}`-form
signature post-`v8.6.0`, treat it as a v9.0.0-class spec violation
(payloads that should have been rejected at the producer side per
RFC 4648 §5 unpadded base64url) — not a v8.6.x patch.

The audit artifact is committed at
[`docs/audits/fr-a5-ed25519-corpus-2026-05.md`](docs/audits/fr-a5-ed25519-corpus-2026-05.md):
method, command, per-repo results, and a reproducer block. The hash of
that file is the auditable evidence; the prose here references it.

**Consumers MUST consume only published GitHub Packages releases
during cycle-005.** The `main` branch is **unstable** — schema bytes
land ahead of the version-field bump (see "Intentional version-field
sequencing" below). A consumer that pins to a `main`-tracking ref
(git submodule, path dependency, branch tag) during cycle-005 will
ingest stricter validation under an unchanged `version: 8.5.2`
identifier, which silently rejects payloads a true v8.5.2 release
would accept. The supported consumption channels are: published
GitHub Packages releases (post-PR-A3.12), or the `pre-cycle-005`
SHA at `eae1a9e1` (the last cycle-005 hygiene-only commit). Any
other `main` ref between PR-A3.0 merge and the v8.6.0 ship PR is
work-in-progress and not safe for consumer ingestion.

**Intentional version-field sequencing — superseded by PR-A3.5 iter-4.**
The original cycle-005 plan held `CONTRACT_VERSION` at `8.5.2` across
all in-flight PRs before atomically bumping at the v8.6.0 ship PR.
That plan was reversed in PR-A3.5 iter-4 (2026-05-08) after a sustained
4-iteration multi-model peer-review consensus — 3-of-3 model coverage
on each iteration — escalated the resulting `$id`-vs-`contract_version`
drift from HIGH to BLOCKER. The library is not yet GitHub-Packages-
published this cycle (last shipped tag is v8.5.2; cycle-005 publishes
post-PR-A3.12), but the reviewer argument that an `$id` URL claiming
`/8.5.2/` while serving a body with `contract_version: '8.6.0'` is a
cache-poisoning vector even within unpublished `main` was accepted as
outweighing the churn-concentration argument.

**Effective from PR-A3.5 iter-4:** `CONTRACT_VERSION` is `8.6.0`. The
URL `$id`, the `$comment` trailer, the `schemas/index.json` `version`
field, the `vectors/VERSION` file, and `package.json` `version` all
agree at `8.6.0`. PRs A3.6..A3.12 land additive schema content under
this stable contract-version anchor. The GitHub Packages publish
step still gates on PR-A3.12 ship; the version-field bump is now
decoupled from the publish gate.

**Consumer action.** Same as the original sequencing plan — consume
only published GitHub Packages releases. The `main` branch between
PR-A3.5 iter-4 (commit `c28199fc`) and the cycle-005 ship is still
unstable, but the metadata-consistency window is closed: any
intermediate consumer (non-recommended, but safe-by-version-field)
sees `8.6.0` everywhere.

**Pre-iter-4 historical note.** Between PR-A3.0 and PR-A3.5 iter-3
(commits `eae1a9e1` through `02393bc1`), `main` carried schema
bodies declaring `contract_version: '8.6.0'` while `$id` URLs and
`schemas/index.json#/version` reported `8.5.2`. Any consumer that
pinned a `main`-tracking ref in that window observed the
inconsistency the multi-model review consensus identified; PR-A3.5 iter-4
reconciles every surface to `8.6.0`.

**Consumer action: none.** Producers already emitting unpadded
base64url ed25519 signatures (the spec-correct form) continue to
validate. Producers emitting `{87}` or `{88}` padded forms — observed
nowhere as of the audit — would need to switch to unpadded encoding;
this is the canonical RFC 4648 §5 form for ed25519 as used elsewhere
in the surface.

**Forward pointer — `ed25519-pub` follow-up.** The same impossibility
argument that gates this signature narrowing also applies to the
`signed_by` field's `ed25519-pub` pattern. By RFC 4648 §5 math, ed25519
public keys (32 bytes) encode to exactly 43 unpadded base64url
characters (`ceil(32 * 8 / 6) = 43`, no remainder, no `=` padding). The
present `^ed25519-pub:[A-Za-z0-9_-]{43,44}$` pattern admits a `{44}`
form that is mathematically unreachable for any spec-conformant
producer. A follow-up FR in v8.7.0 would narrow this under the same
`PSEUDO-MAJOR-EQUIVALENT-NULL` framework — same proof class
(RFC-mandated byte-length), same artifact requirements, same audit
template. FR-A5 was deliberately scoped to the `signature` field only
to avoid bundling a second narrowing into a precedent-setting first
invocation; the framework now enables the public-key narrowing as a
clean follow-up.

**Forward pointer to v9.0.0.** If at any point during the v8.6.x line a
consumer surfaces a real `{87,88}` payload, it is captured as a
`pollution event` against this audit and FR-A5 is rolled back to the
`^ed25519:[A-Za-z0-9_-]{86,88}$` form (regex quantifier — accepts 86,
87, and 88 characters) for v8.7.x with a v9.0.0 re-tightening tracked.
As of v8.6.0 GA, this rollback path is **not active**.

### FR-B9 + FR-B10 + FR-C4 — Plan-governance trio (PR-A3.6)

v8.6.0 adds three plan-governance primitives:

| Surface | Module | $id | Bearing flags |
|---|---|---|---|
| `PlanSignoffEnvelopeSchema` (FR-B9) | `governance/plan-signoff-envelope.ts` | `PlanSignoffEnvelope` | `x-crypto-bearing`, `x-chain-bearing` |
| `PlanAmendmentRequestSchema` (FR-B10) | `governance/plan-amendment-request.ts` | `PlanAmendmentRequest` | `x-chain-bearing` |
| `plan_content_hash_unchanged_since_signoff` (FR-C4) | `constraints/builtins/plan-content-hash-unchanged-since-signoff.ts` | (builtin) | n/a |

**`PlanSignoffEnvelopeSchema`** binds a plan (`plan_content_hash`) to a
signing actor at a specific tier. The schema's `tier` enum is
deliberately restricted to `{T2, T3}` — T0/T1 cannot signoff and are
rejected at the structural layer. The `signoff_actor_class` enum is
exhaustive at three members (`single_operator`, `jury_panel`,
`delegate`); v1 acceptance accepting only `single_operator` is a
**consumer-side gate per ADR-010**, NOT a schema-level constraint.

`ttl_seconds_at_emit` is **string-encoded** (CT-03; pattern
`^[1-9][0-9]*$`) following the cycle-005 convention for fields that
may exceed `Number.MAX_SAFE_INTEGER`. The literal `"0"` is reserved
as the expired-on-emit sentinel and is rejected at the schema layer.
The `2^53-1` upper bound is enforced **consumer-side per AT-8**: JSON
Schema's numeric `maximum` cannot apply to a string-encoded field.
Consumers parse via `BigInt(envelope.ttl_seconds_at_emit)` after
validation; the regex guarantees the parse without try/catch.

**`PlanAmendmentRequestSchema`** is intentionally **NOT crypto-bearing**
— amendments inherit the cluster's existing trust context and need
not carry an additional signature beyond chain-level integrity. The
schema admits the looser `(severity, trigger_class)` combinations
(e.g. `severity: 'minor' + trigger_class: 'observed_failure'`) so
**consumer-side severity-correction policy** can surface the
discrepancy explicitly rather than have the rewrite happen silently
at the structural layer (`prd.md:289`). `recommended_paths` is
non-empty (`minItems: 1`) — "do nothing" is expressed explicitly as a
path entry, not an empty array.

**`plan_content_hash_unchanged_since_signoff` (FR-C4)** cross-checks
the validating record's `plan_content_hash` against a consumer-supplied
signoff ledger snapshot. The builtin returns three states:

| State | Trigger | Manifest entry |
|---|---|---|
| `pass` | hash present in snapshot | `SIGNOFF_TTL_OBSERVED` (NA-3) |
| `fail` | hash absent from snapshot | `SIGNOFF_PLAN_HASH_MISMATCH` |
| `deferred` | snapshot not supplied | `LEDGER_CONTEXT_DEFERRED` |

**The `SIGNOFF_TTL_OBSERVED` payload (NA-3 / RC2 SKP-006).** On the
PASS path, the manifest entry surfaces the matched signoff's
`ts_emit`, the parsed `ttl_seconds_at_emit`, AND the absolute
`ttl_until_ms` epoch milliseconds (computed as
`Date.parse(ts_emit) + Number(ttl_seconds_at_emit) * 1000`). This
makes signoff-expiry evaluation a **deliberate next step** rather
than an easy oversight: a consumer that validates plan-hash without
also reading the TTL inputs cannot accidentally authorize a signoff
whose TTL has already lapsed.

**TTL enforcement is OUT.** Per ADR-010 / NFR-8, hounfour does NOT
decide what "expired" means. The builtin reports the inputs; the
consumer compares `ttl_until_ms` against `ledger_snapshot.ts_snapshot`
(preferred for replay) or wall-clock per their policy.

```typescript
import { evaluatePlanContentHashUnchangedSinceSignoff } from '@0xhoneyjar/loa-hounfour/constraints';
import type { PlanSignoffLedgerSnapshot } from '@0xhoneyjar/loa-hounfour/constraints';

const snapshot: PlanSignoffLedgerSnapshot = {
  ts_snapshot: '2026-05-09T12:30:00Z',
  signoffs: [
    {
      signoff_id: 'signoff-001',
      plan_content_hash: 'sha256:aaaa...',
      ttl_seconds_at_emit: 3600n,  // parsed BigInt; consumer parses from envelope's string
      ts_emit: '2026-05-09T12:00:00Z',
    },
  ],
};

const result = evaluatePlanContentHashUnchangedSinceSignoff(
  envelope.plan_content_hash,
  snapshot,
);

if (result.result === 'pass') {
  // Consult result.manifestEntry.evaluation_note for the parsed
  // ttl_until_ms. The library does NOT decide expiry — apply your
  // policy here:
  //   const expired = ttl_until_ms < Date.parse(snapshot.ts_snapshot);
}
```

**DSL surface.** Constraint files invoke the builtin via the DSL:

```text
plan_content_hash_unchanged_since_signoff(plan_content_hash)
```

The DSL collapses the three-state result to boolean: `pass` and
`deferred` map to `true`; only `fail` maps to `false` (vacuous-pass-
with-deferral matches FR-C1/C2/C3 conventions per AT-6). Direct
callers wanting the structured manifest entry use the standalone
evaluator.

**Type-surface compatibility (TypeScript consumers).** PR-A3.6 adds
three new members to the `UnverifiedObligationReason` union:
`'ledger_context_deferred'`, `'signoff_plan_hash_mismatch'`, and
`'signoff_ttl_observed'`. Same runtime-additive / type-strict-breaking
pattern as FR-A4 — exhaustive-switch consumers add cases before
bumping the dependency.

**Consumer action.** None for v8.5.x → v8.6.0 in itself; `validate()`
on the new schemas works without the signoff ledger (manifest emits
`LEDGER_CONTEXT_DEFERRED` and validation succeeds). Production code
authorizing plan execution from a `PlanSignoffEnvelope` SHOULD supply
`options.plan_signoff_ledger` and gate authorization on
`result.unverified_obligations.unverified_rules.find(r => r.reason
=== 'signoff_ttl_observed')` so the consumer's policy code observes
the TTL inputs at the same call site that observes the hash match.

---

## v8.4.0 → v8.5.0 (Minor — Additive Only)

**No breaking changes.** v8.5.0 adds 15 net-new TypeBox schemas (recall machinery + forget/commit/estate + assertion family), 2 new substrate-agnostic discriminator members on `ClaimGrounding`, manifest contract widening (strict-additive), and the `safeCanonicalize` helper. Existing v8.4.0 code continues to work unchanged. Consumers adopt the new surface by adding imports.

### New schemas — recall machinery (governance module)

```typescript
import {
  ReceiptDetailLevelSchema,            // 'minimal' | 'standard' | 'debug'
  SurfaceContextSchema,                // 5-member core + 3-segment namespace
  RecallRequestSchema,                 // input record
  RecallPackSchema,                    // integrity-bearing output container
  RecallReceiptSchema,                 // crypto-bearing signed acknowledgment
} from '@0xhoneyjar/loa-hounfour/governance';

import type {
  ReceiptDetailLevel,
  SurfaceContext,
  RecallRequest,
  RecallPack,
  RecallReceipt,
} from '@0xhoneyjar/loa-hounfour/governance';
```

### New schemas — forget / commit / estate (governance module)

```typescript
import {
  ForgetRecordSchema,                  // 4-variant discriminated union
  CommitmentTypeSchema,                // 4-member anchor-category enum
  CommitmentRootSchema,                // crypto + integrity-bearing
  AgentEstateStatusSchema,             // 5-member lifecycle enum
  AgentEstateSchema,                   // estate-as-container primitive
} from '@0xhoneyjar/loa-hounfour/governance';

import type {
  ForgetRecord,
  CommitmentType,
  CommitmentRoot,
  AgentEstateStatus,
  AgentEstate,
} from '@0xhoneyjar/loa-hounfour/governance';
```

### New schemas — assertion family (governance module)

```typescript
import {
  PrivacyScopeSchema,                  // 4-member privacy classification
  RiskLevelSchema,                     // 4-member ordinal risk classification
  AssertionStatusSchema,               // 8-member lifecycle enum
  AssertionClassSchema,                // 7-member core + 3-segment namespace
  AssertionSchema,                     // 8-variant status-discriminated union
} from '@0xhoneyjar/loa-hounfour/governance';

import type {
  PrivacyScope,
  RiskLevel,
  AssertionStatus,
  AssertionClass,
  Assertion,
} from '@0xhoneyjar/loa-hounfour/governance';
```

### Authority cascade Layer 2 + 3 schemas (PR-A2.2 — also new in v8.5.0)

```typescript
import {
  KeyringSchema,                       // Layer 2 keyring container
  SignerEntrySchema,                   // Per-signer record
  SignerCompetenceRuleSchema,          // Layer 3 rule
  SignerCompetenceResultSchema,        // Layer 3 evaluation outcome
  SignatureEnvelopeSchema,             // crypto-bearing signature wrapper
  SignerTypeSchema,
  SignatureTypeSchema,
  SignerStatusSchema,
  PolicyDecisionOutcomeSchema,
} from '@0xhoneyjar/loa-hounfour/governance';
```

### Behavioral compatibility matrix (per K1)

The most consequential v8.5.0 change is `validate()` default behavior on schemas flagged `'x-crypto-bearing': true` (G1 safe-by-default). Wrappers and generic validation utilities encountering crypto-bearing schemas MUST pass through `acceptDeferred: true` to receive shape-only validation; the default behavior fails closed with `CRYPTO_DEFERRED:`.

| Schema | x-crypto-bearing | x-integrity-bearing | Default `validate()` behavior | Consumer opt-in |
|---|---|---|---|---|
| `ReceiptDetailLevel` | — | — | `{ valid: true }` (literal-union) | n/a |
| `SurfaceContext` | — | — | `{ valid: true }` (literal-union) | n/a |
| `RecallRequest` | — | — | `{ valid: true }` (object) | n/a |
| `RecallPack` | — | ✓ | `{ valid: true }` (object); pass `{ acceptDeferred: true }` to surface `INTEGRITY_DEFERRED` manifest | `{ acceptDeferred: true }` |
| `RecallReceipt` | ✓ | — | `{ valid: false, errors: ['CRYPTO_DEFERRED: ...'] }` by default | `{ acceptDeferred: true }` |
| `ForgetRecord` | — | — | `{ valid: true }` per matched variant | n/a |
| `CommitmentType` | — | — | `{ valid: true }` (literal-union) | n/a |
| `CommitmentRoot` | ✓ | ✓ | `{ valid: false, errors: ['CRYPTO_DEFERRED: ...'] }` by default; opt-in surfaces `INTEGRITY_DEFERRED` manifest | `{ acceptDeferred: true }` |
| `AgentEstateStatus` | — | — | `{ valid: true }` (literal-union) | n/a |
| `AgentEstate` | — | — | `{ valid: true }` (object) | n/a |
| `PrivacyScope` | — | — | `{ valid: true }` (literal-union) | n/a |
| `RiskLevel` | — | — | `{ valid: true }` (literal-union) | n/a |
| `AssertionStatus` | — | — | `{ valid: true }` (literal-union) | n/a |
| `AssertionClass` | — | — | `{ valid: true }` (literal-union) | n/a |
| **`Assertion`** | **variant-aware (J3)** | — | `{ valid: true }` for `status: 'candidate'`; **`{ valid: false, errors: ['CRYPTO_DEFERRED: ...'] }` for `status: 'admitted' \| 'superseded' \| 'challenged' \| 'revoked' \| 'forgotten' \| 'escrow' \| 'archived'`** | `{ acceptDeferred: true }` for non-candidate variants |
| `Keyring` | — | — | `{ valid: true }` (object); KR-2 may emit warning | n/a |
| `SignerEntry` | — | — | `{ valid: true }` (object); SGE-1 may emit warning | n/a |
| `SignerCompetenceRule` | — | — | `{ valid: true }` (object) | n/a |
| `SignerCompetenceResult` | — | — | `{ valid: true }` (object) | n/a |
| `SignatureEnvelope` | ✓ | — | `{ valid: false, errors: ['CRYPTO_DEFERRED: ...'] }` by default | `{ acceptDeferred: true }` |

#### Wrong-pattern vs right-pattern (the K1 worked example)

```typescript
// WRONG — generic wrapper that treats shape-validity as crypto authority.
// Compiles fine; runtime returns valid:false on crypto-bearing schemas, so
// authorize() never fires — but the developer's MENTAL MODEL is broken.
function isStructurallyValid(schema, payload) {
  return validate(schema, payload).valid;
}

if (isStructurallyValid(SignatureEnvelopeSchema, payload)) {
  authorize();  // never fires — but developer expected it to
}

// RIGHT — explicit acceptDeferred + downstream verifier composition.
function isStructurallyValid(schema, payload) {
  return validate(schema, payload, { acceptDeferred: true }).valid;
}

const result = validate(SignatureEnvelopeSchema, payload, { acceptDeferred: true });
if (
  result.valid &&
  result.unverified_obligations?.unverified_rules.every(consumerVerifier)
) {
  authorize();
}
```

Generic wrappers that need to validate any schema (not knowing in advance whether it's crypto-bearing) MUST pass through `{ acceptDeferred: true }` AND check the manifest before treating success as "verified". The forced opt-in is the safety mechanism.

### Manifest contract changes (strict-additive)

`UnverifiedObligationsManifest.unverified_rules[].evaluator` widened from the literal `'runtime-deferred'` to `'runtime-deferred' | 'consumer' | 'library'`. An optional `reason?: 'context_absent' | 'crypto_deferred' | 'integrity_deferred' | 'pattern_matching' | 'vocabulary_drift'` field surfaces *why* the entry is present.

**v8.4.0 entries (`ORD-1`, `ORD-2`, `ORD-4`)** continue to emit `evaluator: 'runtime-deferred'` byte-identically — no consumer migration needed.

**New v8.5.0 entries** populate the new `'consumer'` value with explicit `reason`:

| Rule | Schema(s) | Evaluator | Reason | When emitted |
|---|---|---|---|---|
| `CRYPTO_DEFERRED` | crypto-bearing schemas | `consumer` | `crypto_deferred` | `acceptDeferred: true` opt-in on a crypto-bearing schema |
| `INTEGRITY_DEFERRED` | content-addressed schemas | `consumer` | `integrity_deferred` | `acceptDeferred: true` opt-in on an integrity-bearing schema (`RecallPack`, `CommitmentRoot`) |
| `ORD-3` | `OrgRepresentativeDelegation` | `consumer` | `context_absent` | `granted_by_chain_records` not supplied via `options.chainContext` |
| `ORD-3` | `OrgRepresentativeDelegation` | `consumer` | `pattern_matching` | `granted_by_chain_records` supplied — library still defers DAG evaluation to `npm run check:constraints` |
| `ORD-5` | `OrgRepresentativeDelegation` | `library` | `vocabulary_drift` | `capability_scope` key outside the canonical vocabulary (warn-mode in v8.5.0; v8.6.0 escalates to error) |

**Migration guidance**: prefer pattern-matching by `rule_id` (stable across versions) and `reason` (controlled vocabulary) rather than by `evaluator` literal. Consumers that need "any deferred obligation" should match the `reason` vocabulary; consumers that need rule-specific behavior should match `rule_id`.

```typescript
// v8.4.0 pattern (still works in v8.5.0):
const isDeferred = entry.evaluator === 'runtime-deferred';

// Recommended v8.5.0 pattern (explicit + future-proof):
const isDeferred = entry.evaluator !== 'library' || entry.reason !== undefined;
```

### Variant-aware Assertion validation (J3)

`AssertionSchema` is an 8-variant discriminated union over `status`. The `candidate` variant is shape-only (no `signatures[]`); the other 7 variants carry `signatures: Array(SignatureEnvelope, { minItems: 1 })` and ARE crypto-bearing. `validate()` walks `Type.Union` variants at call time to determine the safe-by-default branch:

```typescript
import { validate } from '@0xhoneyjar/loa-hounfour';
import { AssertionSchema } from '@0xhoneyjar/loa-hounfour/governance';

// Candidate variant — shape-only, no acceptDeferred needed.
const candidateResult = validate(AssertionSchema, candidatePayload);
// candidateResult.valid === true; no manifest entry.

// Admitted variant — crypto-bearing, fails closed without acceptDeferred.
const admittedDefault = validate(AssertionSchema, admittedPayload);
// admittedDefault.valid === false; errors[0].startsWith('CRYPTO_DEFERRED:').

// Admitted variant with opt-in.
const admittedOptIn = validate(AssertionSchema, admittedPayload, { acceptDeferred: true });
// admittedOptIn.valid === true;
// admittedOptIn.unverified_obligations.schema_id === 'Assertion#status=admitted';
// admittedOptIn.unverified_obligations.unverified_rules[0].rule_id === 'CRYPTO_DEFERRED';
// admittedOptIn.unverified_obligations.unverified_rules[0].reason === 'crypto_deferred'.
```

The synthesized `schema_id` (`<UnionId>#<discriminator>=<value>`) form lets operators distinguish which lifecycle variant triggered the deferred branch — useful when assertions in `forgotten` or `revoked` state need to be audited differently from fresh `admitted` records.

### ORD-3 chain context

`validate(OrgRepresentativeDelegationSchema, payload)` now ALWAYS emits an `ORD-3` manifest entry (previously the rule resolved to vacuous-true silently when chain context was absent). Consumers reconciling the entry can branch on `reason`:

```typescript
const result = validate(OrgRepresentativeDelegationSchema, record, {
  chainContext: { granted_by_chain_records: ancestorRecords },  // optional
});

const ord3 = result.unverified_obligations?.unverified_rules.find((r) => r.rule_id === 'ORD-3');
if (ord3?.reason === 'context_absent') {
  // Consumer didn't supply chain context — assemble the chain and retry, or
  // perform the chain check consumer-side.
} else if (ord3?.reason === 'pattern_matching') {
  // Chain context supplied; the library accepted it but doesn't run is_valid_dag at
  // validate() time — run the chain check via npm run check:constraints or
  // consumer-side.
}
```

### `safeCanonicalize` is the recommended canonical-JSON-hash path

```typescript
import { safeCanonicalize } from '@0xhoneyjar/loa-hounfour';

const canonical = safeCanonicalize(payload);              // throws on >100KB
const canonical = safeCanonicalize(payload, { maxBytes: 256 * 1024 });  // explicit override
```

Lint `RULE-5` (in the structural lint) blocks direct `canonicalize` import in non-utility code so the wrapper is the single canonicalization site. Existing v8.4.0 hashing code that bypassed the helper continues to work; v8.5.0+ schemas should use `safeCanonicalize`.

### `ClaimGrounding` discriminator extension

Two new substrate-agnostic discriminator members ship strict-additively:

- `external_reference` — pair with optional `external_uri` (off-protocol reference: URL / DOI / chain-transaction id).
- `derived_inference` — pair with optional `inference_basis: string[]` (sibling `claim_id`s the inference draws from).

Existing v7.x consumers compile unchanged — the new members are additive on the discriminator union and the new fields are optional.

### Strict-additive guarantee

- `npm run semver:check` PASS on the v8.5.0 merge commit.
- All v8.4.0 schemas compile against v8.5.0 unchanged. Consumers adopt the new surface by adding imports; existing imports remain valid.
- The 4 EXTEND decisions (`AccessDecision`, `CapabilityScopedTrust`, `ClaimGrounding`, `OrgRepresentativeDelegation` constraint set) all add optional fields / additive members only.

### Forwarded items

- **TS6 chore deferred** to v8.5.1 single-purpose release (1-2 weeks post v8.5.0).
- **Challenge layer + cross-runner extension + ORD-3 fail-closed promotion + ed25519 pattern alignment + ORD-5 warn → error escalation** committed to v8.6.0 (immediate follow-on).

---

## v8.3.x → v8.4.0 (Minor — Additive Only)

**No breaking changes.** v8.4.0 adds 7 net-new TypeBox schemas, 1 new constraint builtin, 7 new constraint files, and the cross-runner parity contract. Existing code continues to work unchanged. Consumers adopt the new surface by adding imports.

### New deliberation schemas (governance module)

```typescript
import {
  PanelDecisionArtifactSchema,
  PanelVerdictSchema,
  DeliberationDissentSchema,
  CrossScoreReportSchema,
  // Inline sub-schemas exported alongside the parent records:
  ClaimSchema,
  ClaimGroundingSchema,
  JurorVerdictSchema,
  AsymmetricBlockerSignalSchema,
  PairwiseScoreSchema,
} from '@0xhoneyjar/loa-hounfour/governance';

import type {
  PanelDecisionArtifact,
  PanelVerdict,
  DeliberationDissent,
  CrossScoreReport,
} from '@0xhoneyjar/loa-hounfour/governance';
```

See `docs/architecture/panel-protocol.md` for the consumer-facing protocol overview, including the bucket↔verdict (PV-1) and asymmetric-blocker (PV-3) rules.

### New org-overseer schemas (governance module)

```typescript
import {
  OrgIdentitySchema,
  OrgRepresentativeDelegationSchema,
  SuccessionPolicySchema,
  ORG_DELEGATION_GENESIS_SENTINEL,        // = 'genesis:org-public-key'
} from '@0xhoneyjar/loa-hounfour/governance';

import type {
  OrgIdentity,
  OrgRepresentativeDelegation,
  SuccessionPolicy,
} from '@0xhoneyjar/loa-hounfour/governance';
```

See `docs/architecture/org-overseer.md` for the org-as-principal model, the chain-of-trust verification, and the asymmetric-ladder succession policy (SP-1, SP-2).

### New signing-context envelope (shared)

`SigningContextSchema` is the audience/scope/contract_version envelope bound under signature on `PanelVerdict`, `CrossScoreReport`, and `OrgRepresentativeDelegation`. Reuse it directly when building consumer-side records that adopt the same replay-protection pattern.

```typescript
import { SigningContextSchema } from '@0xhoneyjar/loa-hounfour/governance';
import type { SigningContext } from '@0xhoneyjar/loa-hounfour/governance';

const sigCtx: SigningContext = {
  audience: '<your-org-id-or-service-principal>',
  scope: 'panel-v1/security-review',
  contract_version: '8.4.0',
};
```

### New constraint builtin: `is_valid_dag`

The `is_valid_dag(items, id_field, ...ref_fields)` builtin lands in the constraint DSL surface. The structured-diagnostic API (separate from the boolean DSL surface) is exported for consumers building custom validators:

```typescript
import {
  evaluateIsValidDag,
  extractPath,
  IS_VALID_DAG_OP_CAP,
  IS_VALID_DAG_ITEMS_CAP,
  IS_VALID_DAG_BYTES_CAP,
} from '@0xhoneyjar/loa-hounfour/constraints';

import type {
  IsValidDagResult,
  IsValidDagDiagnostic,
  IsValidDagErrorCode,
  IsValidDagPhase,
} from '@0xhoneyjar/loa-hounfour/constraints';

const result = evaluateIsValidDag(claimsArray, 'claim_id', ['grounding.claim_id']);
if (!result.valid) {
  // result.diagnostic is the cross-runner-stable ErrorEnvelope
  console.error(result.diagnostic.code, result.diagnostic.path, result.diagnostic.context);
}
```

Reference algorithm and op-counting rules are pinned in `docs/architecture/parity-protocol.md` §4.1; structured diagnostic shapes are in `docs/architecture/error-codes.md` §4.1.

### Consumer obligation: chain-context for ORD-3

The library validator picks up `granted_by_chain_records` from the validation context — **not** from the `OrgRepresentativeDelegation` record itself. Consumers integrating the org-overseer set MUST construct a context object that supplies the chain plus a synthetic genesis terminator:

```typescript
const validationContext = {
  ...orgRepresentativeDelegationFields,
  granted_by_chain_records: [
    /* the record under validation */,
    /* every ancestor back to and including the genesis-rooted record */,
    { delegation_id: 'genesis:org-public-key' },  // synthetic terminator
  ],
};
```

When the chain context is omitted, ORD-3 evaluates to vacuous-true (open-fail). Consumers SHOULD treat absence as a configuration error in their integration test suite. See `docs/architecture/org-overseer.md` §2 for the complete walk-through.

### Consumer obligations: the `UnverifiedObligationsManifest`

The library's `validate(...)` return shape is extended additively with an optional `unverified_obligations` field. When the validated record carries runtime-deferred constraint rules (signature verification, revocation append-only, asserted-vs-traversed-depth reconciliation), the manifest names them so the consumer cannot silently miss the obligation:

```typescript
const result = validate(OrgRepresentativeDelegationSchema, record);
if (result.valid && result.unverified_obligations) {
  for (const obligation of result.unverified_obligations.unverified_rules) {
    // obligation.rule_id ∈ { 'ORD-1', 'ORD-2', 'ORD-4' }
    // Dispatch to the consumer's verifier for each named rule.
  }
}
```

`unverified_obligations` is **omitted** from the result when no runtime-deferred rules apply — pre-v8.4.0 consumers see byte-identical JSON output for any schema without runtime-deferred rules.

### Cross-runner error taxonomy

The closed `ErrorCode` enumeration plus per-code `context` shapes are published in `docs/architecture/error-codes.md`. Cross-runner sweeps gate on `code` + `path` + `context` equality (`message` is locale-affordant). Consumer-side verifiers SHOULD emit envelopes from the unified taxonomy so cross-runner comparison surfaces include the consumer's verification stream.

### Trust-degradation event (dual-emit window)

For consumers running a `TrustDegradationEvent`-equivalent during the v8.4.0 → v8.5.0 window, the dual-emit envelope SHOULD be carried under the existing `AuditTrailEntrySchema` shape with `event_type: 'trust-degradation-v8-4-shim'`. The shim retires when v8.5.0 publishes the dedicated schema. Consumers that do not run this event flow are unaffected.

### Threat model: ORD-3 open-fail when chain context is omitted

ORD-3 (delegation chain validity, library-evaluated via `is_valid_dag`) requires the consumer to supply `granted_by_chain_records` in the validation context. When the field is omitted, ORD-3 evaluates to vacuous-true: the library returns `valid: true` and the chain-of-trust check is silently bypassed.

**At-risk integrations.** Any consumer that calls `validate(OrgRepresentativeDelegationSchema, record)` without first assembling the chain context. The structural floor — `granted_by` literal-or-UUID union, `chain_depth` ≤ 20 — still holds, but the chain itself is not verified.

**Compensating controls expected of every consumer.**

1. **Wrap the validator.** Construct a `validateWithChainContext(record, log)` helper that pulls every ancestor of `record` from the consumer's append-only delegation log, plus the synthetic `{ delegation_id: 'genesis:org-public-key' }` terminator, and calls `validate(...)` with the assembled context. Reject the record when the chain cannot be assembled (missing ancestors, broken edges, or zero records returned from the log lookup).
2. **Type-narrow the surface.** In TypeScript, expose only the wrapper from your integration module; do not re-export the bare `validate(OrgRepresentativeDelegationSchema, ...)` form. This makes the bare-call class of bug structurally unrepresentable.
3. **Audit fixture.** Add an integration test that calls `validate(...)` without the chain context and asserts `valid === true` — confirming the open-fail behavior is what the library does — paired with a wrapper test that calls `validateWithChainContext(...)` without an assembled chain and asserts the wrapper rejects. Together these tests fail-loudly if a future library upgrade changes the open-fail surface or if the wrapper regresses.

**Planned promotion (v8.5.0+).** The library may surface ORD-3 in `UnverifiedObligationsManifest` when `granted_by_chain_records` is absent at validate time, mirroring how ORD-1, ORD-2, and ORD-4 surface today. The promotion is additive and does not require a MAJOR bump. Consumers that have already implemented the wrapper see no behavior change; consumers that have not implemented the wrapper gain a visible signal that the chain check was skipped. Tracking issue lands with the v8.5.0 sprint.

### Threat model: PV-3 BLOCKER-without-signal

`PanelVerdict` PV-3 enforces consistency *when* `asymmetric_blocker_signal` is present. It does not require the signal to be present when `bucket == 'BLOCKER'`. A verdict with `bucket: 'BLOCKER'`, `verdict: 'reject'`, and no signal is currently `valid: true` at the library boundary.

**At-risk integrations.** Any consumer that treats `validate(...)` returning `valid: true` as authoritative on the BLOCKER path without a workflow gate.

**Compensating control.** Wrap `validate(PanelVerdictSchema, ...)` in a consumer-side helper that asserts:

```typescript
verdict.bucket !== 'BLOCKER' || verdict.asymmetric_blocker_signal != null
```

Reject any verdict that fails this conjunction.

**Planned promotion (v8.5.0+).** A structural rule (call it PV-5) may codify the conjunction in the constraint file. The promotion is additive (no MAJOR bump). Consumer-side wrappers continue to work; consumers without the wrapper gain library-side enforcement.

### What does **not** change

- No required-field additions to any pre-v8.4.0 schema.
- No type changes to any pre-v8.4.0 field.
- No removed exports.
- `MIN_SUPPORTED_VERSION` unchanged at `6.0.0`.
- All v8.3.x consumer code paths continue to work.

### Recommended adoption sequence

1. Update `package.json` to `"@0xhoneyjar/loa-hounfour": "^8.4.0"`.
2. Add imports for whichever new schemas the consumer integrates (deliberation set and/or org-overseer set).
3. Wire the consumer's verifier to read `result.unverified_obligations` and dispatch to runtime-deferred rule handlers as named.
4. If integrating the org-overseer set, ensure ORD-3 validation contexts include the chain plus the synthetic genesis terminator.
5. Co-sign the parity-protocol handoff (`docs/architecture/parity-protocol.handoff.json`) per `docs/architecture/parity-protocol.md` §7.

---

## v8.2.0 → v8.3.0 (Minor — Additive Only)

**No breaking changes.** All additions are new exports and schemas. Existing code continues to work unchanged.

### New utility functions

```typescript
import {
  dampNext,
  chainBoundHash,
  validateAuditTimestamp,
  advisoryLockHash,
} from '@0xhoneyjar/loa-hounfour/commons';

// Feedback dampening with cold-start prior
const smoothed = dampNext(rawScore, { alpha: 0.3, minSamples: 5 }, history);

// Chain-bound hash for audit trail integrity
const digest = chainBoundHash('audit.entry', payload, previousHash);

// Strict ISO 8601 timestamp validation
const result = validateAuditTimestamp(timestamp, { maxDriftMs: 5000 });

// Advisory lock ID from string key
const lockId = advisoryLockHash('resource:agent-007');
```

### X402 Payment schemas

```typescript
import {
  X402QuoteSchema,
  X402PaymentProofSchema,
  X402SettlementSchema,
} from '@0xhoneyjar/loa-hounfour/economy';
```

### ConsumerContract (integrity module)

```typescript
import {
  ConsumerContractSchema,
  validateConsumerContract,
  computeContractChecksum,
} from '@0xhoneyjar/loa-hounfour/integrity';

// Validate consumer's declared imports against actual exports
const result = validateConsumerContract(contract, exportMap);

// Compute content-addressable checksum for drift detection
const checksum = computeContractChecksum(contract);
```

### GovernedResource runtime (commons module)

```typescript
import {
  GovernedResourceBase,
  TransitionResultSchema,
  InvariantResultSchema,
  MutationContextSchema,
} from '@0xhoneyjar/loa-hounfour/commons';
import type { GovernedResource, MutationContext } from '@0xhoneyjar/loa-hounfour/commons';

// Extend GovernedResourceBase for custom resources
class MyResource extends GovernedResourceBase<MyState, MyEvent, 'balance_positive'> {
  protected applyEvent(state: MyState, event: MyEvent): MyState { /* ... */ }
  protected defineInvariants() {
    return new Map([['balance_positive', (s: MyState) => ({ invariant_id: 'balance_positive', holds: s.balance >= 0 })]]);
  }
}
```

### New DenialCode values

```typescript
// 3 new codes added to DenialCodeSchema union:
// - 'BUDGET_PERIOD_EXPIRED'
// - 'TIER_REPUTATION_MISMATCH'
// - 'BUDGET_SCOPE_MISMATCH'
```

### Conditional constraints

```typescript
import {
  resolveConditionalExpression,
} from '@0xhoneyjar/loa-hounfour/constraints';
import type { ConstraintCondition } from '@0xhoneyjar/loa-hounfour/constraints';
```

### New schemas (10 added)

| Schema | Module | Purpose |
|--------|--------|---------|
| `X402Quote` | `economy` | Machine-readable price quote |
| `X402PaymentProof` | `economy` | Payment proof with tx hash |
| `X402SettlementStatus` | `economy` | Settlement lifecycle status |
| `X402Settlement` | `economy` | Full settlement record |
| `X402ErrorCode` | `economy` | Payment error taxonomy |
| `ConsumerContract` | `integrity` | Consumer-declared import contract |
| `ConsumerContractEntrypoint` | `integrity` | Per-entrypoint symbol list |
| `TransitionResult` | `commons` | State transition outcome |
| `InvariantResult` | `commons` | Invariant verification result |
| `MutationContext` | `commons` | Actor context for mutations |

### Consumer migration paths

#### loa-finn

1. Update `@0xhoneyjar/loa-hounfour` to `^8.3.0`
2. Use `dampNext()` for reputation signal smoothing
3. Use `chainBoundHash()` for audit trail integrity
4. Optionally adopt `ConsumerContract` for import verification
5. Handle 3 new `DenialCode` values in economic boundary evaluation

#### loa-dixie

1. Update `@0xhoneyjar/loa-hounfour` to `^8.3.0`
2. Use `validateAuditTimestamp()` for evaluation timestamp validation
3. Use `advisoryLockHash()` for concurrent evaluation locking
4. Optionally extend `GovernedResourceBase` for governed evaluation resources

#### arrakis / freeside

1. Update `@0xhoneyjar/loa-hounfour` to `^8.3.0`
2. Implement X402 payment flow using `X402QuoteSchema` → `X402PaymentProofSchema` → `X402SettlementSchema`
3. Use `mapTierToReputationState()` for tier-based reputation initialization

---

## v7.11.0 → v8.2.0 (Breaking)

**Breaking changes:** Major version bump introduces `commons` module (v8.0.0). `GovernanceMutation.actor_id` becomes required (v8.1.0). `ModelPerformanceEvent` added as 4th `ReputationEvent` variant (v8.2.0).

### GovernanceMutation — `actor_id` (required in v8.1.0)

```typescript
// BEFORE (v7.11.0 / v8.0.0):
const mutation = {
  mutation_id: '550e8400-e29b-41d4-a716-446655440000',
  expected_version: 3,
  mutated_at: '2026-02-25T00:00:00Z',
  // actor_id was optional or absent
};

// AFTER (v8.1.0+) — actor_id required:
const mutation = {
  mutation_id: '550e8400-e29b-41d4-a716-446655440000',
  expected_version: 3,
  mutated_at: '2026-02-25T00:00:00Z',
  actor_id: 'agent-007',  // NEW — required, minLength: 1
};
```

### New `./commons` module (v8.0.0+)

```typescript
import {
  GovernedCreditsSchema,
  ConservationLawSchema,
  AuditTrailSchema,
  StateMachineConfigSchema,
  GovernanceMutationSchema,
  DynamicContractSchema,
  GovernanceErrorSchema,
} from '@0xhoneyjar/loa-hounfour/commons';
```

### New schemas (15 commons + 2 governance)

| Schema | Module | Version | Purpose |
|--------|--------|---------|---------|
| `Invariant` | `commons` | 8.0.0 | Conservation invariant definition |
| `ConservationLaw` | `commons` | 8.0.0 | Grouped invariants with enforcement level |
| `AuditEntry` | `commons` | 8.0.0 | Single audit trail entry with content hash |
| `AuditTrail` | `commons` | 8.0.0 | Hash-chained audit log |
| `State` | `commons` | 8.0.0 | State machine state |
| `Transition` | `commons` | 8.0.0 | State machine transition |
| `StateMachineConfig` | `commons` | 8.0.0 | Full state machine configuration |
| `GovernanceClass` | `commons` | 8.0.0 | Governance classification |
| `GovernanceMutation` | `commons` | 8.0.0 | Mutation envelope (actor_id required in 8.1.0) |
| `GovernedCredits` | `commons` | 8.0.0 | Governed credit balance resource |
| `GovernedReputation` | `commons` | 8.0.0 | Governed reputation resource |
| `GovernedFreshness` | `commons` | 8.0.0 | Governed freshness/TTL resource |
| `DynamicContract` | `commons` | 8.0.0 | Negotiable protocol surface contract |
| `ContractNegotiation` | `commons` | 8.0.0 | Contract negotiation state |
| `GovernanceError` | `commons` | 8.0.0 | 6-variant error discriminated union |
| `QualityObservation` | `governance` | 8.2.0 | Structured quality evaluation output |
| `ModelPerformanceEvent` | `governance` | 8.2.0 | 4th ReputationEvent variant |

### TaskType `unspecified` literal (v8.2.0)

```typescript
import type { TaskType } from '@0xhoneyjar/loa-hounfour/governance';

// New valid value — routes to aggregate-only scoring:
const taskType: TaskType = 'unspecified';
```

### ReputationEvent — 4th variant switch case (v8.2.0)

```typescript
import type { ReputationEvent } from '@0xhoneyjar/loa-hounfour/governance';

function handleEvent(event: ReputationEvent): void {
  switch (event.type) {
    case 'quality_signal':    /* ... */ break;
    case 'task_completion':   /* ... */ break;
    case 'peer_review':       /* ... */ break;
    case 'model_performance': /* ... */ break;  // NEW — v8.2.0
    default: {
      const _: never = event;
      throw new Error(`Unknown variant: ${(event as any).type}`);
    }
  }
}
```

### Consumer migration paths

#### loa-finn

1. Update `@0xhoneyjar/loa-hounfour` to `^8.2.0`
2. Add `actor_id` to all `GovernanceMutation` payloads (breaking in 8.1.0)
3. Handle `model_performance` variant in `ReputationEvent` routing
4. Optionally import governance enforcement utilities from `./commons`

#### loa-dixie

1. Update `@0xhoneyjar/loa-hounfour` to `^8.2.0`
2. Emit `ModelPerformanceEvent` for model quality observations
3. Handle `'unspecified'` TaskType — route to aggregate-only scoring
4. Use `QualityObservationSchema` for structured evaluation output

#### arrakis / freeside

1. Update `@0xhoneyjar/loa-hounfour` to `^8.2.0`
2. Validate `DynamicContract` and `ContractNegotiation` schemas at gateway
3. Wire `GovernedCredits` for commons-governed billing
4. Add `actor_id` to governance mutation calls

---

## v6.0.0 → v7.0.0 (Breaking)

**Breaking change:** `RegistryBridge` gains a required `transfer_protocol` field.

### RegistryBridge — `transfer_protocol` (required)

```typescript
// BEFORE (v6.0.0):
const bridge = {
  bridge_id: 'bridge-1',
  source_registry: 'registry-a',
  target_registry: 'registry-b',
  exchange_rate: { rate_type: 'fixed', rate_bps: 10000 },
  invariants: [],
  enforcement: 'strict',
  settlement_policy: { settlement_type: 'immediate' },
  contract_version: '6.0.0',
};

// AFTER (v7.0.0) — add transfer_protocol:
const bridge = {
  bridge_id: 'bridge-1',
  source_registry: 'registry-a',
  target_registry: 'registry-b',
  exchange_rate: { rate_type: 'fixed', rate_bps: 10000 },
  invariants: [],
  enforcement: 'strict',
  settlement_policy: { settlement_type: 'immediate' },
  transfer_protocol: { saga_type: 'atomic' }, // NEW — 'atomic' or 'choreography'
  contract_version: '7.0.0',
};
```

### New schemas (additive — no migration needed)

| Schema | Import Path | Purpose |
|--------|------------|---------|
| `BridgeTransferSaga` | `economy` or `composition` | Saga pattern for cross-registry transfers |
| `DelegationOutcome` | `governance` or `composition` | Conflict resolution with dissent recording |
| `MonetaryPolicy` | `economy` or `composition` | Minting-conservation coupling |
| `PermissionBoundary` | `governance` or `composition` | MAY permission semantics |
| `GovernanceProposal` | `governance` or `composition` | Weighted voting mechanism |

### New evaluator builtins (23 → 31)

| Builtin | Purpose |
|---------|---------|
| `saga_amount_conserved` | Validate saga step amounts balance |
| `saga_steps_sequential` | Validate unique step IDs |
| `saga_timeout_valid` | Validate step durations within limits |
| `outcome_consensus_valid` | Validate consensus outcome consistency |
| `monetary_policy_solvent` | Validate supply within ceiling |
| `permission_boundary_active` | Validate boundary completeness |
| `proposal_quorum_met` | Validate weighted vote quorum |
| `proposal_weights_normalized` | Validate weights sum to 1.0 |

---

## v5.4.0 → v6.0.0 (Breaking)

**Breaking change:** `AgentIdentity.trust_level` replaced by `trust_scopes`.

### trust_level → trust_scopes

```typescript
// BEFORE (v5.4.0):
const agent = {
  agent_id: 'agent-1',
  trust_level: 'trusted',
  // ...
};

// AFTER (v6.0.0) — replace with scoped trust:
const agent = {
  agent_id: 'agent-1',
  trust_scopes: {
    data_access: 'verified',
    financial: 'audited',
    delegation: 'verified',
    model_selection: 'provisional',
    governance: 'provisional',
    external_communication: 'restricted',
  },
  // ...
};
```

### Trust level mapping guide

| Old `trust_level` | Suggested `trust_scopes` default |
|-------------------|----------------------------------|
| `untrusted` | All scopes: `'restricted'` |
| `provisional` | All scopes: `'provisional'` |
| `trusted` | All scopes: `'verified'` |
| `audited` | All scopes: `'audited'` |

Refine per-scope after initial migration. Use helpers:
```typescript
import { trustLevelIndex, meetsThreshold } from '@0xhoneyjar/loa-hounfour/core';
```

---

## Version Support Matrix (Current)

| Property | Value |
|----------|-------|
| **Current Version** | 8.2.0 |
| **Minimum Supported** | 6.0.0 |

---

### Schema `additionalProperties` Policy

Every schema has an explicit policy for unknown properties. Strict schemas reject unknown fields — a v3.0.0 consumer with strict validation will reject v4.0.0 documents containing new fields.

#### Strict Schemas (`additionalProperties: false`)

| Schema `$id` | Rationale |
|--------------|-----------|
| `AgentDescriptor` | Security boundary — agent identity must not contain unvetted fields |
| `BillingEntry` | Financial data — strict validation prevents billing injection |
| `BillingRecipient` | Financial sub-document |
| `CreditNote` | Financial reversal |
| `Conversation` | Ownership data transferred with NFT |
| `ConversationSealingPolicy` | Encryption configuration |
| `Message` | Content record |
| `TransferSpec` | Ownership transfer initiation |
| `TransferEventRecord` | Transfer outcome record |
| `SagaContext` | Saga tracking |
| `LifecycleTransitionPayload` | Lifecycle event data |
| `Capability` | Agent capability descriptor |
| `CapabilityResponse` | Response to capability query |
| `ProtocolDiscovery` | Discovery document |
| `AccessPolicy` | Access control configuration |
| `PerformanceRecord` | Performance tracking (v4.1.0) |
| `ContributionRecord` | Contribution assessment (v4.1.0) |
| `Sanction` | Governance sanctions (v4.2.0) |
| `DisputeRecord` | Dispute tracking (v4.2.0) |
| `ValidatedOutcome` | Validated outcomes (v4.2.0) |
| `ReputationScore` | Reputation scoring (v4.3.0) |
| `EscrowEntry` | Escrow state machine (v4.4.0) |
| `StakePosition` | Stake positions (v4.4.0, experimental) |
| `CommonsDividend` | Commons dividends (v4.4.0, experimental) |
| `MutualCredit` | Mutual credit lines (v4.4.0, experimental) |

#### Extensible Schemas (`additionalProperties: true`)

| Schema `$id` | Rationale |
|--------------|-----------|
| `CapabilityQuery` | Query extensibility — future parameters without schema changes |
| `DomainEvent` | Envelope relaxation (v4.0.0) — allows consumer-defined extensions |
| `DomainEventBatch` | Envelope relaxation (v4.0.0) — allows consumer-defined extensions |
| `StreamStart` | Stream event extensibility |
| `StreamChunk` | Stream event extensibility |
| `StreamToolCall` | Stream event extensibility |
| `StreamUsage` | Stream event extensibility |
| `StreamEnd` | Stream event extensibility |
| `StreamError` | Stream event extensibility |

#### Union Types (no object properties)

`AgentLifecycleState`, `CostType`, `TransferScenario`, `TransferResult`, `MessageRole`, `ConversationStatus` — string literal unions with no `additionalProperties` concern.

### Consumer Patterns for Forward Compatibility

#### Pattern: Validate Then Strip Unknown Fields

```go
// Go: validate known fields, strip unknown
func validateAndStrip(data []byte, version string) (map[string]interface{}, error) {
    var raw map[string]interface{}
    json.Unmarshal(data, &raw)
    knownFields := getKnownFields(version)
    stripped := make(map[string]interface{})
    for k, v := range raw {
        if contains(knownFields, k) {
            stripped[k] = v
        }
    }
    return stripped, validate(stripped)
}
```

```python
# Python: Pydantic v2 with extra="ignore"
class DomainEventBatch(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Strip unknown fields
    batch_id: str
    correlation_id: str
    events: list[DomainEvent]
```

```typescript
// TypeScript: Value.Clean strips unknown properties before validation
import { Value } from '@sinclair/typebox/value';

function validateForward<T extends TSchema>(schema: T, data: unknown): Static<T> {
  const cleaned = Value.Clean(schema, structuredClone(data));
  const result = validate(schema, cleaned);
  if (!result.valid) throw new Error(result.errors.join(', '));
  return cleaned as Static<T>;
}
```

### `MIN_SUPPORTED_VERSION` and Wire Compatibility

- **Forward**: v3.0.0 consumer CAN validate v4.x data IF it strips unknown fields and handles signed MicroUSD
- **Backward**: v4.x consumer CAN always validate v3.0.0 data (no required fields removed)
- **Breaking**: v4.0.0 changed MicroUSD default to signed and relaxed envelope `additionalProperties`

### Migration Checklist for New Versions

1. **New optional fields on strict schemas**: Document here and in SCHEMA-CHANGELOG
2. **New schemas**: No compatibility impact
3. **New vocabulary entries**: No impact — `isKnownEventType()` returns false for unknown types by design
4. **Deprecation**: Mark `deprecated: true` in TypeBox; remove only at major version boundary
5. **Required field addition**: MAJOR version bump required

---

# Migration Guide: v5.0.0 → v5.1.0

**Contract version:** 5.1.0
**Min supported:** 5.0.0
**Breaking changes:** None — all changes are additive.

## Zero-Breaking Guarantee

v5.1.0 is a **minor** version bump. All existing v5.0.0 payloads validate
against v5.1.0 schemas without modification. No required fields were added;
all new fields are `Type.Optional`.

## New Schemas (6)

| Schema | Sub-Package | Description |
|--------|-------------|-------------|
| `ModelProviderSpec` | `model` | Provider registry with capabilities, pricing, conformance |
| `ConformanceLevel` | `model` | Trust vocabulary: `self_declared`, `community_verified`, `protocol_certified` |
| `ConformanceVector` | `model` | Golden test vectors for provider conformance |
| `SanctionSeverity` | `governance` | Graduated severity vocabulary with ladder |
| `ReconciliationMode` | `economy` | Pricing reconciliation mode: `protocol_authoritative`, `provider_invoice_authoritative` |
| `ProviderSummary` | `core` | Provider summary for discovery documents (embedded) |

## New Optional Fields

### BillingEntry
- `source_completion_id` — UUID linking to CompletionResult
- `pricing_snapshot` — Pricing rates used for computation
- `reconciliation_mode` — How pricing disputes are resolved
- `reconciliation_delta_micro` — Delta between computed and invoiced cost

### CompletionResult
- `pricing_applied` — Pricing rates actually applied

### Sanction
- `severity_level` — Graduated severity (excludes `terminated`)
- `duration_seconds` — Duration (0 = indefinite)
- `appeal_dispute_id` — UUID linking to DisputeRecord
- `escalated_from` — Predecessor sanction_id

### ProtocolDiscovery
- `providers` — Array of ProviderSummary
- `conformance_suite_version` — Conformance suite version

## New Utilities

| Function | Import | Description |
|----------|--------|-------------|
| `computeCostMicro(pricing, usage)` | `economy` | BigInt-safe pricing computation |
| `computeCostMicroSafe(pricing, usage)` | `economy` | Never-throw variant |
| `verifyPricingConservation(billing, usage)` | `economy` | Conservation audit |
| `matchConformanceOutput(expected, actual, rules)` | `model` | Conformance matching engine |
| `getSeverityEntry(severity)` | `governance` | Severity ladder lookup |
| `compareSeverity(a, b)` | `governance` | Severity comparison |

## ProviderType Exhaustive Switch (IMP-006)

v5.1.0 adds `'google'` to ProviderType. Update switch statements:

```typescript
switch (provider) {
  case 'openai': ...
  case 'anthropic': ...
  case 'google': ...    // NEW
  default: { const _: never = provider; throw new Error(`Unknown: ${_}`); }
}
```

## Pricing Convergence Adoption

```typescript
import { computeCostMicro, verifyPricingConservation } from '@0xhoneyjar/loa-hounfour/economy';

const cost = computeCostMicro(pricing, usage);
const check = verifyPricingConservation({ cost_micro: cost, pricing_snapshot: pricing }, usage);
// check.conserved === true, check.delta === '0'
```

## Safe-Fetch Policy (SKP-006)

Provider URLs in ModelProviderSpec must use HTTPS. Validate before fetching.

---

# Migration Guide: v4.6.0 → v5.0.0

## What's Breaking

### 1. Barrel Decomposition (Sub-Package Imports)

v5.0.0 introduces sub-package barrel exports. The root barrel (`@0xhoneyjar/loa-hounfour`) continues to export everything, but direct schema file imports may have moved.

**Before (v4.6.0) — direct schema imports:**

```typescript
// These paths still work via the root barrel
import { BillingEntrySchema } from '@0xhoneyjar/loa-hounfour';
```

**After (v5.0.0) — sub-package imports available:**

```typescript
// New sub-package imports (recommended for tree-shaking)
import { CompletionRequestSchema } from '@0xhoneyjar/loa-hounfour/model';
import { EscrowEntrySchema } from '@0xhoneyjar/loa-hounfour/economy';
import { SanctionSchema } from '@0xhoneyjar/loa-hounfour/governance';
import { AgentDescriptorSchema } from '@0xhoneyjar/loa-hounfour/core';
import { RoutingConstraintSchema } from '@0xhoneyjar/loa-hounfour/constraints';
```

### 2. Version Constants

```typescript
// Before
expect(CONTRACT_VERSION).toBe('4.6.0');

// After
expect(CONTRACT_VERSION).toBe('5.0.0');
```

### 3. New Metadata Namespace

The `billing.*` metadata namespace is now reserved. Consumers using `billing.` prefixed metadata keys in custom metadata should migrate to the `x-billing.` consumer namespace.

## What's Additive

### New Schemas (14 total)

#### ModelPort Schemas (6)

| Schema | Sub-Package Import | Description |
|--------|-------------------|-------------|
| `CompletionRequest` | `@0xhoneyjar/loa-hounfour/model` | Model completion request envelope |
| `CompletionResult` | `@0xhoneyjar/loa-hounfour/model` | Model completion result with usage/cost |
| `ModelCapabilities` | `@0xhoneyjar/loa-hounfour/model` | Model capability descriptor |
| `ProviderWireMessage` | `@0xhoneyjar/loa-hounfour/model` | Provider-agnostic message format |
| `ToolDefinition` | `@0xhoneyjar/loa-hounfour/model` | Tool definition for function calling |
| `ToolResult` | `@0xhoneyjar/loa-hounfour/model` | Tool execution result |

#### Ensemble Schemas (3)

| Schema | Sub-Package Import | Description |
|--------|-------------------|-------------|
| `EnsembleStrategy` | `@0xhoneyjar/loa-hounfour/model` | Strategy vocabulary (`first_complete`, `best_of_n`, `consensus`) |
| `EnsembleRequest` | `@0xhoneyjar/loa-hounfour/model` | Multi-model ensemble request |
| `EnsembleResult` | `@0xhoneyjar/loa-hounfour/model` | Multi-model ensemble result with cost aggregation |

#### Routing Schemas (5)

| Schema | Sub-Package Import | Description |
|--------|-------------------|-------------|
| `AgentRequirements` | `@0xhoneyjar/loa-hounfour/model` | Agent model requirement declaration |
| `BudgetScope` | `@0xhoneyjar/loa-hounfour/model` | Budget enforcement scope |
| `RoutingResolution` | `@0xhoneyjar/loa-hounfour/model` | Routing decision record |
| `ExecutionMode` | `@0xhoneyjar/loa-hounfour/model` | Execution mode vocabulary |
| `ProviderType` | `@0xhoneyjar/loa-hounfour/model` | Provider type vocabulary |

### Constraint Grammar

v5.0.0 introduces a constraint grammar for expressing schema invariants as JSON-serializable rules. Import from `@0xhoneyjar/loa-hounfour/constraints`.

### New Cross-Field Validators

| Schema | Validator | Description |
|--------|-----------|-------------|
| `CompletionRequest` | tools -> tool_choice | tools present requires tool_choice |
| `CompletionResult` | usage conservation | total_tokens = prompt + completion + reasoning |
| `CompletionResult` | finish_reason -> tool_calls | finish_reason=tool_calls requires non-empty tool_calls |
| `EnsembleRequest` | consensus -> threshold | strategy=consensus requires consensus_threshold |
| `EnsembleResult` | consensus -> score | strategy=consensus requires consensus_score |
| `EnsembleResult` | cost floor | total_cost_micro >= selected.usage.cost_micro |
| `BudgetScope` | overspend warning | warns when spent_micro > limit_micro |

### Billing Metadata Namespace

New `billing.*` metadata keys:

| Key | Type | Description |
|-----|------|-------------|
| `billing.entry_id` | string | Links event to BillingEntry |
| `billing.cost_micro` | string | Cost in micro-USD |
| `billing.reconciled` | boolean | Whether reconciled against ledger |
| `billing.provider` | string | Cost provider |

## Consumer Migration Paths

### loa-finn

1. Update import paths to use sub-package barrels for tree-shaking
2. Register new cross-field validators if using custom validation pipeline
3. Update `contract_version` in produced events to `'5.0.0'`

```typescript
// Before
import { BillingEntrySchema, validate } from '@0xhoneyjar/loa-hounfour';

// After (recommended)
import { validate } from '@0xhoneyjar/loa-hounfour';
import { CompletionRequestSchema } from '@0xhoneyjar/loa-hounfour/model';
import { BillingEntrySchema } from '@0xhoneyjar/loa-hounfour/economy';
```

### arrakis

1. Add ModelPort schema validation to the gateway layer
2. Wire ensemble routing through EnsembleRequest/EnsembleResult
3. Use BudgetScope for per-project cost enforcement

```typescript
import {
  CompletionRequestSchema,
  EnsembleRequestSchema,
  BudgetScopeSchema,
} from '@0xhoneyjar/loa-hounfour/model';
```

### mibera-freeside

1. Use RoutingConstraint + RoutingResolution for model selection
2. Wire reputation scores into ensemble candidate selection
3. Use billing.* metadata for cost attribution in commons dividends

```typescript
import { RoutingResolutionSchema } from '@0xhoneyjar/loa-hounfour/model';
import { ReputationScoreSchema } from '@0xhoneyjar/loa-hounfour/governance';
import { BILLING_METADATA_KEYS } from '@0xhoneyjar/loa-hounfour/model';
```

## Sub-Package Import Guide

| Sub-Package | Path | Contains |
|-------------|------|----------|
| `core` | `@0xhoneyjar/loa-hounfour/core` | Agent, Conversation, Transfer, JWT, Health, Discovery |
| `economy` | `@0xhoneyjar/loa-hounfour/economy` | Billing, Escrow, Stake, Credit, Dividend |
| `model` | `@0xhoneyjar/loa-hounfour/model` | Completion, Ensemble, Routing, ModelCapabilities, Metadata |
| `governance` | `@0xhoneyjar/loa-hounfour/governance` | Sanction, Dispute, Reputation, Performance |
| `constraints` | `@0xhoneyjar/loa-hounfour/constraints` | Constraint grammar, rule definitions |

---

# Migration Guide: v3.2.0 → v4.4.0

## Breaking Changes (v4.0.0)

### 1. Signed MicroUSD (Default)
- `MicroUSD` now allows negative values (pattern: `^-?[0-9]+$`)
- Use `MicroUSDUnsigned` for non-negative enforcement
- `MicroUSDSigned` is now an alias for `MicroUSD`

**Before (v3.2.0):**

```typescript
import { MicroUSD, MicroUSDSigned } from '@0xhoneyjar/loa-hounfour';

// MicroUSD was unsigned: ^[0-9]+$
// MicroUSDSigned was separate: ^-?[0-9]+$
```

**After (v4.0.0):**

```typescript
import { MicroUSD, MicroUSDUnsigned, MicroUSDSigned } from '@0xhoneyjar/loa-hounfour';

// MicroUSD is now signed: ^-?[0-9]+$
// MicroUSDUnsigned for non-negative only: ^[0-9]+$
// MicroUSDSigned is a deprecated alias for MicroUSD
```

**Migration**: Replace `MicroUSD` with `MicroUSDUnsigned` if your code must reject negative amounts.

### 2. Envelope Relaxation
- `DomainEventSchema` and `DomainEventBatchSchema` now allow `additionalProperties`
- All 6 `StreamEvent` sub-schemas allow `additionalProperties`:
  - `StreamStart`
  - `StreamChunk`
  - `StreamToolCall`
  - `StreamUsage`
  - `StreamEnd`
  - `StreamError`
- Existing strict consumers should strip unknown fields before validation

**Before (v3.2.0):**

```typescript
// DomainEventSchema had additionalProperties: false
// Unknown fields were rejected
```

**After (v4.0.0):**

```typescript
// DomainEventSchema has additionalProperties: true
// Unknown fields are preserved — strip before validation if needed
import { Value } from '@sinclair/typebox/value';
const cleaned = Value.Clean(DomainEventSchema, structuredClone(event));
```

### 3. New Aggregate Types
- 4 new aggregate types: `performance`, `governance`, `reputation`, `economy`
- Type guards:
  - `isPerformanceEvent()` — narrows to `PerformanceEvent`
  - `isGovernanceEvent()` — narrows to `GovernanceEvent`
  - `isReputationEvent()` — narrows to `ReputationEvent`
  - `isEconomyEvent()` — narrows to `EconomyEvent`

```typescript
import {
  isPerformanceEvent,
  isGovernanceEvent,
  isReputationEvent,
  isEconomyEvent,
  type DomainEvent,
} from '@0xhoneyjar/loa-hounfour';

function routeEvent(event: DomainEvent): void {
  if (isPerformanceEvent(event)) {
    // event.payload.performance_record_id is available
  } else if (isGovernanceEvent(event)) {
    // event.payload.governance_action_id is available
  } else if (isReputationEvent(event)) {
    // event.payload.agent_id is available
  } else if (isEconomyEvent(event)) {
    // event.payload.transaction_id is available
  }
}
```

### 4. Version Constants
- `CONTRACT_VERSION`: `'4.4.0'`
- `MIN_SUPPORTED_VERSION`: `'3.0.0'`

```typescript
// Before
expect(CONTRACT_VERSION).toBe('3.2.0');

// After
expect(CONTRACT_VERSION).toBe('4.4.0');
```

## Additive Changes (v4.1.0 – v4.4.0)

### v4.1.0: Performance Tracking

| Schema | Import | Description |
|--------|--------|-------------|
| `PerformanceRecord` | `PerformanceRecordSchema` | Agent performance metrics record |
| `ContributionRecord` | `ContributionRecordSchema` | Contribution assessment for peer review |

### v4.2.0: Governance

| Schema | Import | Description |
|--------|--------|-------------|
| `Sanction` | `SanctionSchema` | Governance sanction against an agent |
| `DisputeRecord` | `DisputeRecordSchema` | Dispute filed against agent or outcome |
| `ValidatedOutcome` | `ValidatedOutcomeSchema` | Validated governance outcome |

New vocabulary:
- **Sanctions vocabulary** (`vocabulary/sanctions`):
  - `SANCTION_SEVERITY_LEVELS`: `warning`, `rate_limited`, `pool_restricted`, `suspended`, `terminated`
  - `VIOLATION_TYPES`: `content_policy`, `rate_abuse`, `billing_fraud`, `identity_spoofing`, `resource_exhaustion`, `community_guideline`, `safety_violation`
  - `ESCALATION_RULES`: Severity progression per violation type
- **6 sanction lifecycle reason codes** (`vocabulary/lifecycle-reasons`):
  - `sanction_warning_issued`
  - `sanction_rate_limited`
  - `sanction_pool_restricted`
  - `sanction_suspended`
  - `sanction_terminated`
  - `sanction_appealed_successfully`

### v4.3.0: Reputation

| Schema | Import | Description |
|--------|--------|-------------|
| `ReputationScore` | `ReputationScoreSchema` | Agent reputation score with decay |

New vocabulary:
- **Reputation vocabulary** (`vocabulary/reputation`): reputation scoring constants and decay parameters
- **`BillingRecipient` role extended**: `agent_performer` and `commons` roles added

### v4.4.0: Economy

| Schema | Import | Description |
|--------|--------|-------------|
| `EscrowEntry` | `EscrowEntrySchema` | Escrow with state machine (created, funded, released, refunded, expired) |
| `StakePosition` | `StakePositionSchema` | Staking positions with vesting (experimental) |
| `CommonsDividend` | `CommonsDividendSchema` | Commons fund dividend distribution (experimental) |
| `MutualCredit` | `MutualCreditSchema` | Mutual credit lines between agents (experimental) |

New vocabulary:
- **Economic choreography vocabulary** (`vocabulary/economic-choreography`): escrow lifecycle, staking, dividend, and credit flow choreographies

## New Error Codes

| Code | HTTP | Version | Description |
|------|------|---------|-------------|
| `ROUTING_CONSTRAINT_VIOLATED` | 403 | v4.0.0 | Routing constraint violated |
| `SANCTION_ACTIVE` | 403 | v4.2.0 | Active sanction blocks operation |
| `SANCTION_APPEAL_DENIED` | 403 | v4.2.0 | Sanction appeal was denied |
| `DISPUTE_NOT_FOUND` | 404 | v4.2.0 | Referenced dispute does not exist |
| `DISPUTE_ALREADY_RESOLVED` | 409 | v4.2.0 | Dispute has already been resolved |
| `REPUTATION_INSUFFICIENT` | 403 | v4.3.0 | Agent reputation below required threshold |
| `ESCROW_NOT_FOUND` | 404 | v4.4.0 | Referenced escrow entry does not exist |
| `ESCROW_INVALID_STATE` | 409 | v4.4.0 | Escrow is in wrong state for operation |
| `STAKE_INSUFFICIENT` | 403 | v4.4.0 | Insufficient stake for operation |
| `CREDIT_LIMIT_EXCEEDED` | 402 | v4.4.0 | Mutual credit limit exceeded |
| `CREDIT_LINE_NOT_FOUND` | 404 | v4.4.0 | Referenced credit line does not exist |
| `DIVIDEND_NOT_DECLARED` | 400 | v4.4.0 | No dividend declared for distribution |

## New Event Types

### Performance Aggregate (v4.1.0)

| Event Type | Description |
|------------|-------------|
| `performance.record.created` | Performance record created |
| `performance.record.validated` | Performance record validated by peer |
| `contribution.submitted` | Contribution submitted for assessment |
| `contribution.assessed` | Contribution assessment completed |

### Governance Aggregate (v4.2.0)

| Event Type | Description |
|------------|-------------|
| `sanction.imposed` | Sanction imposed on agent |
| `sanction.appealed` | Sanction appeal submitted |
| `sanction.lifted` | Sanction lifted or expired |
| `dispute.filed` | Dispute filed against agent or outcome |
| `dispute.resolved` | Dispute resolution completed |
| `governance.vote.started` | Governance vote initiated |
| `governance.vote.concluded` | Governance vote concluded |

### Reputation Aggregate (v4.3.0)

| Event Type | Description |
|------------|-------------|
| `reputation.score.calculated` | Reputation score recalculated |
| `reputation.score.decayed` | Reputation score decayed over time |
| `reputation.threshold.breached` | Reputation dropped below threshold |

### Economy Aggregate (v4.4.0)

| Event Type | Description |
|------------|-------------|
| `economy.escrow.created` | Escrow entry created |
| `economy.escrow.funded` | Escrow entry funded |
| `economy.escrow.released` | Escrow funds released to payee |
| `economy.escrow.refunded` | Escrow funds refunded to payer |
| `economy.escrow.expired` | Escrow expired without release |
| `economy.stake.created` | Stake position created |
| `economy.stake.slashed` | Stake position slashed |
| `economy.stake.vested` | Stake vesting milestone reached |
| `economy.stake.withdrawn` | Stake position withdrawn |
| `economy.dividend.declared` | Commons dividend declared |
| `economy.dividend.distributed` | Commons dividend distributed |
| `economy.credit.extended` | Mutual credit line extended |
| `economy.credit.settled` | Mutual credit settled |

---

# Migration Guide: v2.4.0 → v3.0.0

## Breaking Changes

### 1. `previous_owner_access` removed from `ConversationSealingPolicy`

The deprecated `previous_owner_access` string field has been removed. Use `access_policy` instead.

**Before (v2.4.0):**

```typescript
const sealingPolicy = {
  encryption_scheme: 'aes-256-gcm',
  key_derivation: 'hkdf-sha256',
  key_reference: 'kref-001',
  access_audit: true,
  previous_owner_access: 'read_only_24h',
};
```

**After (v3.0.0):**

```typescript
import { validateSealingPolicy, validateAccessPolicy } from '@0xhoneyjar/loa-hounfour';

const sealingPolicy = {
  encryption_scheme: 'aes-256-gcm',
  key_derivation: 'hkdf-sha256',
  key_reference: 'kref-001',
  access_audit: true,
  access_policy: {
    type: 'time_limited',
    duration_hours: 24,
    audit_required: true,
    revocable: true,
  },
};
```

#### Migration mapping for `previous_owner_access` values

| v2.x `previous_owner_access` | v3.0.0 `access_policy.type` | Additional fields |
|-------------------------------|-----------------------------|--------------------|
| `"none"` | `"none"` | `audit_required: false, revocable: false` |
| `"read_only_24h"` | `"time_limited"` | `duration_hours: 24, audit_required: true, revocable: true` |
| `"read_only"` | `"read_only"` | `audit_required: true, revocable: true` |
| *(new in v3.0.0)* | `"role_based"` | `roles: ["auditor"], audit_required: true, revocable: false` |

> **Note:** `role_based` is new in v3.0.0 with no v2.x equivalent. It is available for consumers who need fine-grained access control based on organizational roles.

```go
// Go: migrate previous_owner_access to access_policy
func migrateAccessPolicy(old string) map[string]interface{} {
    switch old {
    case "none":
        return map[string]interface{}{
            "type": "none", "audit_required": false, "revocable": false,
        }
    case "read_only_24h":
        return map[string]interface{}{
            "type": "time_limited", "duration_hours": 24,
            "audit_required": true, "revocable": true,
        }
    case "read_only":
        return map[string]interface{}{
            "type": "read_only", "audit_required": true, "revocable": true,
        }
    default:
        return map[string]interface{}{
            "type": "none", "audit_required": false, "revocable": false,
        }
    }
}
```

```python
# Python: migrate previous_owner_access to access_policy
def migrate_access_policy(old: str) -> dict:
    mapping = {
        "none": {"type": "none", "audit_required": False, "revocable": False},
        "read_only_24h": {
            "type": "time_limited", "duration_hours": 24,
            "audit_required": True, "revocable": True,
        },
        "read_only": {"type": "read_only", "audit_required": True, "revocable": True},
    }
    return mapping.get(old, mapping["none"])
```

### 2. `MIN_SUPPORTED_VERSION` bumped to `2.4.0`

Consumers on v2.0.0–v2.3.0 will receive `CONTRACT_VERSION_MISMATCH` errors. All consumers must be at v2.4.0+ before deploying v3.0.0.

### 3. `CONTRACT_VERSION` bumped to `3.0.0`

```typescript
// Before
expect(CONTRACT_VERSION).toBe('2.4.0');

// After
expect(CONTRACT_VERSION).toBe('3.0.0');
```

## New Schemas

| Schema | Import | Description |
|--------|--------|-------------|
| `AccessPolicy` | `AccessPolicySchema` | Structured access control for sealed conversations |

## New Validators

| Function | Description |
|----------|-------------|
| `validateAccessPolicy(policy)` | Cross-field validation: `time_limited` requires `duration_hours`, `role_based` requires `roles` |

## Cross-Field Validation

`validateSealingPolicy()` now chains `validateAccessPolicy()` when `access_policy` is present. Always use `validateSealingPolicy()` — it validates both the sealing policy and any embedded access policy.

```typescript
import { validateSealingPolicy } from '@0xhoneyjar/loa-hounfour';

const result = validateSealingPolicy(policy);
if (!result.valid) {
  console.error(result.errors); // Includes access_policy validation errors
}
```

## Key Notes

- **`access_policy` is optional** — sealing policies without it are valid
- **`access_policy.type` determines required fields**:
  - `time_limited` → `duration_hours` required (1–8760)
  - `role_based` → `roles` required (non-empty array)
  - `none`, `read_only` → no additional required fields
- **Transfer vectors updated** — all golden vectors now use `access_policy` instead of `previous_owner_access`

---

# Migration Guide: v1.1.0 → v2.0.0

## Breaking Changes

### 1. `CostBreakdown` replaced by `BillingEntry`

The inline `CostBreakdown` type has been removed. Cost tracking is now handled by
the multi-party `BillingEntry` schema with recipient-level allocation.

**Before (v1.1.0):**

```typescript
import { type InvokeResponse, type CostBreakdown } from '@0xhoneyjar/loa-hounfour';

const response: InvokeResponse = {
  // ...
  cost: {
    input_cost_micro: '1500',
    output_cost_micro: '3000',
    total_cost_micro: '4500',
  },
};
```

**After (v2.0.0):**

```typescript
import {
  type InvokeResponse,
  type BillingEntry,
  allocateRecipients,
  deriveIdempotencyKey,
} from '@0xhoneyjar/loa-hounfour';

// Step 1: Create BillingEntry with multi-party recipients
const entry: BillingEntry = {
  id: ulid(),                     // Canonical billing entry identifier (ULID)
  trace_id: traceId,              // Distributed tracing correlation (separate concern)
  tenant_id: tenantId,
  cost_type: 'model_inference',
  provider: 'anthropic',
  model: 'claude-opus-4-6',
  pool_id: 'opus-main',
  currency: 'USD',
  precision: 6,
  raw_cost_micro: '4500',
  multiplier_bps: 25000,          // 2.5x markup (basis points)
  total_cost_micro: '11250',
  rounding_policy: 'largest_remainder',
  recipients: allocateRecipients([
    { address: '0xProvider', role: 'provider', share_bps: 4000 },
    { address: '0xPlatform', role: 'platform', share_bps: 6000 },
  ], '11250'),
  idempotency_key: deriveIdempotencyKey(/* ... */),
  timestamp: new Date().toISOString(),
  contract_version: '2.0.0',
  usage: response.usage,
};

// Step 2: Response references the entry by id
const response: InvokeResponse = {
  // ...
  billing_entry_id: entry.id,     // References BillingEntry.id (ULID)
};
```

### 2. `InvokeResponse.cost` → `InvokeResponse.billing_entry_id`

The `cost` field on `InvokeResponse` has been replaced with `billing_entry_id`,
a string reference to a `BillingEntry.id` (ULID).

```typescript
// Before
const total = response.cost.total_cost_micro;

// After
const billingId = response.billing_entry_id; // Look up BillingEntry separately
```

### 3. `UsageReport.cost` → `UsageReport.billing_entry_id`

Same change applies to `UsageReport`.

```typescript
// Before
const report: UsageReport = { /* ... */ cost: breakdown };

// After
const report: UsageReport = { /* ... */ billing_entry_id: entry.id };
```

### 4. `CONTRACT_VERSION` bumped to `'2.0.0'`

```typescript
// Before
expect(CONTRACT_VERSION).toBe('1.1.0');

// After
expect(CONTRACT_VERSION).toBe('2.0.0');
```

### 5. `MIN_SUPPORTED_VERSION` bumped to `'2.0.0'`

v1.x clients will receive `CONTRACT_VERSION_MISMATCH` errors.
Update all consumers before deploying v2.0.0.

## New Schemas

| Schema | Import | Description |
|--------|--------|-------------|
| `AgentDescriptor` | `AgentDescriptorSchema` | Canonical agent representation |
| `AgentLifecycleState` | `AgentLifecycleStateSchema` | 6-state lifecycle enum |
| `BillingEntry` | `BillingEntrySchema` | Multi-party billing with recipients |
| `CreditNote` | `CreditNoteSchema` | Billing reversal/refund |
| `Conversation` | `ConversationSchema` | NFT-owned conversation |
| `Message` | `MessageSchema` | Conversation message |
| `TransferSpec` | `TransferSpecSchema` | NFT ownership transfer spec |
| `TransferEventRecord` | `TransferEventSchema` | Transfer outcome record |
| `DomainEvent` | `DomainEventSchema` | Cross-cutting event envelope |

## New Utilities

| Function | Description |
|----------|-------------|
| `allocateRecipients(recipients, totalCostMicro)` | Deterministic largest-remainder allocation |
| `validateBillingRecipients(recipients, totalCostMicro)` | Validate recipient invariants |
| `parseNftId(id)` | Parse canonical NftId string |
| `formatNftId(chainId, collection, tokenId)` | Format canonical NftId with EIP-55 checksum |
| `checksumAddress(address)` | EIP-55 mixed-case checksum via Keccak-256 |
| `isValidTransition(from, to)` | Check agent lifecycle transition validity |
| `createTransitionValidator(transitions)` | Generic state machine factory |

## New Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent does not exist |
| `AGENT_NOT_ACTIVE` | 403 | Agent is not in ACTIVE state |
| `AGENT_TRANSFER_IN_PROGRESS` | 409 | Agent is currently being transferred |
| `CONVERSATION_SEALED` | 403 | Conversation is sealed (read-only) |
| `CONVERSATION_NOT_FOUND` | 404 | Conversation does not exist |
| `OWNERSHIP_MISMATCH` | 403 | Caller does not own the agent |
| `BILLING_RECIPIENTS_INVALID` | 400 | Recipient shares/amounts are invalid |

## Key Notes

- **`BillingEntry.id` is the canonical identifier** (ULID). `trace_id` is a separate
  field for distributed tracing correlation — do not conflate the two.
- **`allocateRecipients()` produces `amount_micro`** — callers provide `share_bps` only.
  Never manually compute `amount_micro`.
- **Zero total is valid**: `allocateRecipients(recipients, "0")` returns all recipients
  with `amount_micro: "0"`.
- **Tie-breaking is deterministic**: when two recipients have equal remainders, the one
  appearing first in the input array receives the extra micro-unit.
