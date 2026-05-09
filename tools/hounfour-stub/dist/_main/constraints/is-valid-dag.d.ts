/**
 * `is_valid_dag` constraint builtin — post-order DFS with explicit op-counter.
 *
 * Detects cycles, dangling references, missing/non-string id fields, duplicate
 * ids, and oversized inputs across an items array keyed by `id_field` with
 * outgoing edges in `...ref_fields`. Implements the normative algorithm from
 * SDD section 5.5.1 verbatim so all four language runners (TS / Go / Python /
 * Rust) emit byte-identical traces.
 *
 * Pre-guards (memory / DoS protection, run BEFORE traversal):
 *   - `ITEMS_CAP`: 10_000 items
 *   - `BYTES_CAP`: 1 MiB serialized payload
 *
 * Op accounting (counted in `OP_CAP = 100_000`):
 *   - +1 per item visited during the indexing pass (phase: 'indexing')
 *   - +1 per node enter via DFS visit (phase: 'dfs')
 *   - +1 per `ref_fields[k]` reference resolution on a node (phase: 'ref-resolve')
 *
 * Iteration order is **declared array order** — Map iteration is NOT used for
 * traversal because different languages have different default Map orders.
 *
 * @see SDD section 5.5.1 — Op-counting algorithm (NORMATIVE)
 * @see SDD section 6.3 — Structured diagnostic cases
 * @see SDD section 6.5 — Cross-runner ErrorEnvelope shape
 * @since v8.4.0 (FR-C1)
 */
/**
 * Hard cap on traversal operations. Once exceeded, `is_valid_dag` returns a
 * `DAG_OP_CAP_EXCEEDED` diagnostic immediately. The cap is constant across
 * all four language runners so cross-runner parity holds.
 */
export declare const IS_VALID_DAG_OP_CAP = 100000;
/**
 * Pre-guard cap on `items` array length. Inputs larger than this are rejected
 * before any traversal work. Resolves the pass-3-followup memory/DoS concern
 * (Sprint-SKP-005) — the OP_CAP bounds compute time but not allocation, so a
 * cheap constant-time check on items.length runs first.
 */
export declare const IS_VALID_DAG_ITEMS_CAP = 10000;
/**
 * Pre-guard cap on serialized payload size in bytes (1 MiB). Inputs whose
 * JSON-stringified form exceeds this are rejected before any traversal work.
 */
export declare const IS_VALID_DAG_BYTES_CAP = 1048576;
/**
 * Op-counting phase reported in `DAG_OP_CAP_EXCEEDED` diagnostics. Identifies
 * which traversal step exhausted the budget so consumers can correlate with
 * the algorithm pseudocode.
 */
export type IsValidDagPhase = 'indexing' | 'dfs' | 'ref-resolve';
/**
 * Normative error codes emitted by `is_valid_dag`. The string values are
 * stable cross-runner; SDD section 6.5 pins them as the comparison surface.
 */
export type IsValidDagErrorCode = 'DAG_OP_CAP_EXCEEDED' | 'DAG_CYCLE_DETECTED' | 'DAG_DANGLING_REF' | 'DAG_MISSING_ID_FIELD' | 'DAG_NON_STRING_ID_FIELD' | 'DAG_DUPLICATE_ID' | 'DAG_INPUT_OVERSIZE';
/**
 * Cross-runner ErrorEnvelope shape (subset specific to `is_valid_dag`).
 * Per SDD section 6.5, `code` + `path` + `context` are normative; `message`
 * is locale-affordant and NOT compared cross-runner.
 */
export interface IsValidDagDiagnostic {
    code: IsValidDagErrorCode;
    path: string;
    context: Record<string, unknown>;
    message?: string;
}
/**
 * Return shape from `evaluateIsValidDag`. When `valid: true`, `diagnostic` is
 * `null`. When `valid: false`, `diagnostic` is a non-null `ErrorEnvelope`.
 */
export type IsValidDagResult = {
    valid: true;
    diagnostic: null;
} | {
    valid: false;
    diagnostic: IsValidDagDiagnostic;
};
/**
 * Resolve a dotted path on a JSON-shaped value. Per SDD section 5.5.1
 * `extract_path` reference table:
 *
 *   - Top-level field           `'claim_id'`            → walk one segment
 *   - Nested field              `'grounding.claim_id'`  → walk dot-separated segments
 *   - Missing intermediate      `{ grounding: null }`   → `undefined`
 *   - Wrong type at intermediate `{ grounding: 'x' }`   → `undefined` (no traversal-into-string)
 *   - Empty path                 `''`                    → `undefined` (rejected as malformed)
 *   - Array index in path        `'claims[0].id'`        → `undefined` (`[N]` syntax not supported)
 *
 * `[N]` array-index syntax is intentionally rejected to keep cross-runner
 * semantics simple (TS reflection, Go reflection, Python `getattr`, and Rust
 * pattern matching all agree on dot-only paths).
 */
export declare function extractPath(node: unknown, path: string): unknown;
/**
 * Evaluate the normative `is_valid_dag` algorithm on `items` keyed by
 * `id_field`, with outgoing edges in `ref_fields`. Returns `{ valid: true,
 * diagnostic: null }` when the items form a valid DAG (no cycles, no dangling
 * refs, all ids present and string-typed, no duplicates, within size and op
 * budgets), or `{ valid: false, diagnostic }` with a structured envelope.
 *
 * The implementation is iterative-recursive (uses a recursive `visit` closure)
 * — by the SDD's normative invariant, op count is identical between recursive
 * and explicit-stack implementations because each `visit` call is one op.
 */
export declare function evaluateIsValidDag(items: unknown, idField: string, refFields: readonly string[]): IsValidDagResult;
//# sourceMappingURL=is-valid-dag.d.ts.map