/**
 * Verify that MIGRATION.md additionalProperties table matches actual schemas.
 *
 * Reads all TypeBox schemas, extracts their $id and additionalProperties values,
 * and checks that the MIGRATION.md table is complete and accurate.
 *
 * @see BB-C4-M001 — MIGRATION.md drift detection
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AgentDescriptorSchema } from '../src/schemas/agent-descriptor.js';
import { AgentLifecycleStateSchema } from '../src/schemas/agent-lifecycle.js';
import { BillingEntrySchema, CreditNoteSchema, BillingRecipientSchema } from '../src/schemas/billing-entry.js';
import { ConversationSchema, MessageSchema, ConversationSealingPolicySchema } from '../src/schemas/conversation.js';
import { TransferSpecSchema, TransferEventSchema } from '../src/schemas/transfer-spec.js';
import { DomainEventSchema, DomainEventBatchSchema } from '../src/schemas/domain-event.js';
import { LifecycleTransitionPayloadSchema } from '../src/schemas/lifecycle-event-payload.js';
import { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema } from '../src/schemas/capability.js';
import { ProtocolDiscoverySchema } from '../src/schemas/discovery.js';
import { SagaContextSchema } from '../src/schemas/saga-context.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// All object schemas with their $id and additionalProperties setting
const objectSchemas = [
  AgentDescriptorSchema,
  BillingEntrySchema,
  BillingRecipientSchema,
  CreditNoteSchema,
  ConversationSchema,
  ConversationSealingPolicySchema,
  MessageSchema,
  TransferSpecSchema,
  TransferEventSchema,
  DomainEventSchema,
  DomainEventBatchSchema,
  SagaContextSchema,
  LifecycleTransitionPayloadSchema,
  CapabilitySchema,
  CapabilityQuerySchema,
  CapabilityResponseSchema,
  ProtocolDiscoverySchema,
];

// Read MIGRATION.md
const migrationPath = join(__dirname, '..', 'MIGRATION.md');
const migration = readFileSync(migrationPath, 'utf8');

let errors = 0;

// Check each schema
for (const schema of objectSchemas) {
  const id = (schema as Record<string, unknown>).$id as string | undefined;
  if (!id) continue;

  const ap = (schema as Record<string, unknown>).additionalProperties;
  const policy = ap === false ? 'strict' : ap === true ? 'extensible' : 'unset';

  // Check that the $id appears in the correct section of MIGRATION.md
  if (policy === 'strict') {
    // Should appear in the strict table
    if (!migration.includes(`| \`${id}\``) || !migration.includes('additionalProperties: false')) {
      // More lenient: just check the $id appears somewhere in the strict section
      const strictSection = migration.split('#### Extensible Schemas')[0];
      if (strictSection && !strictSection.includes(id)) {
        console.error(`MISSING FROM STRICT TABLE: ${id} (additionalProperties: false)`);
        errors++;
      }
    }
  } else if (policy === 'extensible') {
    const extensibleSection = migration.split('#### Extensible Schemas')[1]?.split('####')[0] ?? '';
    if (!extensibleSection.includes(id)) {
      console.error(`MISSING FROM EXTENSIBLE TABLE: ${id} (additionalProperties: true)`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} schema(s) missing from MIGRATION.md. Update the additionalProperties table.`);
  process.exit(1);
}

console.log(`All ${objectSchemas.length} object schemas verified in MIGRATION.md.`);
