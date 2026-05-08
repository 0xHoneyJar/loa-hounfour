/**
 * `utf8_byte_length_max` LOCAL constraint builtin (PR-A3.5 iter-1
 * F-002 mitigation, v8.6.0).
 *
 * Pure-shape check: returns `valid: true` when the input string's
 * UTF-8 byte length is ≤ the configured cap; `valid: false` with a
 * `UTF8_BYTE_LENGTH_EXCEEDED` diagnostic otherwise.
 *
 * **Why this is distinct from `maxLength`** — JSON Schema's `maxLength`
 * keyword counts UTF-16 code units (in JS) or codepoints (in some
 * implementations); it does NOT count UTF-8 bytes. A 4096-emoji string
 * has `maxLength: 4096` valid (4096 code units, but ~16 KB UTF-8
 * bytes). When the downstream system (Telegram, Twitter pre-2018)
 * enforces UTF-8 byte caps, the schema must enforce UTF-8 byte caps
 * too. This builtin provides that surface.
 *
 * **LOCAL** because the cap is a property of the string alone — no
 * consumer-supplied state is needed (matches the `canonical_size_cap`
 * pattern from PR-A3.4).
 *
 * The diagnostic identifies the actual byte length AND the cap so
 * operators can size the producer budget correctly without re-running
 * the validation.
 *
 * @see SDD §3.5 — FR-B3 OracleDigest.telegram_variant_md_below_4kb
 * @see SDD §4.6 — LOCAL helper builtins
 * @since v8.6.0 — FR-B3 (PR-A3.5 iter-1 F-002)
 */

export type Utf8ByteLengthErrorCode =
  | 'UTF8_BYTE_LENGTH_EXCEEDED'
  | 'UTF8_BYTE_LENGTH_INVALID_INPUT';

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
export function evaluateUtf8ByteLengthMax(
  value: unknown,
  byteCap: number,
): EvaluateUtf8ByteLengthMaxResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      diagnostic: {
        code: 'UTF8_BYTE_LENGTH_INVALID_INPUT',
        message:
          `utf8_byte_length_max: value argument must be a string; ` +
          `received ${typeof value}.`,
      },
    };
  }
  if (
    typeof byteCap !== 'number' ||
    !Number.isFinite(byteCap) ||
    byteCap <= 0 ||
    !Number.isInteger(byteCap)
  ) {
    return {
      valid: false,
      diagnostic: {
        code: 'UTF8_BYTE_LENGTH_INVALID_INPUT',
        message:
          `utf8_byte_length_max: byte_cap must be a positive integer; ` +
          `received ${typeof byteCap === 'number' ? byteCap : typeof byteCap}.`,
      },
    };
  }

  const actualBytes = Buffer.byteLength(value, 'utf8');
  if (actualBytes > byteCap) {
    return {
      valid: false,
      diagnostic: {
        code: 'UTF8_BYTE_LENGTH_EXCEEDED',
        message:
          `utf8_byte_length_max: UTF-8 byte length ${actualBytes} ` +
          `exceeds cap ${byteCap}. Note: a string with ${value.length} ` +
          `JS code units encodes to ${actualBytes} UTF-8 bytes — multi-byte ` +
          `characters (CJK, emoji) consume more than 1 byte each.`,
        actual_bytes: actualBytes,
        cap_bytes: byteCap,
      },
    };
  }

  return { valid: true };
}
