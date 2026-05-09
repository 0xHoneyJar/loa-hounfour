/**
 * Cross-language constraint file format.
 *
 * Constraint files encode the same cross-field invariants as TypeScript validators
 * in a language-agnostic JSON format. Non-TypeScript consumers can parse these
 * files and enforce the same rules.
 *
 * @see FR-4 v4.6.0 — Cross-Language Constraints
 */
/**
 * Check whether a constraint file's expression_version is supported by the
 * current evaluator. v1.x expressions are backward-compatible with v2.0+.
 * v2.x expressions require a v2.0+ evaluator.
 *
 * @param version - Expression version string (e.g. '1.0', '2.0')
 * @returns true if the current evaluator supports this version
 */
/**
 * All expression grammar versions supported by the current evaluator.
 * Used by protocol-discovery to advertise compatibility during version negotiation.
 */
// Note: evaluation_geometry (v7.11.0) is a constraint-level field independent of
// expression grammar version. A constraint with evaluation_geometry: "native" can
// appear in any expression_version file — the field controls evaluation strategy,
// not grammar compatibility.
export const EXPRESSION_VERSIONS_SUPPORTED = ['1.0', '2.0'];
export function expressionVersionSupported(version) {
    const [major] = version.split('.').map(Number);
    // Current evaluator is v2.0 — supports 1.x and 2.x
    return major >= 1 && major <= 2;
}
//# sourceMappingURL=types.js.map