/**
 * Constraint namespace validation utilities.
 *
 * Detects collisions between constraint field names and the evaluator's
 * reserved namespace. When a schema field name matches a builtin function
 * name (e.g., `now`, `type_of`), the evaluator will call the builtin
 * instead of resolving the field — a silent correctness bug.
 *
 * @see DR-F4 — Namespace collision surface (40+ builtins)
 * @since v7.8.0 (Sprint 1)
 */
import { RESERVED_EVALUATOR_NAMES } from '../constraints/evaluator.js';
/**
 * Detect reserved name collisions between schema field names and evaluator builtins.
 *
 * Returns an array of collisions. An empty array means no collisions detected.
 *
 * @param fields - Array of field names to check
 * @param source - Identifier for the schema/context being checked (for diagnostics)
 * @returns Array of detected collisions
 */
export function detectReservedNameCollisions(fields, source) {
    const collisions = [];
    for (const field of fields) {
        if (RESERVED_EVALUATOR_NAMES.has(field)) {
            collisions.push({ field, source });
        }
    }
    return collisions;
}
//# sourceMappingURL=constraint-validation.js.map