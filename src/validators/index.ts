/**
 * Schema validators with compile cache.
 *
 * Uses TypeBox TypeCompiler for fast runtime validation.
 * Compiled validators are cached on first use.
 *
 * @see SDD 4.1 — Schema Validation
 */
import { TypeCompiler, type TypeCheck } from '@sinclair/typebox/compiler';
import { type TSchema, FormatRegistry } from '@sinclair/typebox';

// Register string formats so TypeCompiler validates them at runtime.
// ISO 8601 date-time (simplified check — full ISO parsing delegated to consumers).
if (!FormatRegistry.Has('date-time')) {
  FormatRegistry.Set('date-time', (v) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v),
  );
}
if (!FormatRegistry.Has('uri')) {
  FormatRegistry.Set('uri', (v) => /^https?:\/\/.+/.test(v));
}
import { JwtClaimsSchema, S2SJwtClaimsSchema } from '../schemas/jwt-claims.js';
import { InvokeResponseSchema, UsageReportSchema } from '../schemas/invoke-response.js';
import { StreamEventSchema } from '../schemas/stream-events.js';
import { RoutingPolicySchema } from '../schemas/routing-policy.js';
import { AgentDescriptorSchema } from '../schemas/agent-descriptor.js';
import { BillingEntrySchema, CreditNoteSchema } from '../schemas/billing-entry.js';
import { ConversationSchema, MessageSchema, ConversationSealingPolicySchema } from '../schemas/conversation.js';
import { TransferSpecSchema, TransferEventSchema } from '../schemas/transfer-spec.js';
import { DomainEventSchema, DomainEventBatchSchema } from '../schemas/domain-event.js';
import { LifecycleTransitionPayloadSchema } from '../schemas/lifecycle-event-payload.js';

// Compile cache — lazily populated on first use
const cache = new Map<string, TypeCheck<TSchema>>();

function getOrCompile<T extends TSchema>(schema: T): TypeCheck<T> {
  const id = schema.$id ?? JSON.stringify(schema);
  let compiled = cache.get(id);
  if (!compiled) {
    compiled = TypeCompiler.Compile(schema);
    cache.set(id, compiled);
  }
  return compiled as TypeCheck<T>;
}

/**
 * Validate data against a schema.
 * Returns { valid: true } or { valid: false, errors: [...] }.
 */
export function validate<T extends TSchema>(
  schema: T,
  data: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  const compiled = getOrCompile(schema);
  if (compiled.Check(data)) {
    return { valid: true };
  }
  const errors = [...compiled.Errors(data)].map(
    (e) => `${e.path}: ${e.message}`,
  );
  return { valid: false, errors };
}

// Pre-built validators for common schemas
export const validators = {
  jwtClaims: () => getOrCompile(JwtClaimsSchema),
  s2sJwtClaims: () => getOrCompile(S2SJwtClaimsSchema),
  invokeResponse: () => getOrCompile(InvokeResponseSchema),
  usageReport: () => getOrCompile(UsageReportSchema),
  streamEvent: () => getOrCompile(StreamEventSchema),
  routingPolicy: () => getOrCompile(RoutingPolicySchema),

  // v2.0.0
  agentDescriptor: () => getOrCompile(AgentDescriptorSchema),
  billingEntry: () => getOrCompile(BillingEntrySchema),
  creditNote: () => getOrCompile(CreditNoteSchema),
  conversation: () => getOrCompile(ConversationSchema),
  message: () => getOrCompile(MessageSchema),
  conversationSealingPolicy: () => getOrCompile(ConversationSealingPolicySchema),
  transferSpec: () => getOrCompile(TransferSpecSchema),
  transferEvent: () => getOrCompile(TransferEventSchema),
  domainEvent: () => getOrCompile(DomainEventSchema),

  // v2.1.0
  domainEventBatch: () => getOrCompile(DomainEventBatchSchema),
  lifecycleTransitionPayload: () => getOrCompile(LifecycleTransitionPayloadSchema),
} as const;
