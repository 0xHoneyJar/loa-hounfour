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
import { PerformanceRecordSchema } from '../schemas/performance-record.js';
import { ContributionRecordSchema } from '../schemas/contribution-record.js';
import { SanctionSchema } from '../schemas/sanction.js';
import { DisputeRecordSchema } from '../schemas/dispute-record.js';
import { ValidatedOutcomeSchema } from '../schemas/validated-outcome.js';
import { ReputationScoreSchema } from '../schemas/reputation-score.js';
import { EscrowEntrySchema } from '../schemas/escrow-entry.js';
import { StakePositionSchema } from '../schemas/stake-position.js';
import { CommonsDividendSchema } from '../schemas/commons-dividend.js';
import { MutualCreditSchema } from '../schemas/mutual-credit.js';
import { RoutingConstraintSchema } from '../schemas/routing-constraint.js';

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
/**
 * Cross-field validator registry — maps schema $id to validation functions.
 *
 * Pattern: Schemas declare `x-cross-field-validated: true` in their TypeBox options.
 * Validators are registered here and invoked automatically by `validate()`.
 * Consumers can discover which schemas have validators via `getCrossFieldValidatorSchemas()`.
 *
 * @see BB-POST-MERGE-001 — Cross-field validator discoverability
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
import { type PerformanceRecord } from '../schemas/performance-record.js';

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

registerCrossFieldValidator('PerformanceRecord', (data) => {
  const record = data as PerformanceRecord;
  const errors: string[] = [];
  const warnings: string[] = [];

  // dividend_split_bps is required when dividend_target is 'mixed'
  if (record.dividend_target === 'mixed' && record.dividend_split_bps === undefined) {
    errors.push('dividend_split_bps is required when dividend_target is "mixed"');
  }

  // Warn when outcome_validated is true but validated_by is empty or missing
  if (
    record.outcome?.outcome_validated === true &&
    (!record.outcome.validated_by || record.outcome.validated_by.length === 0)
  ) {
    warnings.push('outcome_validated is true but validated_by is empty or missing');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  return { valid: true, errors: [], warnings };
});

// --- v4.x cross-field validators (BB-C7-VALIDATOR-001..004, BB-C7-SECURITY-001..002) ---

registerCrossFieldValidator('EscrowEntry', (data) => {
  const entry = data as { state: string; released_at?: string; held_at: string; expires_at?: string; dispute_id?: string; payer_id: string; payee_id: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Self-escrow prevention (BB-C7-SECURITY-001)
  if (entry.payer_id === entry.payee_id) {
    errors.push('payer_id and payee_id must be different (self-escrow not allowed)');
  }

  // State co-presence rules
  if (entry.state === 'released' && !entry.released_at) {
    errors.push('released_at is required when state is "released"');
  }
  if (entry.state === 'held' && entry.released_at) {
    errors.push('released_at must not be present when state is "held"');
  }
  if (entry.state === 'disputed' && !entry.dispute_id) {
    errors.push('dispute_id is required when state is "disputed"');
  }

  // Escrow timeout (BB-V4-DEEP-002)
  if (entry.state === 'held' && !entry.expires_at) {
    warnings.push('held escrow should have expires_at for TTL enforcement');
  }
  if (entry.expires_at && entry.held_at && new Date(entry.expires_at) <= new Date(entry.held_at)) {
    errors.push('expires_at must be after held_at');
  }
  if (entry.state === 'expired' && !entry.expires_at) {
    errors.push('expired state requires expires_at');
  }

  // Temporal ordering
  if (entry.released_at && entry.held_at) {
    if (new Date(entry.released_at) < new Date(entry.held_at)) {
      errors.push('released_at must be >= held_at');
    }
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

registerCrossFieldValidator('StakePosition', (data) => {
  const stake = data as { amount_micro: string; vesting: { schedule: string; vested_micro: string; remaining_micro: string } };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vesting conservation: vested + remaining == total
  try {
    const total = BigInt(stake.amount_micro);
    const vested = BigInt(stake.vesting.vested_micro);
    const remaining = BigInt(stake.vesting.remaining_micro);
    if (vested + remaining !== total) {
      errors.push(`vesting conservation violated: vested (${vested}) + remaining (${remaining}) !== amount (${total})`);
    }
  } catch {
    // BigInt parse failures handled by schema validation
  }

  // Immediate schedule: remaining must be 0
  if (stake.vesting.schedule === 'immediate' && stake.vesting.remaining_micro !== '0') {
    errors.push('remaining_micro must be "0" when vesting schedule is "immediate"');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

registerCrossFieldValidator('MutualCredit', (data) => {
  const credit = data as { settled: boolean; settled_at?: string; settlement?: unknown; issued_at: string; creditor_id: string; debtor_id: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Self-credit prevention
  if (credit.creditor_id === credit.debtor_id) {
    errors.push('creditor_id and debtor_id must be different (self-credit not allowed)');
  }

  // Settled co-presence
  if (credit.settled && !credit.settled_at) {
    errors.push('settled_at is required when settled is true');
  }
  if (credit.settled && !credit.settlement) {
    errors.push('settlement is required when settled is true');
  }
  if (!credit.settled && credit.settled_at) {
    errors.push('settled_at must not be present when settled is false');
  }
  if (!credit.settled && credit.settlement) {
    errors.push('settlement must not be present when settled is false');
  }

  // Temporal ordering
  if (credit.settled_at && credit.issued_at) {
    if (new Date(credit.settled_at) < new Date(credit.issued_at)) {
      errors.push('settled_at must be >= issued_at');
    }
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

registerCrossFieldValidator('CommonsDividend', (data) => {
  const dividend = data as { period_start: string; period_end: string; total_micro: string; source_performance_ids?: string[]; distribution?: { recipients: Array<{ share_bps: number; amount_micro?: string }> } };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Temporal ordering
  if (new Date(dividend.period_end) <= new Date(dividend.period_start)) {
    errors.push('period_end must be after period_start');
  }

  // Source performance linkage (BB-V4-DEEP-003)
  if (!dividend.source_performance_ids) {
    warnings.push('dividend should link to source performance records for audit trail');
  }
  if (dividend.distribution && !dividend.source_performance_ids) {
    warnings.push('distributed dividend without provenance');
  }

  // Distribution share validation
  if (dividend.distribution) {
    const totalBps = dividend.distribution.recipients.reduce((sum, r) => sum + (r.share_bps ?? 0), 0);
    if (totalBps !== 10000) {
      warnings.push(`distribution recipients share_bps sum to ${totalBps}, expected 10000`);
    }

    // Amount conservation: if all recipients have amount_micro, sum must equal total_micro
    const recipients = dividend.distribution.recipients;
    const allHaveAmount = recipients.length > 0 && recipients.every((r) => r.amount_micro !== undefined);
    if (allHaveAmount) {
      try {
        const total = BigInt(dividend.total_micro);
        const sum = recipients.reduce((acc, r) => acc + BigInt(r.amount_micro!), BigInt(0));
        if (sum !== total) {
          errors.push(`distribution amount_micro sum (${sum}) does not equal total_micro (${total})`);
        }
      } catch {
        // BigInt parse failures handled by schema validation
      }
    }
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

registerCrossFieldValidator('DisputeRecord', (data) => {
  const dispute = data as { filed_by: string; filed_against: string; filed_at: string; resolution?: { resolved_at: string } };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (dispute.filed_by === dispute.filed_against) {
    errors.push('filed_by and filed_against must be different (self-dispute not allowed)');
  }

  // Temporal ordering: resolution must not precede filing
  if (dispute.resolution) {
    if (new Date(dispute.resolution.resolved_at) < new Date(dispute.filed_at)) {
      errors.push('resolution.resolved_at must be >= filed_at');
    }
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

import { ESCALATION_RULES } from '../vocabulary/sanctions.js';

registerCrossFieldValidator('Sanction', (data) => {
  const sanction = data as { severity: string; expires_at?: string; imposed_at: string; trigger: { violation_type: string; occurrence_count: number } };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (sanction.severity === 'terminated' && sanction.expires_at) {
    errors.push('expires_at must not be present when severity is "terminated" (termination is permanent)');
  }

  // Temporal ordering: expiry must be after imposition
  if (sanction.expires_at && sanction.imposed_at) {
    if (new Date(sanction.expires_at) <= new Date(sanction.imposed_at)) {
      errors.push('expires_at must be after imposed_at');
    }
  }
  if ((sanction.severity === 'warning' || sanction.severity === 'rate_limited') && !sanction.expires_at) {
    warnings.push(`expires_at recommended for severity "${sanction.severity}"`);
  }

  // Escalation rules wiring (BB-V4-DEEP-004)
  const rule = ESCALATION_RULES[sanction.trigger.violation_type as keyof typeof ESCALATION_RULES];
  if (rule) {
    // Find which threshold bracket the occurrence_count falls into
    let expectedSeverity: string | undefined;
    for (let i = rule.thresholds.length - 1; i >= 0; i--) {
      if (sanction.trigger.occurrence_count >= rule.thresholds[i]) {
        expectedSeverity = rule.severity_progression[i];
        break;
      }
    }
    if (expectedSeverity && sanction.severity !== expectedSeverity) {
      warnings.push(`severity "${sanction.severity}" does not match escalation rule for ${sanction.trigger.violation_type} at occurrence ${sanction.trigger.occurrence_count} (expected "${expectedSeverity}")`);
    }
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

import { MIN_REPUTATION_SAMPLE_SIZE } from '../vocabulary/reputation.js';

registerCrossFieldValidator('ReputationScore', (data) => {
  const score = data as { score: number; sample_size: number; decay_applied: boolean };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (score.sample_size < MIN_REPUTATION_SAMPLE_SIZE) {
    warnings.push(`sample_size (${score.sample_size}) is below minimum threshold (${MIN_REPUTATION_SAMPLE_SIZE})`);
  }

  if (score.score === 1.0 && score.sample_size < 10) {
    warnings.push('perfect score with low sample is suspicious');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

/**
 * Returns schema $ids that have registered cross-field validators.
 * Enables consumers to discover which schemas benefit from cross-field validation.
 */
export function getCrossFieldValidatorSchemas(): string[] {
  return Array.from(crossFieldRegistry.keys());
}

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

  // v4.0.0
  routingConstraint: () => getOrCompile(RoutingConstraintSchema),

  // v4.1.0 — Performance
  performanceRecord: () => getOrCompile(PerformanceRecordSchema),
  contributionRecord: () => getOrCompile(ContributionRecordSchema),

  // v4.2.0 — Governance
  sanction: () => getOrCompile(SanctionSchema),
  disputeRecord: () => getOrCompile(DisputeRecordSchema),
  validatedOutcome: () => getOrCompile(ValidatedOutcomeSchema),

  // v4.3.0 — Reputation
  reputationScore: () => getOrCompile(ReputationScoreSchema),

  // v4.4.0 — Economy
  escrowEntry: () => getOrCompile(EscrowEntrySchema),
  stakePosition: () => getOrCompile(StakePositionSchema),
  commonsDividend: () => getOrCompile(CommonsDividendSchema),
  mutualCredit: () => getOrCompile(MutualCreditSchema),
} as const;
