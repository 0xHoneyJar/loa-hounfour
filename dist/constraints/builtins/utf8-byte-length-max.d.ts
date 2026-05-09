/**
 * `utf8_byte_length_max` LOCAL constraint builtin (PR-A3.5 iter-1
 * F-002 mitigation, v8.6.0).
 *
 * Pure-shape check: returns `valid: true` when the input string's
 * UTF-8 byte length is ≤ the configured cap; `valid: false` with a
 * `UTF8_BYTE_LENGTH_EXCEEDED` diagnostic otherwise.
 *
 * **Why this is distinct from `maxLength`** — JSON Schema 2020-12
 * §6.3.1 normatively defines `maxLength` on Unicode code points; JS
 * validators (TypeBox, Ajv) count UTF-16 code units (an implementation
 * artifact of `String.prototype.length`). Neither matches UTF-8 byte
 * count. A multi-byte string can pass `maxLength: 4096` while
 * exceeding 4 KB on the wire because non-ASCII code points encode to
 * 2-4 UTF-8 bytes each (CJK = 3 bytes, emoji = 4 bytes). When the
 * downstream system (Telegram 4 KB, Twitter pre-2018) enforces UTF-8
 * byte caps, the schema must enforce UTF-8 byte caps too. This builtin
 * provides that surface.
 *
 * **LOCAL** because the cap is a property of the string alone — no
 * consumer-supplied state is needed (matches the `canonical_size_cap`
 * pattern from PR-A3.4).
 *
 * The diagnostic identifies the actual byte length AND the cap so
 * operators can size the producer budget correctly without re-running
 * the validation.
 *
 * **Runtime portability** — the implementation uses `TextEncoder`, the
 * web-standard surface available in every modern JS runtime (Node ≥
 * 11, Cloudflare Workers, Vercel Edge, Deno, browsers). Cross-runner
 * conformance equivalents: Go `len([]byte(s))`; Python
 * `len(s.encode('utf-8'))`; Rust `s.len()` (for valid UTF-8). All four
 * yield byte-identical counts for valid UTF-8 input, which the
 * cross-runner conformance harness asserts.
 *
 * @see SDD §3.5 — FR-B3 OracleDigest.telegram_variant_md_below_4kb
 * @see SDD §4.6 — LOCAL helper builtins
 * @since v8.6.0 — FR-B3 (PR-A3.5 iter-1 F-002, iter-2 F-003 portability)
 */
export type Utf8ByteLengthErrorCode = 'UTF8_BYTE_LENGTH_EXCEEDED' | 'UTF8_BYTE_LENGTH_INVALID_INPUT';
export interface Utf8ByteLengthDiagnostic {
    code: Utf8ByteLengthErrorCode;
    message: string;
    /** Actual UTF-8 byte length (when known). */
    actual_bytes?: number;
    /** Configured cap. */
    cap_bytes?: number;
}
export interface EvaluateUtf8ByteLengthMaxResult {
    valid: boolean;
    diagnostic?: Utf8ByteLengthDiagnostic;
}
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseUtf8ByteLengthMax()` returns
 * a boolean; direct callers wanting the structured diagnostic should
 * use this entry point.
 *
 * Argument shape (DSL surface):
 *   `utf8_byte_length_max(value, byte_cap)`
 */
export declare function evaluateUtf8ByteLengthMax(value: unknown, byteCap: unknown): EvaluateUtf8ByteLengthMaxResult;
//# sourceMappingURL=utf8-byte-length-max.d.ts.map