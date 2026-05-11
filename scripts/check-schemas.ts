/**
 * Verify that generated JSON Schema files are up to date.
 * Exit 1 if any schema is stale (needs regeneration).
 *
 * **Single-source-of-truth refactor** (PR-A4.1 iter-3 + PR-A4.4 iter-3
 * lesson): this script previously maintained its own 22-entry SCHEMAS
 * array while `scripts/generate-schemas.ts` had 262. The divergence
 * allowed cycle-005 + cycle-007 schemas to drift silently between
 * TypeBox source and the published artifact, surfacing as bridge
 * HIGH_CONSENSUS findings only at the multi-model PR review tier.
 * The script now imports `SCHEMAS` from `generate-schemas.ts` so the
 * pre-commit `npm run schema:check` covers the full published
 * artifact surface.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCHEMAS } from './generate-schemas.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../src/version.js';
import { postProcessSchema } from './schema-postprocess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'schemas');

let stale = false;

for (const { name, schema } of SCHEMAS) {
  const path = join(outDir, `${name}.schema.json`);
  const jsonSchema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...schema,
    $id: `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}`,
    $comment: (schema as Record<string, unknown>).$comment
      ? `contract_version=${CONTRACT_VERSION}, min_supported=${MIN_SUPPORTED_VERSION}. ${(schema as Record<string, unknown>).$comment}`
      : `contract_version=${CONTRACT_VERSION}, min_supported=${MIN_SUPPORTED_VERSION}`,
  };

  // Apply same post-generation transforms as generate-schemas.ts
  postProcessSchema(name, jsonSchema);

  const expected = JSON.stringify(jsonSchema, null, 2) + '\n';

  if (!existsSync(path)) {
    console.error(`MISSING: ${path}`);
    stale = true;
    continue;
  }

  const actual = readFileSync(path, 'utf8');
  if (actual !== expected) {
    console.error(`STALE: ${path}`);
    stale = true;
  } else {
    // Suppressed per-schema OK log for the 262-entry surface; only
    // STALE / MISSING lines and the final tally are emitted to keep
    // CI output manageable.
  }
}

if (stale) {
  console.error('\nSchemas are stale. Run: npm run schema:generate');
  process.exit(1);
}

console.log(`All ${SCHEMAS.length} schemas up to date.`);
