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
if (!FormatRegistry.Has('uuid')) {
  FormatRegistry.Set('uuid', (v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  );
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
import { CompletionRequestSchema } from '../schemas/model/completion-request.js';
import { CompletionResultSchema } from '../schemas/model/completion-result.js';
import { ModelCapabilitiesSchema } from '../schemas/model/model-capabilities.js';
import { ProviderWireMessageSchema } from '../schemas/model/provider-wire-message.js';
import { ToolDefinitionSchema } from '../schemas/model/tool-definition.js';
import { ToolResultSchema } from '../schemas/model/tool-result.js';
import { EnsembleRequestSchema } from '../schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../schemas/model/ensemble/ensemble-result.js';
import { AgentRequirementsSchema } from '../schemas/model/routing/agent-requirements.js';
import { BudgetScopeSchema } from '../schemas/model/routing/budget-scope.js';
import { RoutingResolutionSchema } from '../schemas/model/routing/routing-resolution.js';
import { ConstraintProposalSchema } from '../schemas/model/constraint-proposal.js';
import { ModelProviderSpecSchema, type ModelProviderSpec } from '../schemas/model/model-provider-spec.js';
import { ConformanceLevelSchema } from '../schemas/model/conformance-level.js';

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

  // v5.1.0 — Pricing provenance rules (warning severity)
  const d = data as Record<string, unknown>;
  const warnings: string[] = [];

  // Provenance: cost > 0 requires source_completion_id
  if (d.total_cost_micro !== '0' && d.source_completion_id === undefined) {
    warnings.push('non-zero cost should include source_completion_id for provenance');
  }

  // Provenance: if completion ref present, pricing snapshot should be too
  if (d.source_completion_id && !d.pricing_snapshot) {
    warnings.push('source_completion_id present without pricing_snapshot');
  }

  // Reconciliation: delta only with provider_invoice_authoritative
  if (d.reconciliation_delta_micro && d.reconciliation_mode !== 'provider_invoice_authoritative') {
    warnings.push('reconciliation_delta_micro only applies with provider_invoice_authoritative mode');
  }

  return { valid: true, errors: [], warnings };
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
        const amounts = recipients.map((r) => BigInt(r.amount_micro!));
        // Reject negative amounts in dividend context (BB-C8-I2-COR-005)
        if (amounts.some((a) => a < BigInt(0))) {
          errors.push('distribution recipient amount_micro must be non-negative');
        }
        const sum = amounts.reduce((acc, a) => acc + a, BigInt(0));
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
  const sanction = data as { severity: string; expires_at?: string; imposed_at: string; trigger: { violation_type: string; occurrence_count: number }; escalation_rule_applied?: string };
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

  // Escalation linkage (BB-V4-DEEP-004)
  if (sanction.escalation_rule_applied !== undefined && sanction.escalation_rule_applied !== sanction.trigger.violation_type) {
    warnings.push(`escalation_rule_applied ("${sanction.escalation_rule_applied}") should match trigger.violation_type ("${sanction.trigger.violation_type}")`);
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
  const score = data as { score: number; sample_size: number; decay_applied: boolean; min_unique_validators?: number; validation_graph_hash?: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (score.sample_size < MIN_REPUTATION_SAMPLE_SIZE) {
    warnings.push(`sample_size (${score.sample_size}) is below minimum threshold (${MIN_REPUTATION_SAMPLE_SIZE})`);
  }

  if (score.score === 1.0 && score.sample_size < 10) {
    warnings.push('perfect score with low sample is suspicious');
  }

  // Sybil resistance (BB-V4-DEEP-001)
  if (score.min_unique_validators !== undefined && score.sample_size < score.min_unique_validators) {
    errors.push(`sample_size (${score.sample_size}) must be >= min_unique_validators (${score.min_unique_validators})`);
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// --- v5.0.0 — ModelPort cross-field validators ---

registerCrossFieldValidator('CompletionRequest', (data) => {
  const req = data as { tools?: unknown[]; tool_choice?: unknown; execution_mode?: string; provider?: string; budget_limit_micro?: string; session_id?: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  // tools present → tool_choice required
  if (req.tools && req.tools.length > 0 && req.tool_choice === undefined) {
    errors.push('tool_choice is required when tools are provided');
  }

  // execution_mode=native_runtime → provider required
  if (req.execution_mode === 'native_runtime' && !req.provider) {
    errors.push(`provider is required when execution_mode is "native_runtime", got provider="${req.provider ?? 'undefined'}"`);
  }

  // execution_mode=native_runtime → session_id required
  if (req.execution_mode === 'native_runtime' && !req.session_id) {
    errors.push(`session_id is required when execution_mode is "native_runtime", got session_id="${req.session_id ?? 'undefined'}"`);
  }

  // budget_limit_micro must be > 0 when present
  if (req.budget_limit_micro !== undefined && req.budget_limit_micro === '0') {
    warnings.push('budget_limit_micro is zero — request will be rejected by budget enforcement');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

registerCrossFieldValidator('CompletionResult', (data) => {
  const result = data as { finish_reason: string; content?: string; tool_calls?: unknown[]; usage: { prompt_tokens: number; completion_tokens: number; reasoning_tokens?: number; total_tokens: number } };
  const errors: string[] = [];
  const warnings: string[] = [];

  // finish_reason=tool_calls → tool_calls must be non-empty
  if (result.finish_reason === 'tool_calls' && (!result.tool_calls || result.tool_calls.length === 0)) {
    errors.push('tool_calls must be non-empty when finish_reason is "tool_calls"');
  }

  // finish_reason=stop → content should be present
  if (result.finish_reason === 'stop' && !result.content) {
    warnings.push('content is expected when finish_reason is "stop"');
  }

  // usage.total_tokens conservation check
  const expected = result.usage.prompt_tokens + result.usage.completion_tokens + (result.usage.reasoning_tokens ?? 0);
  if (result.usage.total_tokens !== expected) {
    errors.push(`usage.total_tokens (${result.usage.total_tokens}) must equal prompt_tokens (${result.usage.prompt_tokens}) + completion_tokens (${result.usage.completion_tokens}) + reasoning_tokens (${result.usage.reasoning_tokens ?? 0}) = ${expected}`);
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

registerCrossFieldValidator('ProviderWireMessage', (data) => {
  const msg = data as { role: string; content?: unknown; tool_calls?: unknown[]; tool_call_id?: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  // role=tool → tool_call_id required
  if (msg.role === 'tool' && !msg.tool_call_id) {
    errors.push('tool_call_id is required when role is "tool"');
  }

  // role=assistant → content or tool_calls must be present
  if (msg.role === 'assistant' && !msg.content && (!msg.tool_calls || msg.tool_calls.length === 0)) {
    warnings.push('assistant message should have content or tool_calls');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// v5.0.0 — Ensemble cross-field validators
registerCrossFieldValidator('EnsembleRequest', (data) => {
  const req = data as { strategy: string; consensus_threshold?: number; dialogue_config?: { max_rounds: number; pass_thinking_traces: boolean; termination: string; seed_prompt?: string }; request?: { session_id?: string } };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (req.strategy === 'consensus' && req.consensus_threshold === undefined) {
    errors.push('consensus_threshold is required when strategy is "consensus"');
  }

  if (req.strategy === 'dialogue' && req.dialogue_config === undefined) {
    errors.push('dialogue_config is required when strategy is "dialogue"');
  }

  // Dialogue strategy benefits from session_id for round correlation
  if (req.strategy === 'dialogue' && req.request && !req.request.session_id) {
    warnings.push('session_id is recommended when strategy is "dialogue" for round correlation');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

registerCrossFieldValidator('EnsembleResult', (data) => {
  const result = data as { strategy: string; consensus_score?: number; total_cost_micro: string; selected: { usage: { cost_micro: string } }; candidates?: Array<{ usage: { cost_micro: string } }>; rounds?: Array<{ round: number; model: string; response: { usage: { cost_micro: string } } }>; termination_reason?: string; rounds_completed?: number; rounds_requested?: number; consensus_method?: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (result.strategy === 'consensus' && result.consensus_score === undefined) {
    errors.push('consensus_score is required when strategy is "consensus"');
  }

  if (BigInt(result.total_cost_micro) < BigInt(result.selected.usage.cost_micro)) {
    errors.push('total_cost_micro must be >= selected.usage.cost_micro');
  }

  // Cost conservation: total_cost_micro == sum of all candidate costs
  if (result.candidates) {
    const candidateSum = result.candidates.reduce(
      (sum, c) => sum + BigInt(c.usage.cost_micro),
      BigInt(0),
    );
    if (BigInt(result.total_cost_micro) !== candidateSum) {
      errors.push(`total_cost_micro (${result.total_cost_micro}) must equal sum of candidate costs (${candidateSum})`);
    }
  }

  // Dialogue strategy requires rounds
  if (result.strategy === 'dialogue' && (!result.rounds || result.rounds.length === 0)) {
    errors.push('rounds must be non-empty when strategy is "dialogue"');
  }

  // Dialogue strategy requires termination_reason
  if (result.strategy === 'dialogue' && result.termination_reason === undefined) {
    errors.push('termination_reason is required when strategy is "dialogue"');
  }

  // Dialogue rounds cost conservation: total_cost_micro >= sum of round costs
  if (result.strategy === 'dialogue' && result.rounds && result.rounds.length > 0) {
    const roundCostSum = result.rounds.reduce(
      (sum, r) => sum + BigInt(r.response.usage.cost_micro),
      BigInt(0),
    );
    if (BigInt(result.total_cost_micro) < roundCostSum) {
      errors.push(`total_cost_micro (${result.total_cost_micro}) must be >= sum of round costs (${roundCostSum})`);
    }
  }

  // rounds_completed consistency: must equal rounds.length when both present
  if (result.rounds != null && result.rounds_completed != null && result.rounds_completed !== result.rounds.length) {
    errors.push(`rounds_completed (${result.rounds_completed}) must equal rounds.length (${result.rounds.length})`);
  }

  // rounds_completed must not exceed rounds_requested
  if (result.rounds_requested != null && result.rounds_completed != null && result.rounds_completed > result.rounds_requested) {
    errors.push(`rounds_completed (${result.rounds_completed}) must not exceed rounds_requested (${result.rounds_requested})`);
  }

  // consensus_method recommended when termination_reason is consensus_reached
  if (result.termination_reason === 'consensus_reached' && result.consensus_method == null) {
    warnings.push('consensus_method is recommended when termination_reason is "consensus_reached" for audit trail');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// SagaContext cross-field validator
registerCrossFieldValidator('SagaContext', (data) => {
  const ctx = data as { step: number; total_steps?: number; direction: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  // step must not exceed total_steps when total_steps is provided
  if (ctx.total_steps !== undefined && ctx.step > ctx.total_steps) {
    errors.push(`step (${ctx.step}) must not exceed total_steps (${ctx.total_steps})`);
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// v5.0.0 — BudgetScope cross-field validator
registerCrossFieldValidator('BudgetScope', (data) => {
  const scope = data as { limit_micro: string; spent_micro: string; action_on_exceed: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (BigInt(scope.spent_micro) > BigInt(scope.limit_micro)) {
    warnings.push(`spent_micro (${scope.spent_micro}) exceeds limit_micro (${scope.limit_micro})`);
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// v5.0.0 — ConstraintProposal cross-field validator
registerCrossFieldValidator('ConstraintProposal', (data) => {
  const proposal = data as { review_status?: string; consensus_category?: string; expression_version: string; sunset_version?: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Accepted proposals must have HIGH_CONSENSUS
  if (proposal.review_status === 'accepted' && proposal.consensus_category !== 'HIGH_CONSENSUS') {
    errors.push(`consensus_category must be "HIGH_CONSENSUS" when review_status is "accepted", got "${proposal.consensus_category ?? 'undefined'}"`);
  }

  // sunset_version must be >= expression_version (semver comparison, not string)
  if (proposal.sunset_version != null) {
    const parseSemver = (v: string) => v.split('.').map(Number);
    const [sunMaj, sunMin = 0] = parseSemver(proposal.sunset_version);
    const [exprMaj, exprMin = 0] = parseSemver(proposal.expression_version);
    const sunsetValid = sunMaj > exprMaj || (sunMaj === exprMaj && sunMin >= exprMin);
    if (!sunsetValid) {
      errors.push(`sunset_version ("${proposal.sunset_version}") must be >= expression_version ("${proposal.expression_version}")`);
    }
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// --- v5.1.0 — Protocol Constitution cross-field validators ---

registerCrossFieldValidator('ModelProviderSpec', (data) => {
  const d = data as ModelProviderSpec;
  const errors: string[] = [];
  const warnings: string[] = [];

  // certified-requires-vectors: protocol_certified requires all vector results passing
  if (d.conformance_level === 'protocol_certified') {
    if (!d.conformance_vector_results?.length) {
      errors.push('protocol_certified requires conformance_vector_results');
    } else if (d.conformance_vector_results.some((r) => !r.passed)) {
      errors.push('protocol_certified requires all vectors to pass');
    }
  }

  // community_verified should have vector results (warning)
  if (d.conformance_level === 'community_verified' && !d.conformance_vector_results?.length) {
    warnings.push('community_verified should include conformance_vector_results');
  }

  // active-model-required: at least one active model
  if (!d.models.some((m) => m.status === 'active')) {
    errors.push('models must include at least one active entry');
  }

  // metadata-size: 10KB limit
  if (d.metadata) {
    const size = JSON.stringify(d.metadata).length;
    if (size > 10240) {
      errors.push(`metadata exceeds 10KB limit (${size} bytes)`);
    }
  }

  // metadata-namespace: x-* prefix enforcement (warning)
  if (d.metadata) {
    for (const key of Object.keys(d.metadata)) {
      if (!key.startsWith('x-')) {
        warnings.push(`metadata key '${key}' should use x-* namespace`);
      }
    }
  }

  // expires-after-published: temporal ordering
  if (d.expires_at && d.published_at) {
    if (new Date(d.expires_at) <= new Date(d.published_at)) {
      errors.push('expires_at must be after published_at');
    }
  }

  // HTTPS endpoints: all endpoint URLs must use https://
  if (d.endpoints) {
    for (const [key, url] of Object.entries(d.endpoints)) {
      if (url && !url.startsWith('https://')) {
        errors.push(`endpoints.${key} must use https:// scheme`);
      }
    }
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

  // v5.0.0 — ModelPort
  completionRequest: () => getOrCompile(CompletionRequestSchema),
  completionResult: () => getOrCompile(CompletionResultSchema),
  modelCapabilities: () => getOrCompile(ModelCapabilitiesSchema),
  providerWireMessage: () => getOrCompile(ProviderWireMessageSchema),
  toolDefinition: () => getOrCompile(ToolDefinitionSchema),
  toolResult: () => getOrCompile(ToolResultSchema),

  // v5.0.0 — Ensemble & Routing
  ensembleRequest: () => getOrCompile(EnsembleRequestSchema),
  ensembleResult: () => getOrCompile(EnsembleResultSchema),
  agentRequirements: () => getOrCompile(AgentRequirementsSchema),
  budgetScope: () => getOrCompile(BudgetScopeSchema),
  routingResolution: () => getOrCompile(RoutingResolutionSchema),

  // v5.0.0 — Constraint Evolution
  constraintProposal: () => getOrCompile(ConstraintProposalSchema),

  // v5.1.0 — Protocol Constitution
  modelProviderSpec: () => getOrCompile(ModelProviderSpecSchema),
  conformanceLevel: () => getOrCompile(ConformanceLevelSchema),
} as const;
