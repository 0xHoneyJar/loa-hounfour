/**
 * Schema validators with compile cache.
 *
 * Uses TypeBox TypeCompiler for fast runtime validation.
 * Compiled validators are cached on first use.
 *
 * @see SDD 4.1 — Schema Validation
 */
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { FormatRegistry } from '@sinclair/typebox';
// Register string formats so TypeCompiler validates them at runtime.
// ISO 8601 date-time (simplified check — full ISO parsing delegated to consumers).
if (!FormatRegistry.Has('date-time')) {
    FormatRegistry.Set('date-time', (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v));
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
import { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema } from '../schemas/capability.js';
import { ProtocolDiscoverySchema } from '../schemas/discovery.js';
import { SagaContextSchema } from '../schemas/saga-context.js';
// Compile cache — lazily populated on first use
const cache = new Map();
function getOrCompile(schema) {
    const id = schema.$id ?? JSON.stringify(schema);
    let compiled = cache.get(id);
    if (!compiled) {
        compiled = TypeCompiler.Compile(schema);
        cache.set(id, compiled);
    }
    return compiled;
}
/**
 * Validate data against any TypeBox schema.
 *
 * @remarks For protocol schemas, prefer using the `validators` object
 * which provides pre-defined, cached validators for all protocol types.
 * This function creates and caches compiled validators for any schema,
 * which is suitable for a bounded set of schemas but not for
 * dynamically-generated schemas in long-running processes — the cache
 * has no eviction policy.
 *
 * @returns `{ valid: true }` or `{ valid: false, errors: [...] }`
 */
export function validate(schema, data) {
    const compiled = getOrCompile(schema);
    if (compiled.Check(data)) {
        return { valid: true };
    }
    const errors = [...compiled.Errors(data)].map((e) => `${e.path}: ${e.message}`);
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
    // v2.2.0
    capability: () => getOrCompile(CapabilitySchema),
    capabilityQuery: () => getOrCompile(CapabilityQuerySchema),
    capabilityResponse: () => getOrCompile(CapabilityResponseSchema),
    protocolDiscovery: () => getOrCompile(ProtocolDiscoverySchema),
    sagaContext: () => getOrCompile(SagaContextSchema),
};
//# sourceMappingURL=index.js.map