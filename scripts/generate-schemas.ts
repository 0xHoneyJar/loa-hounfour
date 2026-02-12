/**
 * Generate JSON Schema 2020-12 files from TypeBox definitions.
 *
 * Outputs to schemas/ directory for cross-language consumption.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
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

mkdirSync(outDir, { recursive: true });

for (const { name, schema } of schemas) {
  const jsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...schema,
  };
  const path = join(outDir, `${name}.schema.json`);
  writeFileSync(path, JSON.stringify(jsonSchema, null, 2) + '\n');
  console.log(`Generated: ${path}`);
}

console.log(`\n${schemas.length} schemas generated.`);
