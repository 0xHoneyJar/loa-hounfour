/**
 * Conformance vector loader — programmatic access to test vectors.
 *
 * Provides `loadManifest()`, `loadVector()`, and `listVectors()` for
 * cross-language consumers to discover and use conformance vectors.
 *
 * @see SDD §4.12 — Conformance Vector Distribution (FR-4)
 * @since v8.0.0
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VectorManifest, VectorManifestEntry } from './manifest-schema.js';

export { VectorManifestSchema, VectorManifestEntrySchema } from './manifest-schema.js';
export type { VectorManifest, VectorManifestEntry } from './manifest-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_ROOT = join(__dirname, '..', '..', '..', 'vectors');
const MANIFEST_PATH = join(VECTORS_ROOT, 'manifest.json');

/**
 * Load the vector manifest.
 *
 * @returns Parsed VectorManifest
 * @throws If manifest.json does not exist or is invalid JSON
 */
export function loadManifest(): VectorManifest {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Vector manifest not found at ${MANIFEST_PATH}. Run "npm run vectors:manifest" to generate.`,
    );
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as VectorManifest;
}

/**
 * Load a single conformance vector by its vector_id.
 *
 * @param vectorId - The vector_id to load
 * @returns Parsed vector JSON object
 * @throws If vector not found in manifest or file does not exist
 */
export function loadVector(vectorId: string): Record<string, unknown> {
  const manifest = loadManifest();
  const entry = manifest.vectors.find((v) => v.vector_id === vectorId);
  if (!entry) {
    throw new Error(`Vector "${vectorId}" not found in manifest.`);
  }
  const vectorPath = join(VECTORS_ROOT, entry.path);
  if (!existsSync(vectorPath)) {
    throw new Error(`Vector file not found: ${vectorPath}`);
  }
  return JSON.parse(readFileSync(vectorPath, 'utf-8')) as Record<string, unknown>;
}

/**
 * List vectors, optionally filtered by category or layer.
 *
 * @param options - Filter options
 * @returns Matching manifest entries
 */
export function listVectors(options?: {
  category?: string;
  layer?: 1 | 2;
}): VectorManifestEntry[] {
  const manifest = loadManifest();
  let entries = manifest.vectors;

  if (options?.category) {
    entries = entries.filter((v) => v.category === options.category);
  }
  if (options?.layer !== undefined) {
    entries = entries.filter((v) => v.layer === options.layer);
  }

  return entries;
}
