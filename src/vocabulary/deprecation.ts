/**
 * Deprecation registry for schema lifecycle management.
 *
 * Tracks schemas that are deprecated with migration guidance, removal targets,
 * and optional replacement references.
 *
 * @see S4-T4 — v4.6.0 Formalization Release
 */

export interface DeprecationEntry {
  schema_id: string;
  deprecated_in: string;
  removal_target: string;
  migration_guide: string;
  replacement?: string;
}

export const DEPRECATION_REGISTRY: readonly DeprecationEntry[] = [];

/**
 * Returns the schema_id of all deprecated schemas.
 */
export function getDeprecatedSchemas(registry: readonly DeprecationEntry[] = DEPRECATION_REGISTRY): string[] {
  return registry.map(e => e.schema_id);
}

/**
 * Check whether a given schema_id is deprecated.
 */
export function isDeprecated(schemaId: string, registry: readonly DeprecationEntry[] = DEPRECATION_REGISTRY): boolean {
  return registry.some(e => e.schema_id === schemaId);
}
