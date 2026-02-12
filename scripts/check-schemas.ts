/**
 * Verify that generated JSON Schema files are up to date.
 * Exit 1 if any schema is stale (needs regeneration).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JwtClaimsSchema, S2SJwtClaimsSchema } from '../src/schemas/jwt-claims.js';
import { InvokeResponseSchema, UsageReportSchema } from '../src/schemas/invoke-response.js';
import { StreamEventSchema } from '../src/schemas/stream-events.js';
import { RoutingPolicySchema } from '../src/schemas/routing-policy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'schemas');

const schemas = [
  { name: 'jwt-claims', schema: JwtClaimsSchema },
  { name: 's2s-jwt-claims', schema: S2SJwtClaimsSchema },
  { name: 'invoke-response', schema: InvokeResponseSchema },
  { name: 'usage-report', schema: UsageReportSchema },
  { name: 'stream-event', schema: StreamEventSchema },
  { name: 'routing-policy', schema: RoutingPolicySchema },
];

let stale = false;

for (const { name, schema } of schemas) {
  const path = join(outDir, `${name}.schema.json`);
  const expected = JSON.stringify(
    { $schema: 'https://json-schema.org/draft/2020-12/schema', ...schema },
    null,
    2,
  ) + '\n';

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
    console.log(`OK: ${path}`);
  }
}

if (stale) {
  console.error('\nSchemas are stale. Run: npm run schema:generate');
  process.exit(1);
}

console.log(`\nAll ${schemas.length} schemas up to date.`);
