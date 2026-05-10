/**
 * `ClusterRunSeriesSchema` — multi-repo run state envelope (FR-G1, v8.7.0).
 *
 * Captures per-repo EPIC status across a cluster-spanning workstream.
 * Per-repo `epic_status` (`'queued' | 'running' | 'completed' | 'failed'`) +
 * `failure_mode` classification per upstream master-plan §5.0.B is
 * enforceable at the schema level.
 *
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid `ClusterRunSeries` payload `s` returns a string equal
 * to `s` when `s` is the JSON form `JSON.stringify` produced from the
 * canonical-shaped object. This is a determinism pin on V8's stable
 * property-order behaviour, NOT a cross-runtime byte-identity claim.
 *
 * **Cross-runtime byte-identity** (Go / Python / Rust producers
 * agreeing with TS) is the FR-A2 cross-language harness's domain via
 * RFC 8785 JCS canonicalization. Producers MUST emit `ts_started` in
 * Z-only second-precision (`2026-05-09T00:00:00Z`) byte-identical
 * across runtimes — see `vectors/runners/_shared/ts-started-z-only.txt`
 * SSOT for the local override of the broader `ISO8601_UTC_PATTERN`.
 *
 * **NOT crypto-bearing, NOT chain-bearing**: a `ClusterRunSeries` is a
 * join-shape over per-repo phase envelopes. The chain-bearing
 * primitives are the per-repo `PhaseCompletionEnvelope` records
 * (FR-B2, v8.6.0); this envelope references them via lazy-link
 * `phase_envelope_chain_root`.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/ClusterRunSeries.constraints.json` — CRS-1..CRS-4):
 *   - CRS-1: `repos[*].epic_status` is a member of the locked enum
 *     (TypeBox enum + redundant assertion in constraint file for
 *     explicitness) — library-evaluable.
 *   - CRS-2: `failure_mode != null ↔ epic_status = 'failed'` per
 *     element — library-evaluable via LOCAL helper
 *     `failure_mode_iff_failed_status`.
 *   - CRS-3: cross-language conformance — TS + Python + Go + Rust
 *     runners agree on byte-identical canonicalization. Consumer-
 *     state per ADR-010; manifest emits
 *     `CLUSTER_RUN_SERIES_CROSS_RUNTIME_CONTEXT_DEFERRED`.
 *   - CRS-4: `repos[*].repo_slug` distinct within a series —
 *     library-evaluable via LOCAL helper `array_field_distinct`.
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.1
 * @see ADR-010 — class-vs-policy boundary (consumers compute
 *      conformance %; hounfour ships shape).
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
import { Type } from '@sinclair/typebox';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
import { arrayFieldDistinct, failureModeIffFailedStatus, } from '../constraints/builtins/cluster-run-series-local.js';
/**
 * Stricter local pattern for `ClusterRunSeries.ts_started` — Z-only
 * second-precision. Mirrors `CanonicalRun.ts_authored` discipline from
 * v8.6.0 PR-A3.8 iter-5: when multiple runtimes (TS / Go / Python /
 * Rust per FR-A2) must produce identical bytes for the same logical
 * timestamp, "permissive accept, strict emit" requires a shared
 * canonicalizer — pinning the wire format at the schema closes the gap.
 *
 * **Scope**: local to `ClusterRunSeries.ts_started`. The shared
 * `ISO8601_UTC_PATTERN` (used elsewhere in the protocol for envelope
 * timestamps) remains unchanged because envelope `ts` fields carry
 * consumer-shaped fractional precision expectations. Cluster-level
 * series-start timestamps have no sub-second authoring cadence at this
 * layer; pinning to second precision matches the
 * `vectors/runners/_shared/ts-started-z-only.txt` SSOT.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
const TS_STARTED_Z_ONLY_PATTERN = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$';
/**
 * `ClusterRunRepoStatusSchema` — locked per-repo EPIC status enum.
 *
 * Promotion to a discriminated union keyed on `epic_status` is deferred
 * to v8.8.0+ pending consumer-corpus signal. v8.7.0 ships the union of
 * literals; CRS-2 (failure_mode iff failed) is enforced at the
 * cross-field tier instead.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export const ClusterRunRepoStatusSchema = Type.Union([
    Type.Literal('queued'),
    Type.Literal('running'),
    Type.Literal('completed'),
    Type.Literal('failed'),
], {
    $id: 'ClusterRunRepoStatus',
    description: 'Per-repo EPIC status across a cluster-spanning workstream. ' +
        'Locked enum; promotion to a discriminated union keyed on ' +
        'epic_status is deferred to v8.8.0+ pending consumer-corpus ' +
        'signal.',
});
/**
 * `ClusterRunSeriesRepoEntrySchema` — one entry in
 * `ClusterRunSeriesSchema.repos`. Hoisted so the cross-runner
 * conformance suite can validate per-element shape independently of
 * the parent envelope.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export const ClusterRunSeriesRepoEntrySchema = Type.Object({
    repo_slug: Type.String({
        pattern: '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$',
        description: 'GitHub-shaped owner/name slug. Consumer-shaped namespace; ' +
            'hounfour does not freeze the registry. Per-series ' +
            'distinctness is CRS-4.',
    }),
    canonical_run_id: Type.String({
        minLength: 1,
        description: 'Lazy-link to a CanonicalRunSchema (FR-B1, v8.6.0) record. ' +
            'Resolution is consumer-state per ADR-010 — hounfour does ' +
            'not bundle a registry implementation.',
    }),
    epic_status: ClusterRunRepoStatusSchema,
    failure_mode: Type.Union([Type.String({ minLength: 1, maxLength: 256 }), Type.Null()], {
        description: 'Free-form failure-mode classifier. MUST be null when ' +
            'epic_status ≠ "failed", and non-null when ' +
            'epic_status = "failed" (CRS-2). Promotion to a ' +
            'discriminated union is deferred to v8.8.0+ pending ' +
            'consumer-corpus signal.',
    }),
    phase_envelope_chain_root: Type.Union([Type.String({ pattern: SHA256_HEX_PATTERN }), Type.Null()], {
        description: 'Optional lazy-link to the per-repo PhaseCompletionEnvelope ' +
            'chain root (SHA-256 of the chain-tail envelope). Null if ' +
            'no envelopes have been emitted yet for this repo. ' +
            'Resolution is consumer-state per ADR-010.',
    }),
}, {
    $id: 'ClusterRunSeriesRepoEntry',
    additionalProperties: false,
    description: 'One per-repo entry within a ClusterRunSeries. Cross-element ' +
        'invariants (repo_slug distinctness, failure_mode iff failed) ' +
        'live in CRS-2 / CRS-4.',
});
export const ClusterRunSeriesSchema = Type.Object({
    envelope_kind: Type.Literal('cluster_run_series', {
        description: 'Discriminator pinning this envelope shape.',
    }),
    contract_version: Type.Literal('8.7.0', {
        description: 'Hounfour contract version. Pinned to "8.7.0" for the ' +
            'cycle-007 ship line.',
    }),
    run_id: Type.String({
        minLength: 1,
        description: 'Stable opaque series identifier. Consumer-shaped namespace.',
    }),
    cluster_id: Type.String({
        minLength: 1,
        description: 'Consumer-shaped cluster identifier.',
    }),
    ts_started: Type.String({
        pattern: TS_STARTED_Z_ONLY_PATTERN,
        description: 'ISO 8601 UTC timestamp at which this cluster run series ' +
            'started (Z suffix). **Fractional-second precision is NOT ' +
            'admitted**: the wire format is locked to second precision ' +
            'via TS_STARTED_Z_ONLY_PATTERN so cross-runner byte-identity ' +
            '(CRS-3) holds without per-deployment fractional-digit ' +
            'negotiation. Mirrors CanonicalRun.ts_authored discipline ' +
            'from v8.6.0 PR-A3.8 iter-5.',
    }),
    repos: Type.Array(ClusterRunSeriesRepoEntrySchema, {
        minItems: 1,
        description: 'Non-empty array of per-repo entries. Order is consumer-' +
            'shaped (no schema-level ordering invariant). Per-series ' +
            'repo_slug distinctness is CRS-4.',
    }),
}, {
    $id: 'ClusterRunSeries',
    additionalProperties: false,
    description: 'Multi-repo run state envelope. Captures per-repo EPIC status ' +
        'across a cluster-spanning workstream. NOT crypto-bearing; ' +
        'NOT chain-bearing at the cluster-run level — chain-bearing ' +
        'primitives are the per-repo PhaseCompletionEnvelope records ' +
        '(FR-B2, v8.6.0) referenced via the optional ' +
        'phase_envelope_chain_root lazy-link. Round-trip parse + re-' +
        'serialize bit-identical: every well-formed payload `s` ' +
        "satisfies `JSON.stringify(JSON.parse(s)) === s` when `s` is " +
        'itself the JSON-stringified canonical form.',
});
/**
 * `validateClusterRunSeries` — pure-function evaluator for the cross-
 * field invariants CRS-2 (failure_mode iff failed status, per element)
 * and CRS-4 (repo_slug distinctness within the series).
 *
 * **Source of truth** for CRS-2 and CRS-4. Registered into the global
 * cross-field validator registry by `src/validators/index.ts`; exported
 * here so:
 *
 *   - tests can exercise the cross-field tier in isolation without
 *     bypassing the structural Value.Check tier;
 *   - cross-language reference implementations (FR-A2 / TS-as-golden-
 *     corpus per AT-1) have a single TS function to mirror.
 *
 * **Defensive contract** (mirrors the CanonicalRun CR-1 precedent): the
 * function MUST NOT throw on malformed input. Direct callers bypassing
 * the structural tier (Value.Check) receive a tagged precondition
 * error rather than a TypeError. Under the standard `validate(...)`
 * pipeline this defensive path is unreachable — Value.Check rejects
 * non-array `repos`, null elements, missing fields, and out-of-vocab
 * `epic_status` at the structural tier first.
 *
 * **Accumulated-error preservation** (CR-1 precedent): if a per-element
 * shape guard trips mid-iteration, the function MUST NOT discard
 * cross-field errors already accumulated against earlier well-shaped
 * entries. Each malformed element emits its own per-element
 * structural-precondition error; well-shaped entries continue to be
 * checked against CRS-2 / CRS-4.
 *
 * **CRS-1 is NOT enforced here** — it is a TypeBox `enum` constraint
 * (Type.Union of literals) handled at the structural tier. The
 * constraint-file entry for CRS-1 is a redundant declaratory record
 * mirroring the cycle-005 cycle-pattern (per CanonicalRun precedent
 * for documenting library-evaluable invariants in the constraint file).
 *
 * **CRS-3 is consumer-state** per ADR-010 — cross-runtime byte-
 * identity is verified by the FR-A2 cross-language harness, not by
 * this validator. Manifest emission is the consumer's responsibility
 * via the `CLUSTER_RUN_SERIES_CROSS_RUNTIME_CONTEXT_DEFERRED` reason.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input (non-array repos, non-object entries, missing
 *   fields) without throwing.
 * @returns `{ valid, errors, warnings }` — `errors` carries CRS-2 /
 *   CRS-4-tagged strings naming the offending index/value for
 *   actionability.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export function validateClusterRunSeries(data) {
    const errors = [];
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        return {
            valid: false,
            errors: [
                `CRS: structural shape precondition failed — input must be a non-null object (ClusterRunSeries record); got ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}.`,
            ],
            warnings: [],
        };
    }
    const repos = data.repos;
    if (!Array.isArray(repos)) {
        return {
            valid: false,
            errors: [
                'CRS: structural shape precondition failed — repos must be a non-null array; the cross-field validator requires the structural tier (Value.Check) to have passed first.',
            ],
            warnings: [],
        };
    }
    // CRS-2: per-element failure_mode iff epic_status === 'failed'.
    // Each malformed element emits its own per-element structural-
    // precondition error and is skipped for CRS-2 / CRS-4 accumulation.
    for (let i = 0; i < repos.length; i += 1) {
        const entry = repos[i];
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
            errors.push(`CRS: repos[${i}] is ${entry === null ? 'null' : Array.isArray(entry) ? 'array' : typeof entry}, not an object — cross-field validator requires the structural tier to have rejected this element first.`);
            continue;
        }
        const epicStatus = entry.epic_status;
        const failureMode = entry.failure_mode;
        const crs2 = failureModeIffFailedStatus(epicStatus, failureMode);
        if (!crs2.valid) {
            errors.push(`CRS-2: repos[${i}] ${crs2.reason}`);
        }
    }
    // CRS-4: repo_slug distinctness within the series.
    const crs4 = arrayFieldDistinct(repos, 'repo_slug');
    if (!crs4.valid) {
        for (const dup of crs4.duplicates) {
            errors.push(`CRS-4: repos[*].repo_slug "${dup.value}" appears at indices ${dup.indices.join(', ')} — repo_slug must be distinct within a series.`);
        }
    }
    return { valid: errors.length === 0, errors, warnings: [] };
}
//# sourceMappingURL=cluster-run-series.js.map