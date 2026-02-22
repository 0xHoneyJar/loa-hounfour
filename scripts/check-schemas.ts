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
import { AgentDescriptorSchema } from '../src/schemas/agent-descriptor.js';
import { AgentLifecycleStateSchema } from '../src/schemas/agent-lifecycle.js';
import { BillingEntrySchema, CreditNoteSchema } from '../src/schemas/billing-entry.js';
import { ConversationSchema, MessageSchema } from '../src/schemas/conversation.js';
import { TransferSpecSchema, TransferEventSchema } from '../src/schemas/transfer-spec.js';
import { DomainEventSchema, DomainEventBatchSchema } from '../src/schemas/domain-event.js';
import { LifecycleTransitionPayloadSchema } from '../src/schemas/lifecycle-event-payload.js';
import { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema } from '../src/schemas/capability.js';
import { ProtocolDiscoverySchema } from '../src/schemas/discovery.js';
import { SagaContextSchema } from '../src/schemas/saga-context.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../src/version.js';
import { postProcessSchema } from './schema-postprocess.js';

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
  // v2.2.0
  { name: 'capability', schema: CapabilitySchema },
  { name: 'capability-query', schema: CapabilityQuerySchema },
  { name: 'capability-response', schema: CapabilityResponseSchema },
  { name: 'protocol-discovery', schema: ProtocolDiscoverySchema },
  { name: 'saga-context', schema: SagaContextSchema },
];

let stale = false;

for (const { name, schema } of schemas) {
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
    console.log(`OK: ${path}`);
  }
}

if (stale) {
  console.error('\nSchemas are stale. Run: npm run schema:generate');
  process.exit(1);
}

console.log(`\nAll ${schemas.length} schemas up to date.`);
