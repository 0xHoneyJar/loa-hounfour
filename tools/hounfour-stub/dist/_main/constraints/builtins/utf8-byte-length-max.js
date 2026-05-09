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
// Module-scope encoder reused across calls — the TextEncoder constructor
// is non-trivial and the instance is stateless and concurrency-safe per
// the WHATWG Encoding spec, so a single hoisted reference avoids the
// per-call allocation cost flagged in PR-A3.5 iter-4 F9 (matters for
// archive/replay validation where the cap is checked on every record).
const ENCODER = new TextEncoder();
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseUtf8ByteLengthMax()` returns
 * a boolean; direct callers wanting the structured diagnostic should
 * use this entry point.
 *
 * Argument shape (DSL surface):
 *   `utf8_byte_length_max(value, byte_cap)`
 */
export function evaluateUtf8ByteLengthMax(value, byteCap) {
    if (typeof value !== 'string') {
        return {
            valid: false,
            diagnostic: {
                code: 'UTF8_BYTE_LENGTH_INVALID_INPUT',
                message: `utf8_byte_length_max: value argument must be a string; ` +
                    `received ${typeof value}.`,
            },
        };
    }
    if (typeof byteCap !== 'number' ||
        !Number.isFinite(byteCap) ||
        byteCap <= 0 ||
        !Number.isInteger(byteCap)) {
        return {
            valid: false,
            diagnostic: {
                code: 'UTF8_BYTE_LENGTH_INVALID_INPUT',
                message: `utf8_byte_length_max: byte_cap must be a positive integer; ` +
                    `received ${typeof byteCap === 'number' ? byteCap : typeof byteCap}.`,
            },
        };
    }
    // PR-A3.5 iter-2 F-003 / iter-4 F9: use the web-standard TextEncoder
    // API (hoisted to module scope to avoid per-call construction)
    // rather than Node-only `Buffer.byteLength`. The builtin runs
    // unchanged in Cloudflare Workers, Vercel Edge, Deno (default), and
    // browsers. Both surfaces yield byte-identical counts for valid UTF-8
    // input.
    //
    // V8-style fast-accept path: `value.length * 4` is a strict UPPER bound
    // on UTF-8 byte length (every JS UTF-16 code unit encodes to at most
    // 4 UTF-8 bytes, and surrogate pairs collapse to a single 4-byte
    // sequence). If the upper bound is already within cap, accept without
    // the encode-and-length allocation. Note: we deliberately do NOT
    // short-circuit on the lower-bound rejection path (`value.length >
    // byteCap`) because the diagnostic needs the EXACT actual_bytes for
    // operators to size producer budgets — reporting "at least N" defeats
    // the diagnostic surface's purpose.
    if (value.length * 4 <= byteCap) {
        return { valid: true };
    }
    const actualBytes = ENCODER.encode(value).length;
    if (actualBytes > byteCap) {
        return {
            valid: false,
            diagnostic: {
                code: 'UTF8_BYTE_LENGTH_EXCEEDED',
                message: `utf8_byte_length_max: UTF-8 byte length ${actualBytes} ` +
                    `exceeds cap ${byteCap}. Note: a string with ${value.length} ` +
                    `JS UTF-16 code units encodes to ${actualBytes} UTF-8 bytes — ` +
                    `non-ASCII code points consume 2-4 bytes each (CJK = 3, emoji = 4).`,
                actual_bytes: actualBytes,
                cap_bytes: byteCap,
            },
        };
    }
    return { valid: true };
}
//# sourceMappingURL=utf8-byte-length-max.js.map