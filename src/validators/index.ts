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
import { ConversationSchema, MessageSchema, ConversationSealingPolicySchema, AccessPolicySchema } from '../schemas/conversation.js';
import { TransferSpecSchema, TransferEventSchema } from '../schemas/transfer-spec.js';
import { DomainEventSchema, DomainEventBatchSchema } from '../schemas/domain-event.js';
import { LifecycleTransitionPayloadSchema } from '../schemas/lifecycle-event-payload.js';
import { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema } from '../schemas/capability.js';
import { ProtocolDiscoverySchema } from '../schemas/discovery.js';
import { SagaContextSchema } from '../schemas/saga-context.js';
import { HealthStatusSchema } from '../schemas/health-status.js';
import { ThinkingTraceSchema } from '../schemas/thinking-trace.js';
import { ToolCallSchema } from '../schemas/tool-call.js';

// Compile cache — lazily populated on first use.
// Only caches schemas with $id to prevent unbounded growth from
// consumer-supplied schemas (BB-V3-003).
const cache = new Map<string, TypeCheck<TSchema>>();

function getOrCompile<T extends TSchema>(schema: T): TypeCheck<T> {
  const id = schema.$id;
  if (id) {
    let compiled = cache.get(id);
    if (!compiled) {
      compiled = TypeCompiler.Compile(schema);
      cache.set(id, compiled);
    }
    return compiled as TypeCheck<T>;
  }
  // Non-$id schemas are compiled per-call (no caching) to prevent
  // unbounded cache growth from arbitrary consumer schemas.
  return TypeCompiler.Compile(schema) as TypeCheck<T>;
}

/**
 * Cross-field validator function signature.
 * Returns errors and warnings for cross-field invariant violations.
 */
export type CrossFieldValidator = (data: unknown) => {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Registry of cross-field validators keyed by schema $id.
 * When a schema $id matches, the validator runs after schema validation.
 */
const crossFieldRegistry = new Map<string, CrossFieldValidator>();

/**
 * Register a cross-field validator for a schema.
 * Used internally to wire cross-field checks into the main pipeline.
 */
export function registerCrossFieldValidator(schemaId: string, validator: CrossFieldValidator): void {
  crossFieldRegistry.set(schemaId, validator);
}

// Wire built-in cross-field validators (BB-C4-ADV-003)
import { validateSealingPolicy, validateAccessPolicy } from '../schemas/conversation.js';
import { validateBillingEntry } from '../utilities/billing.js';

registerCrossFieldValidator('ConversationSealingPolicy', (data) => {
  return validateSealingPolicy(data as Parameters<typeof validateSealingPolicy>[0]);
});
registerCrossFieldValidator('AccessPolicy', (data) => {
  return validateAccessPolicy(data as Parameters<typeof validateAccessPolicy>[0]);
});
registerCrossFieldValidator('BillingEntry', (data) => {
  const result = validateBillingEntry(data as Parameters<typeof validateBillingEntry>[0]);
  if (!result.valid) {
    return { valid: false, errors: [result.reason], warnings: [] };
  }
  return { valid: true, errors: [], warnings: [] };
});

/**
 * Validate data against any TypeBox schema, with optional cross-field validation.
 *
 * When the schema has a `$id` that matches a registered cross-field validator,
 * cross-field invariants are checked after schema validation passes.
 *
 * @remarks For protocol schemas, prefer using the `validators` object
 * which provides pre-defined, cached validators for all protocol types.
 * Schemas without `$id` are compiled per-call (no caching) — suitable
 * for one-off validation but not high-throughput loops.
 *
 * @param schema - TypeBox schema to validate against
 * @param data - Unknown data to validate
 * @param options - Optional: skip cross-field validation with `{ crossField: false }`
 * @returns `{ valid: true }` or `{ valid: false, errors: [...] }`, optionally with `warnings`
 */
export function validate<T extends TSchema>(
  schema: T,
  data: unknown,
  options?: { crossField?: boolean },
): { valid: true; warnings?: string[] } | { valid: false; errors: string[]; warnings?: string[] } {
  const compiled = getOrCompile(schema);
  if (!compiled.Check(data)) {
    const errors = [...compiled.Errors(data)].map(
      (e) => `${e.path}: ${e.message}`,
    );
    return { valid: false, errors };
  }

  // Cross-field validation (BB-C4-ADV-003)
  const runCrossField = options?.crossField !== false;
  if (runCrossField && schema.$id) {
    const crossValidator = crossFieldRegistry.get(schema.$id);
    if (crossValidator) {
      const crossResult = crossValidator(data);
      if (!crossResult.valid) {
        return {
          valid: false,
          errors: crossResult.errors,
          warnings: crossResult.warnings.length > 0 ? crossResult.warnings : undefined,
        };
      }
      if (crossResult.warnings.length > 0) {
        return { valid: true, warnings: crossResult.warnings };
      }
    }
  }

  return { valid: true };
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

  // v2.2.0
  capability: () => getOrCompile(CapabilitySchema),
  capabilityQuery: () => getOrCompile(CapabilityQuerySchema),
  capabilityResponse: () => getOrCompile(CapabilityResponseSchema),
  protocolDiscovery: () => getOrCompile(ProtocolDiscoverySchema),
  sagaContext: () => getOrCompile(SagaContextSchema),

  // v3.0.0
  accessPolicy: () => getOrCompile(AccessPolicySchema),

  // v3.1.0
  healthStatus: () => getOrCompile(HealthStatusSchema),
  thinkingTrace: () => getOrCompile(ThinkingTraceSchema),
  toolCall: () => getOrCompile(ToolCallSchema),
} as const;
