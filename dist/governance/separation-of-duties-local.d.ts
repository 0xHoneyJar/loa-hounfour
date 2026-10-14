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
export declare function compareIso8601Utc(a: unknown, b: unknown): -1 | 0 | 1 | null;
/**
 * Report every value that occurs more than once in a string array,
 * with the indices where it occurs. Non-string elements are ignored
 * (the structural tier rejects them first).
 */
export declare function duplicateStrings(values: unknown): Array<{
    value: string;
    indices: number[];
}>;
/** Describe a non-object input for structural-precondition messages. */
export declare function describeNonObject(data: unknown): string;
/** True when `data` is a non-null, non-array object. */
export declare function isPlainRecord(data: unknown): data is Record<string, unknown>;
//# sourceMappingURL=separation-of-duties-local.d.ts.map