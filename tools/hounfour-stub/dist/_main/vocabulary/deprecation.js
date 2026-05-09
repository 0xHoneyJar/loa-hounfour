/**
 * Deprecation registry for schema lifecycle management.
 *
 * Tracks schemas that are deprecated with migration guidance, removal targets,
 * and optional replacement references.
 *
 * @see S4-T4 — v4.6.0 Formalization Release
 */
export const DEPRECATION_REGISTRY = [];
/**
 * Returns the schema_id of all deprecated schemas.
 */
export function getDeprecatedSchemas(registry = DEPRECATION_REGISTRY) {
    return registry.map(e => e.schema_id);
}
/**
 * Check whether a given schema_id is deprecated.
 */
export function isDeprecated(schemaId, registry = DEPRECATION_REGISTRY) {
    return registry.some(e => e.schema_id === schemaId);
}
//# sourceMappingURL=deprecation.js.map