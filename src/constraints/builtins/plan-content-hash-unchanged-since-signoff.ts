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
export const PLAN_CONTENT_HASH_RULE_ID =
  'plan-signoff-envelope/plan-hash-unchanged';

/**
 * Build the malformed-element FAIL surface used by per-element
 * runtime shape guards (iter-3 HIGH-consensus mitigation).
 */
function malformedEntryFail(
  index: number,
  detail: string,
): EvaluatePlanContentHashUnchangedSinceSignoffResult {
  return {
    result: 'fail',
    manifestEntry: {
      rule_id: PLAN_CONTENT_HASH_RULE_ID,
      rule:
        `plan_content_hash_unchanged_since_signoff: malformed ` +
        `signoff ledger entry at index ${index} — ${detail}.`,
      evaluator: 'library',
      evaluation_note:
        'plan_content_hash_unchanged_since_signoff: the ' +
        'consumer-supplied signoff ledger contains an entry whose ' +
        `runtime shape does not conform to PlanSignoffLedgerEntry ` +
        `at index ${index} (${detail}). The TypeScript interface ` +
        'evaporates at runtime; the library validates each entry ' +
        'before field access to surface a structured FAIL rather ' +
        'than letting an exception or a NaN-poisoned manifest ' +
        'reach the consumer\'s policy code (iter-3 ' +
        'HIGH-consensus boundary fix; see iter-1 trust-boundary ' +
        'discipline applied to the array-level shape check).',
      consumer_acknowledgment_required: true,
    },
  };
}

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
export function evaluatePlanContentHashUnchangedSinceSignoff(
  planHash: unknown,
  ledgerSnapshot: PlanSignoffLedgerSnapshot | null | undefined,
): EvaluatePlanContentHashUnchangedSinceSignoffResult {
  if (typeof planHash !== 'string') {
    return {
      result: 'fail',
      manifestEntry: {
        rule_id: PLAN_CONTENT_HASH_RULE_ID,
        rule:
          `plan_content_hash_unchanged_since_signoff: plan_hash argument ` +
          `must be a string; received ${typeof planHash}.`,
        evaluator: 'library',
        evaluation_note:
          'plan_content_hash_unchanged_since_signoff received a non-string ' +
          'plan_hash. The schema layer guards this for compliant payloads ' +
          '(plan_content_hash is required + sha256-pattern-bound); ' +
          'reaching this branch indicates a programmer error or a bypassed ' +
          'schema validation step.',
        consumer_acknowledgment_required: true,
      },
    };
  }

  if (ledgerSnapshot === null || ledgerSnapshot === undefined) {
    return {
      result: 'deferred',
      manifestEntry: {
        rule_id: PLAN_CONTENT_HASH_RULE_ID,
        rule:
          `plan_content_hash_unchanged_since_signoff(plan_content_hash) ` +
          `with ledger snapshot absent.`,
        evaluator: 'consumer',
        reason: 'ledger_context_deferred',
        evaluation_note:
          'plan_content_hash_unchanged_since_signoff: signoff ledger ' +
          'snapshot was not supplied via validate() options. The ' +
          'obligation is deferred to consumer-side evaluation; the ' +
          'consumer MUST cross-check plan_content_hash against their ' +
          'persistent signoff ledger AND evaluate signoff expiry against ' +
          'the matched entry\'s ts_emit + ttl_seconds_at_emit. ' +
          'Mirrors the ORD-3 / FR-C3 context-absent deferral pattern.',
        consumer_acknowledgment_required: true,
      },
    };
  }

  // F-shape mitigation: state crosses a trust boundary; validate runtime
  // shape rather than relying on TypeScript erasure. The signoffs field
  // is typed as ReadonlyArray; reject anything that isn't actually an
  // array. Empty array is a legal shape — it surfaces FAIL (no signoff
  // matches), not INVALID_INPUT.
  //
  // **Iter-3 HIGH-consensus mitigation (3-of-3 model concurrence):**
  // After the array-level shape check, each element is also runtime-
  // validated below. Consumer-supplied state crosses a trust boundary;
  // a malformed entry where `plan_content_hash` is non-string would
  // throw on `.toLowerCase()`, and where `ttl_seconds_at_emit` is not
  // a bigint, `Number(...)` would silently produce NaN (object) or
  // throw (Symbol). Per-element guards surface a structured FAIL with
  // a library-evaluator manifest entry, mirroring the array-level
  // discipline.
  if (!Array.isArray(ledgerSnapshot.signoffs)) {
    return {
      result: 'fail',
      manifestEntry: {
        rule_id: PLAN_CONTENT_HASH_RULE_ID,
        rule:
          `plan_content_hash_unchanged_since_signoff: ` +
          `ledgerSnapshot.signoffs must be an array; received ` +
          `${typeof ledgerSnapshot.signoffs}.`,
        evaluator: 'library',
        evaluation_note:
          'plan_content_hash_unchanged_since_signoff received a ' +
          'malformed ledger snapshot. The TypeScript ReadonlyArray type ' +
          'evaporates at runtime; the library validates the shape ' +
          'rather than letting Array.prototype.find on a non-array ' +
          'throw a generic TypeError that bypasses the structured ' +
          'manifest. Consumer-supplied state crosses a trust boundary.',
        consumer_acknowledgment_required: true,
      },
    };
  }

  // Iter-3 HIGH-consensus per-element shape validation (3-of-3 model
  // concurrence). Walk the array once and reject malformed entries
  // before any field access; the cost is one linear pass, paid only
  // when state was supplied at all.
  for (let i = 0; i < ledgerSnapshot.signoffs.length; i++) {
    const entry = ledgerSnapshot.signoffs[i] as unknown;
    if (entry === null || typeof entry !== 'object') {
      return malformedEntryFail(
        i,
        `entry is not an object (typeof=${typeof entry})`,
      );
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.plan_content_hash !== 'string') {
      return malformedEntryFail(
        i,
        `plan_content_hash is not a string ` +
          `(typeof=${typeof e.plan_content_hash})`,
      );
    }
    if (typeof e.ts_emit !== 'string') {
      return malformedEntryFail(
        i,
        `ts_emit is not a string (typeof=${typeof e.ts_emit})`,
      );
    }
    if (typeof e.ttl_seconds_at_emit !== 'bigint') {
      return malformedEntryFail(
        i,
        `ttl_seconds_at_emit is not a bigint ` +
          `(typeof=${typeof e.ttl_seconds_at_emit}). Consumers parse ` +
          `the schema's string-encoded field via BigInt(...) before ` +
          `inserting into the ledger.`,
      );
    }
    if (typeof e.signoff_id !== 'string') {
      return malformedEntryFail(
        i,
        `signoff_id is not a string (typeof=${typeof e.signoff_id})`,
      );
    }
  }

  // Iter-1 F-002 mitigation: SHA256_HEX_PATTERN admits mixed-case
  // (`[A-Fa-f0-9]`) per v8.5.0 SignatureEnvelope precedent, so the
  // schema-validation step alone doesn't guarantee comparable case.
  // Normalize both sides to lowercase before comparison so a
  // mixed-case wire payload matches a lowercase ledger entry (and
  // vice-versa). The colon-prefix `sha256:` is ASCII so .toLowerCase()
  // is safe (no Unicode-aware case folding needed). The schema's
  // canonical form remains lowercase per the docstring; this fix
  // closes the under-specified comparison surface, not the schema.
  const planHashLc = planHash.toLowerCase();
  const matching = ledgerSnapshot.signoffs.find(
    (s) => s.plan_content_hash.toLowerCase() === planHashLc,
  );
  if (matching === undefined) {
    return {
      result: 'fail',
      manifestEntry: {
        rule_id: PLAN_CONTENT_HASH_RULE_ID,
        rule:
          `plan_content_hash_unchanged_since_signoff(plan_content_hash) ` +
          `against ledger snapshot at ${ledgerSnapshot.ts_snapshot}.`,
        evaluator: 'consumer',
        reason: 'signoff_plan_hash_mismatch',
        evaluation_note:
          `plan_content_hash_unchanged_since_signoff: plan_hash ` +
          `${planHash} not present in the supplied signoff ledger ` +
          `snapshot (snapshot ts ${ledgerSnapshot.ts_snapshot}, ` +
          `${ledgerSnapshot.signoffs.length} entries). The plan content ` +
          `has changed since signoff or the signoff was never recorded. ` +
          `The consumer MUST refuse to authorize on the unmatched plan.`,
        consumer_acknowledgment_required: true,
      },
    };
  }

  // NA-3: hash-match path emits SIGNOFF_TTL_OBSERVED with both
  // ts_emit AND derived ttl_until_ms (epoch milliseconds). Consumers
  // compare ttl_until_ms against ts_snapshot or wall-clock to gate
  // signoff freshness; the library does NOT decide what "expired"
  // means (ADR-010). Number(bigint) for the * 1000 step is safe
  // because the schema bounds ttl_seconds_at_emit at consumer-side
  // 2^53-1 (AT-8); past that ceiling the consumer is responsible
  // for using BigInt arithmetic on their side. We compute in Number
  // here because Date.parse returns Number anyway and the resulting
  // ttl_until_ms is a millisecond timestamp, not a TTL count.
  // Iter-1 F-003-ttl-nan mitigation: Date.parse returns NaN on
  // malformed ISO 8601 strings, which then silently propagates to
  // ttl_until_ms=NaN in the manifest's evaluation_note — useless to
  // the consumer's policy code. Apply the same trust-boundary
  // discipline as the signoffs Array.isArray check: surface a
  // structured FAIL with a library-evaluator manifest entry rather
  // than letting the malformed input bleed into the operator surface.
  const ts_emit_ms = Date.parse(matching.ts_emit);
  if (!Number.isFinite(ts_emit_ms)) {
    return {
      result: 'fail',
      manifestEntry: {
        rule_id: PLAN_CONTENT_HASH_RULE_ID,
        rule:
          `plan_content_hash_unchanged_since_signoff: ` +
          `matching ledger entry has malformed ts_emit ` +
          `"${matching.ts_emit}" (Date.parse returned NaN).`,
        evaluator: 'library',
        evaluation_note:
          'plan_content_hash_unchanged_since_signoff: the matching ' +
          'signoff ledger entry carries an unparseable ts_emit ' +
          `(value="${matching.ts_emit}"). The library cannot ` +
          'compute a deterministic absolute expiry epoch when ' +
          'Date.parse fails. Consumer-supplied state crosses a trust ' +
          'boundary; malformed timestamps surface a structured FAIL ' +
          'rather than letting an indeterminate parse leak into the ' +
          'pass-path manifest as a useless TTL value (iter-1 F-003).',
        consumer_acknowledgment_required: true,
      },
    };
  }
  // Iter-1 F-002-precision note: Number(bigint) coercion is
  // deliberately bounded by the consumer-side AT-8 ceiling
  // (2^53-1, Number.MAX_SAFE_INTEGER). Beyond that ceiling,
  // millisecond arithmetic via Number is no longer exact; consumers
  // who set ttl_seconds_at_emit close to the 2^53-1 schema ceiling
  // SHOULD apply BigInt-arithmetic on their side and re-derive the
  // expiry. The schema-level upper bound is enforced consumer-side
  // per the AT-8 acknowledged tradeoff (cross-language JSON
  // portability outranks per-consumer parsing convenience).
  const ttl_until_ms = ts_emit_ms + Number(matching.ttl_seconds_at_emit) * 1000;
  return {
    result: 'pass',
    manifestEntry: {
      rule_id: PLAN_CONTENT_HASH_RULE_ID,
      rule:
        `plan_content_hash_unchanged_since_signoff(plan_content_hash) ` +
        `matched signoff_id=${matching.signoff_id}.`,
      evaluator: 'consumer',
      reason: 'signoff_ttl_observed',
      evaluation_note:
        `plan_content_hash_unchanged_since_signoff: signoff matches ` +
        `signoff_id=${matching.signoff_id} ts_emit=${matching.ts_emit} ` +
        `ttl_seconds_at_emit=${matching.ttl_seconds_at_emit.toString()} ` +
        `ttl_until_ms=${ttl_until_ms}. Hounfour does NOT enforce TTL ` +
        `(ADR-010 / NFR-8). The consumer MUST compare ttl_until_ms ` +
        `against ledgerSnapshot.ts_snapshot (preferred for replay) or ` +
        `wall-clock; expired signoffs MUST NOT authorize plan ` +
        `execution. Surfacing the TTL inputs on the pass path makes ` +
        `expiry-evaluation a deliberate next step rather than an easy ` +
        `oversight (RC2 SKP-006 / NA-3).`,
      consumer_acknowledgment_required: true,
    },
  };
}
