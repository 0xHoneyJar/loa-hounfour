/**
 * `plan_content_hash_unchanged_since_signoff` constraint builtin
 * (FR-C4, v8.6.0).
 *
 * State-bearing plan-binding check. Asserts that the validating
 * `plan_content_hash` (typically carried on a `PlanSignoffEnvelope`
 * or referenced as `parent_plan_hash` on a `PlanAmendmentRequest`)
 * is present in the consumer-supplied signoff ledger snapshot.
 *
 * **NA-3 behavior.** On hash-match (`pass`), the builtin emits a
 * `SIGNOFF_TTL_OBSERVED` manifest entry surfacing the matched
 * signoff's `ts_emit` plus the absolute `ttl_until_ms` derived from
 * `ts_emit + ttl_seconds_at_emit * 1000`. The hash-existence check
 * by itself is not enough — a consumer that validates the hash
 * without checking expiry could authorize a signoff whose TTL has
 * already lapsed. Surfacing the TTL inputs alongside the hash check
 * makes expiry-evaluation a deliberate next step rather than an
 * easy oversight (RC2 SKP-006 fix; SDD §4.5).
 *
 * **TTL enforcement is OUT.** Per ADR-010 / NFR-8, hounfour does
 * not decide what "expired" means. The builtin reports the inputs;
 * the consumer compares `ttl_until_ms` against `ledger_snapshot.
 * ts_snapshot` or wall-clock time (or any other policy clock).
 *
 * **Three outcomes:**
 *   - `result: 'pass'` with `SIGNOFF_TTL_OBSERVED` manifest entry
 *     (NA-3) when the hash is found in the snapshot.
 *   - `result: 'fail'` with `SIGNOFF_PLAN_HASH_MISMATCH` manifest
 *     entry when the snapshot exists but the hash is absent.
 *   - `result: 'deferred'` with `LEDGER_CONTEXT_DEFERRED` manifest
 *     entry when the snapshot was not supplied — the obligation is
 *     deferred to consumer-side evaluation (mirrors the
 *     `CHAIN_CONTEXT_DEFERRED` pattern from FR-C3).
 *
 * **Why a different return shape.** Unlike the FR-C1/C2/C3 builtins
 * that return `{ valid, diagnostic }`, FR-C4 returns
 * `{ result, manifestEntry }` because the PASS path itself carries
 * a payload (the TTL-observation entry). The DSL wrapper at
 * `src/constraints/evaluator.ts` `parsePlanContentHashUnchangedSinceSignoff()`
 * maps `result === 'fail'` to boolean `false`; both `'pass'` and
 * `'deferred'` map to boolean `true` (vacuous-pass-with-deferral
 * matches AT-6 / FR-C1 / FR-C3 conventions).
 *
 * @see SDD §4.5 — FR-C4 spec
 * @see SDD §4.7 — Builtin → Manifest Reason Map
 * @since v8.6.0 — FR-C4 (PR-A3.6)
 */
import type { UnverifiedObligationEntry } from '../unverified-obligations.js';
/**
 * Per-signoff entry in the consumer's signoff ledger. Mirrors the
 * `PlanSignoffEnvelope` wire shape but with `ttl_seconds_at_emit`
 * already parsed from the schema's string-encoded form (CT-03)
 * into a JavaScript `bigint`. Consumers parse via
 * `BigInt(envelope.ttl_seconds_at_emit)` after schema validation
 * (the schema's `^[1-9][0-9]*$` pattern guarantees the parse
 * succeeds without try/catch; "0" is reserved as the
 * expired-on-emit sentinel and is rejected at the schema layer).
 */
export interface PlanSignoffLedgerEntry {
    /** Stable identifier for the signoff record (consumer-shaped). */
    signoff_id: string;
    /**
     * sha256-prefixed hash of the plan content the signoff binds to
     * (matches the schema's `^sha256:[A-Fa-f0-9]{64}$` pattern). The
     * builtin compares case-insensitively (lowercase-normalized on
     * both sides) per the iter-1 F-002 fix: SHA256_HEX_PATTERN admits
     * mixed-case for v8.5.0 SignatureEnvelope-compat reasons, so
     * exact-string compare would yield mutually-unmatchable
     * semantically-identical hashes. The canonical wire form remains
     * lowercase; consumers may store entries in either case.
     */
    plan_content_hash: string;
    /**
     * Parsed TTL in seconds. Consumer parses the schema's
     * string-encoded `^[1-9][0-9]*$` field via `BigInt(...)` after
     * validation; the schema-level pattern guarantees a successful
     * parse. "0" is forbidden at the schema layer (expired-on-emit
     * sentinel reserved); any value here is ≥1.
     */
    ttl_seconds_at_emit: bigint;
    /**
     * ISO 8601 UTC timestamp at which the signoff was emitted.
     * Mirrors the envelope's `ts` field; `Date.parse(ts_emit)`
     * yields the absolute emit-time epoch milliseconds.
     */
    ts_emit: string;
}
/**
 * Snapshot of the consumer's signoff ledger at validate-time. The
 * library does NOT mutate this state; it is read-only at
 * evaluate-time. Per ADR-010, the consumer manages signoff
 * persistence, eviction, and expiry policy; the library only
 * checks hash-membership and surfaces TTL inputs.
 */
export interface PlanSignoffLedgerSnapshot {
    /**
     * ISO 8601 UTC timestamp at which the consumer captured this
     * snapshot. Surfaced via the manifest entry so the consumer's
     * expiry-policy can compare `ttl_until_ms` against
     * `ts_snapshot` deterministically (preferred over wall-clock
     * for replay).
     */
    ts_snapshot: string;
    /** Per-signoff entries; lookup is by `plan_content_hash`. */
    signoffs: ReadonlyArray<PlanSignoffLedgerEntry>;
}
export type PlanContentHashResult = 'pass' | 'fail' | 'deferred';
export interface EvaluatePlanContentHashUnchangedSinceSignoffResult {
    result: PlanContentHashResult;
    manifestEntry?: UnverifiedObligationEntry;
}
/** Stable rule_id surfaced in every manifest entry from this builtin. */
export declare const PLAN_CONTENT_HASH_RULE_ID = "plan-signoff-envelope/plan-hash-unchanged";
/**
 * Standalone evaluator. The constraint-DSL wrapper returns boolean;
 * direct callers wanting the structured manifest entry should use
 * this entry point.
 *
 * Argument shape (DSL surface):
 *   `plan_content_hash_unchanged_since_signoff(plan_content_hash)`
 *
 * The plan_content_hash field name is a runtime path-deref; the
 * ledger snapshot comes from `EvaluationContext.plan_signoff_ledger`.
 *
 * @param planHash - The plan_content_hash value being checked
 *                   (sha256-prefixed; the schema-level pattern
 *                   guarantees the format at the structural layer).
 * @param ledgerSnapshot - Consumer's persistent signoff ledger; when
 *                         `undefined` or `null`, the obligation is
 *                         deferred (returns `result: 'deferred'`).
 */
export declare function evaluatePlanContentHashUnchangedSinceSignoff(planHash: unknown, ledgerSnapshot: PlanSignoffLedgerSnapshot | null | undefined): EvaluatePlanContentHashUnchangedSinceSignoffResult;
//# sourceMappingURL=plan-content-hash-unchanged-since-signoff.d.ts.map