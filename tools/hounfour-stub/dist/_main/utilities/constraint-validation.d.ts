export interface NameCollision {
    /** The field name that collides with a reserved evaluator name. */
    field: string;
    /** The schema or context where the collision was detected. */
    source: string;
}
/**
 * Detect reserved name collisions between schema field names and evaluator builtins.
 *
 * Returns an array of collisions. An empty array means no collisions detected.
 *
 * @param fields - Array of field names to check
 * @param source - Identifier for the schema/context being checked (for diagnostics)
 * @returns Array of detected collisions
 */
export declare function detectReservedNameCollisions(fields: readonly string[], source: string): NameCollision[];
//# sourceMappingURL=constraint-validation.d.ts.map