/**
 * LOCAL helpers for the separation-of-duties schemas (SDD §2, v8.8.0).
 *
 * Pure, total, non-throwing functions shared by
 * `validateIrreversibleActionAttestation` and
 * `validateSharedSurfaceDeclaration`. They are deliberately not
 * exported from any barrel: the public surface is the two schemas and
 * their cross-field validators.
 *
 * @since v8.8.0 — FR-C3 (PR-C3).
 */
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';

const ISO8601_UTC_REGEX = new RegExp(ISO8601_UTC_PATTERN);

/**
 * Compare two ISO 8601 UTC timestamps (`ISO8601_UTC_PATTERN` form) as
 * instants, exactly, at nanosecond precision.
 *
 * Both operands are split into the fixed-width 19-character
 * `YYYY-MM-DDTHH:MM:SS` prefix and an optional 1..9 digit fraction.
 * Prefixes compare lexicographically (fixed width, so lexicographic
 * order is chronological order); fractions are right-padded with zeros
 * to 9 digits and compared lexicographically. Mixed fractional
 * precision is therefore handled correctly: `00:00:00Z` and
 * `00:00:00.000Z` compare equal, and `00:00:00Z` is before
 * `00:00:00.5Z`. No calendar library, no `Date.parse`, no float — the
 * result is identical in every runtime.
 *
 * @returns `-1` when `a` is before `b`, `0` when equal, `1` when after;
 *   `null` when either operand is not a string matching
 *   `ISO8601_UTC_PATTERN` (the structural tier rejects such input
 *   before the cross-field tier runs).
 */
export function compareIso8601Utc(a: unknown, b: unknown): -1 | 0 | 1 | null {
  if (typeof a !== 'string' || typeof b !== 'string') return null;
  if (!ISO8601_UTC_REGEX.test(a) || !ISO8601_UTC_REGEX.test(b)) return null;
  const aPrefix = a.slice(0, 19);
  const bPrefix = b.slice(0, 19);
  if (aPrefix !== bPrefix) return aPrefix < bPrefix ? -1 : 1;
  const aFrac = fractionNanos(a);
  const bFrac = fractionNanos(b);
  if (aFrac === bFrac) return 0;
  return aFrac < bFrac ? -1 : 1;
}

function fractionNanos(ts: string): string {
  // ts matches ISO8601_UTC_PATTERN: either `...SSZ` or `...SS.fffZ`.
  if (ts.length === 20) return '000000000';
  return ts.slice(20, -1).padEnd(9, '0');
}

/**
 * Report every value that occurs more than once in a string array,
 * with the indices where it occurs. Non-string elements are ignored
 * (the structural tier rejects them first).
 */
export function duplicateStrings(
  values: unknown,
): Array<{ value: string; indices: number[] }> {
  if (!Array.isArray(values)) return [];
  const seen = new Map<string, number[]>();
  for (let i = 0; i < values.length; i += 1) {
    const v: unknown = values[i];
    if (typeof v !== 'string') continue;
    const list = seen.get(v);
    if (list) list.push(i);
    else seen.set(v, [i]);
  }
  const out: Array<{ value: string; indices: number[] }> = [];
  for (const [value, indices] of seen) {
    if (indices.length > 1) out.push({ value, indices });
  }
  return out;
}

/** Describe a non-object input for structural-precondition messages. */
export function describeNonObject(data: unknown): string {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  return typeof data;
}

/** True when `data` is a non-null, non-array object. */
export function isPlainRecord(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}
