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
import { AgentDescriptorSchema } from '../src/schemas/agent-descriptor.js';
import { AgentLifecycleStateSchema } from '../src/schemas/agent-lifecycle.js';
import { BillingEntrySchema, CreditNoteSchema } from '../src/schemas/billing-entry.js';
import { ConversationSchema, MessageSchema } from '../src/schemas/conversation.js';
import { TransferSpecSchema, TransferEventSchema } from '../src/schemas/transfer-spec.js';
import { DomainEventSchema, DomainEventBatchSchema } from '../src/schemas/domain-event.js';
import { LifecycleTransitionPayloadSchema } from '../src/schemas/lifecycle-event-payload.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../src/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'schemas');

const schemas = [
  { name: 'jwt-claims', schema: JwtClaimsSchema },
  { name: 's2s-jwt-claims', schema: S2SJwtClaimsSchema },
  { name: 'invoke-response', schema: InvokeResponseSchema },
  { name: 'usage-report', schema: UsageReportSchema },
  { name: 'stream-event', schema: StreamEventSchema },
  { name: 'routing-policy', schema: RoutingPolicySchema },
  // v2.0.0
  { name: 'agent-descriptor', schema: AgentDescriptorSchema },
  { name: 'agent-lifecycle-state', schema: AgentLifecycleStateSchema },
  { name: 'billing-entry', schema: BillingEntrySchema },
  { name: 'credit-note', schema: CreditNoteSchema },
  { name: 'conversation', schema: ConversationSchema },
  { name: 'message', schema: MessageSchema },
  { name: 'transfer-spec', schema: TransferSpecSchema },
  { name: 'transfer-event', schema: TransferEventSchema },
  { name: 'domain-event', schema: DomainEventSchema },
  // v2.1.0
  { name: 'domain-event-batch', schema: DomainEventBatchSchema },
  { name: 'lifecycle-transition-payload', schema: LifecycleTransitionPayloadSchema },
];

mkdirSync(outDir, { recursive: true });

for (const { name, schema } of schemas) {
  const jsonSchema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...schema,
    // Override TypeBox $id with versioned URI (must come after spread)
    $id: `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}`,
    $comment: `contract_version=${CONTRACT_VERSION}, min_supported=${MIN_SUPPORTED_VERSION}`,
  };

  // Inject cross-field validation for ConversationSealingPolicy (BB-V3-008).
  // JSON Schema 2020-12 if/then expresses the invariant that Go/Python
  // validators can enforce natively without reading TypeScript source.
  if (name === 'conversation') {
    const props = jsonSchema.properties as Record<string, unknown> | undefined;
    if (props?.sealing_policy) {
      const sp = props.sealing_policy as Record<string, unknown>;
      // Preserve existing $comment from TypeBox schema options
      sp.if = {
        properties: { encryption_scheme: { not: { const: 'none' } } },
        required: ['encryption_scheme'],
      };
      sp.then = {
        required: ['key_reference'],
        properties: {
          key_derivation: { not: { const: 'none' } },
        },
      };
    }
  }

  const path = join(outDir, `${name}.schema.json`);
  writeFileSync(path, JSON.stringify(jsonSchema, null, 2) + '\n');
  console.log(`Generated: ${path}`);
}

console.log(`\n${schemas.length} schemas generated.`);

// Generate schemas/index.json — machine-readable schema registry
const index = {
  $schema: 'https://schemas.0xhoneyjar.com/loa-hounfour/index',
  version: CONTRACT_VERSION,
  min_supported_version: MIN_SUPPORTED_VERSION,
  generated_at: new Date().toISOString(),
  schemas: schemas.map(({ name, schema }) => ({
    name,
    $id: `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}`,
    file: `${name}.schema.json`,
    description: (schema as Record<string, unknown>).description ?? schema.$id ?? name,
  })),
};

const indexPath = join(outDir, 'index.json');
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`Generated: ${indexPath}`);

// Generate schemas/README.md — human-readable schema catalog
const readmeLines = [
  '# Schema Registry',
  '',
  `**Contract version:** ${CONTRACT_VERSION}`,
  `**Min supported:** ${MIN_SUPPORTED_VERSION}`,
  `**Schemas:** ${schemas.length}`,
  '',
  '## Schemas',
  '',
  '| Schema | $id | File |',
  '|--------|-----|------|',
  ...schemas.map(({ name }) =>
    `| ${name} | \`https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}\` | [${name}.schema.json](${name}.schema.json) |`,
  ),
  '',
  '## Usage',
  '',
  '```bash',
  '# Fetch a schema by $id',
  `curl https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/billing-entry`,
  '```',
  '',
  '## Programmatic Access',
  '',
  '```ts',
  "import index from './index.json';",
  "// index.schemas[0].$id → 'https://schemas.0xhoneyjar.com/loa-hounfour/...'",
  '```',
  '',
  `> Generated by \`npm run schema:generate\` — do not edit manually.`,
  '',
];

const readmePath = join(outDir, 'README.md');
writeFileSync(readmePath, readmeLines.join('\n'));
console.log(`Generated: ${readmePath}`);
