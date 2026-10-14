/**
 * `array_contains` and `array_values_distinct` LOCAL constraint builtins
 * (v8.8.0, FR-C3 / PR-C3).
 *
 * Pure-shape checks over arrays of primitive values (strings, numbers,
 * booleans, null). They exist so that list-membership and list-
 * distinctness rules on string arrays — for example
 * `SharedSurfaceDeclaration` SSD-1 (owner is a writer) and SSD-3 / SSD-4
 * (distinct writer and reader lists) — can be written in the constraint
 * DSL rather than in prose. `unique_values(array, field)` covers arrays
 * of objects keyed by a field; it is vacuously true on arrays of
 * primitives, so it cannot express SSD-3 / SSD-4.
 *
 * **Equality** is strict equality on primitives (`===`; for strings,
 * exact code-unit equality with no normalisation). Object and array
 * elements never compare equal to anything; `array_values_distinct`
 * fails closed when one is present, because primitive distinctness is
 * not defined for them.
 *
 * **Cross-runner equivalents**: Go `slices.Contains` / a
 * `map[string]struct{}` size check; Python `value in arr` /
 * `len(set(arr)) == len(arr)`; Rust `iter().any` / a `HashSet` size
 * check. All agree for arrays of JSON primitives.
 *
 * @since v8.8.0 — FR-C3 (PR-C3)
 */
/**
 * True when `array` is an array containing an element strictly equal to
 * `value`, where `value` is a JSON primitive. False otherwise
 * (non-array `array`, non-primitive `value`, or no match).
 */
export declare function evaluateArrayContains(array: unknown, value: unknown): boolean;
/**
 * True when `array` is an array of JSON primitives with no two elements
 * strictly equal. The empty array is distinct. False for a non-array
 * input or when any element is an object or array.
 */
export declare function evaluateArrayValuesDistinct(array: unknown): boolean;
//# sourceMappingURL=array-membership.d.ts.map