/**
 * Generate vectors/manifest.json from all conformance vector files.
 *
 * Scans vectors/conformance/ recursively, reads each .json vector file,
 * and produces a VectorManifest with metadata for cross-language consumers.
 *
 * Usage: tsx scripts/generate-manifest.ts
 *
 * @since v8.0.0
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_VERSION } from '../src/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_ROOT = join(__dirname, '..', 'vectors');
const CONFORMANCE_ROOT = join(VECTORS_ROOT, 'conformance');
const MANIFEST_PATH = join(VECTORS_ROOT, 'manifest.json');

interface VectorEntry {
  vector_id: string;
  category: string;
  path: string;
  layer: 1 | 2;
  description: string;
  contract_version: string;
  expected_valid: boolean;
}

function findVectorFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findVectorFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

function inferLayer(vector: Record<string, unknown>): 1 | 2 {
  // Layer 2 vectors have constraint expressions or evaluation context
  if (vector.constraint_expression || vector.expression || vector.evaluation_context) {
    return 2;
  }
  // Default to layer 1 (schema validation)
  const layer = vector.layer;
  if (layer === 1 || layer === 2) return layer;
  return 1;
}

function inferCategory(filePath: string): string {
  // Path: vectors/conformance/<category>/[subcategory/]<file>.json
  const rel = relative(CONFORMANCE_ROOT, filePath);
  const parts = rel.split('/');
  // Category is the first directory component
  return parts[0];
}

const files = findVectorFiles(CONFORMANCE_ROOT);
const vectors: VectorEntry[] = [];

for (const file of files) {
  const raw = JSON.parse(readFileSync(file, 'utf-8'));
  const relPath = relative(VECTORS_ROOT, file);
  const category = inferCategory(file);

  vectors.push({
    vector_id: raw.vector_id || `auto-${relPath.replace(/[/\\]/g, '-').replace('.json', '')}`,
    category,
    path: relPath,
    layer: inferLayer(raw),
    description: raw.description || `Conformance vector: ${relPath}`,
    contract_version: raw.contract_version || CONTRACT_VERSION,
    expected_valid: raw.expected_valid ?? true,
  });
}

const manifest = {
  manifest_version: '1.0.0' as const,
  generated_at: new Date().toISOString(),
  contract_version: CONTRACT_VERSION,
  total_vectors: vectors.length,
  vectors,
};

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Generated manifest with ${vectors.length} vectors at ${MANIFEST_PATH}`);
