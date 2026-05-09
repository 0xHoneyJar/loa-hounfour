export type CanonicalSizeCapErrorCode = 'CANONICAL_SIZE_CAP_EXCEEDED' | 'CANONICAL_SIZE_CAP_INVALID_INPUT';
export interface CanonicalSizeCapDiagnostic {
    code: CanonicalSizeCapErrorCode;
    message: string;
    /** Actual byte length (when known). */
    actual_bytes?: number;
    /** Configured cap. */
    cap_bytes?: number;
}
export interface EvaluateCanonicalSizeCapResult {
    valid: boolean;
    diagnostic?: CanonicalSizeCapDiagnostic;
}
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseCanonicalSizeCap()` returns a
 * boolean; direct callers wanting the structured diagnostic should
 * use this entry point.
 *
 * Argument shape (DSL surface):
 *   `canonical_size_cap(value, byte_cap)`
 *
 * @param value - The value whose canonical-JSON form is bounded.
 * @param byteCap - Cap in bytes (default 4096 per NFR-4). When the
 *                  schema declares `'x-canonical-size-cap-bytes'` in
 *                  its TypeBox metadata, that value is the
 *                  authoritative cap; the constraint file passes it
 *                  through to this builtin.
 */
export declare function evaluateCanonicalSizeCap(value: unknown, byteCap?: number): EvaluateCanonicalSizeCapResult;
//# sourceMappingURL=canonical-size-cap.d.ts.map