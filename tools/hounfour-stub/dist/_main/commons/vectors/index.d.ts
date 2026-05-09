import type { VectorManifest, VectorManifestEntry } from './manifest-schema.js';
export { VectorManifestSchema, VectorManifestEntrySchema } from './manifest-schema.js';
export type { VectorManifest, VectorManifestEntry } from './manifest-schema.js';
/**
 * Load the vector manifest.
 *
 * @returns Parsed VectorManifest
 * @throws If manifest.json does not exist or is invalid JSON
 */
export declare function loadManifest(): VectorManifest;
/**
 * Load a single conformance vector by its vector_id.
 *
 * @param vectorId - The vector_id to load
 * @returns Parsed vector JSON object
 * @throws If vector not found in manifest or file does not exist
 */
export declare function loadVector(vectorId: string): Record<string, unknown>;
/**
 * List vectors, optionally filtered by category or layer.
 *
 * @param options - Filter options
 * @returns Matching manifest entries
 */
export declare function listVectors(options?: {
    category?: string;
    layer?: 1 | 2;
}): VectorManifestEntry[];
//# sourceMappingURL=index.d.ts.map