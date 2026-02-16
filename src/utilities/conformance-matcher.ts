import type { MatchingRules } from '../schemas/model/conformance-vector.js';

export interface MatchResult {
  matched: boolean;
  reason?: string;
  mismatches?: Array<{ path: string; expected: unknown; actual: unknown }>;
}

/**
 * Match conformance output against expected output using matching rules.
 *
 * Implements SDD §5.3 — field selection, deep equality, volatile fields,
 * numeric tolerance, canonicalization, null-vs-absent handling.
 *
 * Error contracts (IMP-004): Returns { matched: false, reason } for
 * unsupported JSON types. Never throws.
 */
export function matchConformanceOutput(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  rules?: MatchingRules,
): MatchResult {
  try {
    const mismatches: Array<{ path: string; expected: unknown; actual: unknown }> = [];

    // Determine which fields to compare
    let fieldsToCompare: string[];
    if (rules?.select_fields?.length) {
      fieldsToCompare = rules.select_fields;
    } else {
      fieldsToCompare = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
    }

    // Remove volatile fields
    if (rules?.volatile_fields?.length) {
      fieldsToCompare = fieldsToCompare.filter(
        (f) => !rules.volatile_fields!.includes(f),
      );
    }

    for (const field of fieldsToCompare) {
      const exp = expected[field];
      const act = actual[field];

      if (!deepEqual(exp, act, rules)) {
        mismatches.push({ path: field, expected: exp, actual: act });
      }
    }

    if (mismatches.length > 0) {
      return {
        matched: false,
        reason: `${mismatches.length} field(s) did not match: ${mismatches.map((m) => m.path).join(', ')}`,
        mismatches,
      };
    }

    return { matched: true };
  } catch (err) {
    return {
      matched: false,
      reason: `Matching error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Deep equality comparison with matching rule support.
 */
function deepEqual(
  a: unknown,
  b: unknown,
  rules?: MatchingRules,
): boolean {
  // null-vs-absent handling
  if (a === undefined && b === null) {
    return rules?.null_handling !== 'strict';
  }
  if (a === null && b === undefined) {
    return rules?.null_handling !== 'strict';
  }

  // Guard unsupported numeric types before identity check (IMP-004)
  if (typeof a === 'number' && (Number.isNaN(a) || !Number.isFinite(a))) return false;
  if (typeof b === 'number' && (Number.isNaN(b) || !Number.isFinite(b))) return false;

  // Identical references or primitives
  if (a === b) return true;

  // Both null or both undefined
  if (a == null && b == null) return true;

  // Type mismatch
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  // String comparison with optional canonicalization
  if (typeof a === 'string' && typeof b === 'string') {
    if (rules?.canonicalize_strings) {
      return a.trim().toLowerCase() === b.trim().toLowerCase();
    }
    return a === b;
  }

  // Number comparison with optional tolerance
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) || Number.isNaN(b)) {
      // NaN is unsupported — return false per IMP-004
      return false;
    }
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      // Infinity is unsupported — return false per IMP-004
      return false;
    }
    if (rules?.numeric_tolerance !== undefined) {
      return Math.abs(a - b) <= rules.numeric_tolerance;
    }
    return a === b;
  }

  // Boolean comparison
  if (typeof a === 'boolean') return a === b;

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i], rules));
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const allKeys = [...new Set([...Object.keys(aObj), ...Object.keys(bObj)])];

    for (const key of allKeys) {
      const aVal = aObj[key];
      const bVal = bObj[key];

      // Handle absent vs present null
      if (!(key in aObj) && key in bObj) {
        if (bVal === null && rules?.null_handling !== 'strict') continue;
        return false;
      }
      if (key in aObj && !(key in bObj)) {
        if (aVal === null && rules?.null_handling !== 'strict') continue;
        return false;
      }

      if (!deepEqual(aVal, bVal, rules)) return false;
    }
    return true;
  }

  return false;
}
