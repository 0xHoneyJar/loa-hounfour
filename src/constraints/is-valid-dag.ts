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
export const IS_VALID_DAG_OP_CAP = 100_000;

/**
 * Pre-guard cap on `items` array length. Inputs larger than this are rejected
 * before any traversal work. Resolves the pass-3-followup memory/DoS concern
 * (Sprint-SKP-005) — the OP_CAP bounds compute time but not allocation, so a
 * cheap constant-time check on items.length runs first.
 */
export const IS_VALID_DAG_ITEMS_CAP = 10_000;

/**
 * Pre-guard cap on serialized payload size in bytes (1 MiB). Inputs whose
 * JSON-stringified form exceeds this are rejected before any traversal work.
 */
export const IS_VALID_DAG_BYTES_CAP = 1_048_576;

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
export type IsValidDagErrorCode =
  | 'DAG_OP_CAP_EXCEEDED'
  | 'DAG_CYCLE_DETECTED'
  | 'DAG_DANGLING_REF'
  | 'DAG_MISSING_ID_FIELD'
  | 'DAG_NON_STRING_ID_FIELD'
  | 'DAG_DUPLICATE_ID'
  | 'DAG_INPUT_OVERSIZE';

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
export type IsValidDagResult =
  | { valid: true; diagnostic: null }
  | { valid: false; diagnostic: IsValidDagDiagnostic };

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
export function extractPath(node: unknown, path: string): unknown {
  if (typeof path !== 'string' || path.length === 0) return undefined;
  // Reject any '[N]' array-index syntax so cross-runner behaviour stays
  // purely dot-based. Bracket-notation in any form returns undefined.
  if (path.includes('[') || path.includes(']')) return undefined;

  const segments = path.split('.');
  let current: unknown = node;
  for (const segment of segments) {
    if (segment.length === 0) return undefined;
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function bytesOf(value: string): number {
  // TextEncoder produces UTF-8 bytes; falls back to character count when
  // unavailable (older Node, but always available in current toolchain).
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
}

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
export function evaluateIsValidDag(
  items: unknown,
  idField: string,
  refFields: readonly string[],
): IsValidDagResult {
  // Step 0: input pre-guards. Memory/DoS protection runs before any
  // traversal, so malicious payloads are rejected on a constant-time check.
  if (!Array.isArray(items)) {
    // Treat non-array input as vacuously valid — the constraint DSL surface
    // (`parseIsValidDag`) returns true for non-array inputs, matching the
    // pattern used by `links_form_chain` and friends. Only the structured
    // function call enforces the array contract.
    return { valid: true, diagnostic: null };
  }

  if (items.length > IS_VALID_DAG_ITEMS_CAP) {
    return {
      valid: false,
      diagnostic: {
        code: 'DAG_INPUT_OVERSIZE',
        path: '$',
        context: { kind: 'items_count', limit: IS_VALID_DAG_ITEMS_CAP, actual: items.length },
      },
    };
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(items);
  } catch {
    serialized = '';
  }
  const byteLength = bytesOf(serialized);
  if (byteLength > IS_VALID_DAG_BYTES_CAP) {
    return {
      valid: false,
      diagnostic: {
        code: 'DAG_INPUT_OVERSIZE',
        path: '$',
        context: { kind: 'bytes', limit: IS_VALID_DAG_BYTES_CAP, actual: byteLength },
      },
    };
  }

  // Step 1: build the id-index. +1 op per item visited.
  let ops = 0;
  const index = new Map<string, Record<string, unknown>>();
  // Track all original-array indices for each id so DAG_DUPLICATE_ID can
  // report a complete `indices` list per the diagnostic contract.
  const idIndices = new Map<string, number[]>();

  for (let i = 0; i < items.length; i++) {
    ops += 1;
    if (ops > IS_VALID_DAG_OP_CAP) {
      return {
        valid: false,
        diagnostic: {
          code: 'DAG_OP_CAP_EXCEEDED',
          path: '$',
          context: { ops, phase: 'indexing' satisfies IsValidDagPhase, processed: i },
        },
      };
    }

    const item = items[i];
    if (item === null || item === undefined || typeof item !== 'object' || Array.isArray(item)) {
      return {
        valid: false,
        diagnostic: {
          code: 'DAG_MISSING_ID_FIELD',
          path: `$[${i}]`,
          context: { index: i },
        },
      };
    }

    const record = item as Record<string, unknown>;
    if (!(idField in record) || record[idField] === undefined) {
      return {
        valid: false,
        diagnostic: {
          code: 'DAG_MISSING_ID_FIELD',
          path: `$[${i}].${idField}`,
          context: { index: i },
        },
      };
    }

    const idValue = record[idField];
    if (typeof idValue !== 'string') {
      return {
        valid: false,
        diagnostic: {
          code: 'DAG_NON_STRING_ID_FIELD',
          path: `$[${i}].${idField}`,
          context: { index: i, actual_type: typeof idValue },
        },
      };
    }

    const seen = idIndices.get(idValue);
    if (seen !== undefined) {
      seen.push(i);
      return {
        valid: false,
        diagnostic: {
          code: 'DAG_DUPLICATE_ID',
          path: `$[${i}].${idField}`,
          context: { id: idValue, indices: seen.slice() },
        },
      };
    }
    idIndices.set(idValue, [i]);
    index.set(idValue, record);
  }

  // Step 2: post-order DFS from each item, mark visited and on_stack.
  // +1 op per node enter, +1 op per ref resolve.
  const visited = new Set<string>();
  const onStack = new Set<string>();

  // Carry diagnostic out of recursion via a captured slot. Sentinel
  // exception sentinel pattern is avoided to keep portability with the
  // pseudocode (other runners may not have exceptions).
  let diagnostic: IsValidDagDiagnostic | null = null;
  let exceededOpCap = false;

  function visit(nodeId: string, path: string[]): void {
    if (diagnostic !== null) return;
    ops += 1;
    if (ops > IS_VALID_DAG_OP_CAP) {
      diagnostic = {
        code: 'DAG_OP_CAP_EXCEEDED',
        path: '$',
        context: { ops, phase: 'dfs' satisfies IsValidDagPhase, at_node: nodeId },
      };
      exceededOpCap = true;
      return;
    }

    if (onStack.has(nodeId)) {
      const cycle = [...path, nodeId];
      diagnostic = {
        code: 'DAG_CYCLE_DETECTED',
        path: '$',
        context: { cycle },
      };
      return;
    }
    if (visited.has(nodeId)) return;
    onStack.add(nodeId);

    const node = index.get(nodeId);
    if (node === undefined) {
      // Unreachable when all ids are indexed, but defend against future
      // refactors. Treat as dangling at the entry point.
      diagnostic = {
        code: 'DAG_DANGLING_REF',
        path: '$',
        context: { from: nodeId, ref: nodeId },
      };
      return;
    }

    for (const refField of refFields) {
      ops += 1;
      if (ops > IS_VALID_DAG_OP_CAP) {
        diagnostic = {
          code: 'DAG_OP_CAP_EXCEEDED',
          path: '$',
          context: { ops, phase: 'ref-resolve' satisfies IsValidDagPhase, at_node: nodeId },
        };
        exceededOpCap = true;
        return;
      }

      const refValue = extractPath(node, refField);
      if (refValue === undefined || refValue === null) continue;

      if (typeof refValue !== 'string') {
        diagnostic = {
          code: 'DAG_DANGLING_REF',
          path: `$[*].${refField}`,
          context: { from: nodeId, ref: refValue, reason: 'non-string-ref' },
        };
        return;
      }

      if (!index.has(refValue)) {
        diagnostic = {
          code: 'DAG_DANGLING_REF',
          path: `$[*].${refField}`,
          context: { from: nodeId, ref: refValue },
        };
        return;
      }

      visit(refValue, [...path, nodeId]);
      if (diagnostic !== null) return;
    }

    onStack.delete(nodeId);
    visited.add(nodeId);
  }

  for (let i = 0; i < items.length && diagnostic === null; i++) {
    const record = items[i] as Record<string, unknown>;
    const id = record[idField] as string;
    if (visited.has(id)) continue;
    visit(id, []);
    if (exceededOpCap) break;
  }

  if (diagnostic !== null) {
    return { valid: false, diagnostic };
  }
  return { valid: true, diagnostic: null };
}
