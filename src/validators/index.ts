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
import { CONTRACT_VERSION } from '../version.js';

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
import { CAPABILITY_SCOPES } from '../schemas/agent-identity.js';

// Canonical CapabilityScope set, hoisted to module scope so per-validate-call
// allocation cost is amortized across calls. (PR-A3.2 iter-2 F-002 mitigation.)
// Read-only at runtime; populated once at module load.
const CANONICAL_CAPABILITY_SCOPES: ReadonlySet<string> = new Set(CAPABILITY_SCOPES);
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
import { AgentCapacityReservationSchema, type AgentCapacityReservation } from '../schemas/model/routing/agent-capacity-reservation.js';
import { RESERVATION_TIER_MAP } from '../vocabulary/reservation-tier.js';
import { AuditTrailEntrySchema, type AuditTrailEntry } from '../schemas/audit-trail-entry.js';
import { PanelDecisionArtifactSchema } from '../governance/panel-decision-artifact.js';
import { PanelVerdictSchema } from '../governance/panel-verdict.js';
import { DeliberationDissentSchema } from '../governance/deliberation-dissent.js';
import { CrossScoreReportSchema } from '../governance/cross-score-report.js';
import { OrgIdentitySchema } from '../governance/org-identity.js';
import { OrgRepresentativeDelegationSchema } from '../governance/org-representative-delegation.js';
import { SuccessionPolicySchema } from '../governance/succession-policy.js';

import type {
  UnverifiedObligationEntry,
  UnverifiedObligationReason,
  UnverifiedObligationsManifest,
} from '../constraints/unverified-obligations.js';

/**
 * Outcome of `validate(schema, data)`. Additively extended in v8.4.0 to carry
 * an optional `unverified_obligations` manifest per SDD section 5.8 — when
 * the schema's constraint file contains `evaluator: 'runtime-deferred'`
 * rules, the field is populated; otherwise it is absent (NOT `null`, NOT
 * `undefined`-via-key) so pre-v8.4.0 consumers see byte-identical output.
 *
 * @since v8.4.0 — FR-C1 (manifest field), pre-existing for `valid` / `errors` / `warnings`
 */
export type ValidationResult =
  | {
    valid: true;
    warnings?: string[];
    unverified_obligations?: UnverifiedObligationsManifest;
  }
  | {
    valid: false;
    errors: string[];
    warnings?: string[];
    unverified_obligations?: UnverifiedObligationsManifest;
  };

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

import type { Sanction } from '../schemas/sanction.js';

registerCrossFieldValidator('Sanction', (data) => {
  const sanction = data as Sanction;
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

  // v5.1.0 — Graduated sanction rules

  // revocation-requires-reason: terminated severity must have evidence
  if (sanction.severity === 'terminated' && sanction.trigger.evidence_event_ids?.length === 0) {
    errors.push('terminated severity requires at least one evidence event');
  }

  // timed-sanctions-require-duration: if severity_level is present and not suspended, duration should be set
  if (sanction.severity_level && sanction.severity_level !== 'suspended' && sanction.duration_seconds === undefined) {
    warnings.push('severity_level present without duration_seconds — timed sanctions should specify duration');
  }

  // severity-field-precedence: if both severity and severity_level present, they should be consistent
  if (sanction.severity_level && sanction.severity !== sanction.severity_level) {
    warnings.push(`severity ("${sanction.severity}") differs from severity_level ("${sanction.severity_level}") — severity_level takes precedence for enforcement`);
  }

  // appeal_dispute_id requires appeal_available to be true
  if (sanction.appeal_dispute_id && !sanction.appeal_available) {
    errors.push('appeal_dispute_id present but appeal_available is false');
  }

  // v5.2.0 — Reservation floor preservation (S7-T5)
  // Low-severity sanctions (warning, rate_limited) should preserve the agent's
  // reservation floor. Higher severities (pool_restricted, suspended, terminated)
  // CAN breach the floor as they represent serious violations.
  if (sanction.severity === 'warning' || sanction.severity === 'rate_limited') {
    warnings.push(`severity "${sanction.severity}" should preserve agent reservation floor — enforcement must not reduce capacity below reserved minimum`);
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

// --- v5.2.0 — AgentCapacityReservation cross-field validator ---

registerCrossFieldValidator('AgentCapacityReservation', (data) => {
  const r = data as AgentCapacityReservation;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Temporal ordering: effective_until must be after effective_from
  if (r.effective_until && r.effective_from) {
    if (new Date(r.effective_until) <= new Date(r.effective_from)) {
      errors.push('effective_until must be after effective_from');
    }
  }

  // Tier minimum: reserved_capacity_bps should meet the minimum for the conformance level
  const tierMin = RESERVATION_TIER_MAP[r.conformance_level];
  if (tierMin !== undefined && r.reserved_capacity_bps < tierMin) {
    warnings.push(
      `reserved_capacity_bps (${r.reserved_capacity_bps}) is below minimum for ${r.conformance_level} (${tierMin} bps)`,
    );
  }

  // Active reservations should have reasonable capacity
  if (r.state === 'active' && r.reserved_capacity_bps === 0) {
    warnings.push('active reservation with 0 bps provides no capacity guarantee');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// --- v5.2.0 — BudgetScope reservation cross-field enhancement ---

// Enhance the existing BudgetScope validator to check reservation constraints.
// The validator was already registered above — we augment it by re-registering.
// The crossFieldRegistry.set() overwrites the old entry.
registerCrossFieldValidator('BudgetScope', (data) => {
  const scope = data as { limit_micro: string; spent_micro: string; action_on_exceed: string; reserved_capacity_bps?: number; reservation_id?: string };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (BigInt(scope.spent_micro) > BigInt(scope.limit_micro)) {
    warnings.push(`spent_micro (${scope.spent_micro}) exceeds limit_micro (${scope.limit_micro})`);
  }

  // v5.2.0 — Reservation fields cross-check
  if (scope.reserved_capacity_bps !== undefined && scope.reserved_capacity_bps > 0 && !scope.reservation_id) {
    warnings.push('reserved_capacity_bps is set but reservation_id is absent');
  }

  if (scope.reservation_id && (scope.reserved_capacity_bps === undefined || scope.reserved_capacity_bps === 0)) {
    warnings.push('reservation_id is present but reserved_capacity_bps is 0 or absent');
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// --- v5.2.0 — AuditTrailEntry cross-field validator ---

registerCrossFieldValidator('AuditTrailEntry', (data) => {
  const entry = data as AuditTrailEntry;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Distinct IDs: completion_id != billing_entry_id
  if (entry.completion_id === entry.billing_entry_id) {
    errors.push('completion_id and billing_entry_id must be different');
  }

  // entry_id must differ from both
  if (entry.entry_id === entry.completion_id) {
    errors.push('entry_id must differ from completion_id');
  }
  if (entry.entry_id === entry.billing_entry_id) {
    errors.push('entry_id must differ from billing_entry_id');
  }

  // Metadata size limit (10KB)
  if (entry.metadata) {
    const size = JSON.stringify(entry.metadata).length;
    if (size > 10240) {
      errors.push(`metadata exceeds 10KB limit (${size} bytes)`);
    }
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});

// --- v8.4.0 — Deliberation set + OrgOverseer constraint-file-only registrations ---
//
// The substantive cross-field surface for these seven schemas is the
// constraint-file rule set in `constraints/<SchemaName>.constraints.json`,
// not a TypeScript-resident validator function. The stubs below register the
// schema $ids in `crossFieldRegistry` so that:
//   * `getCrossFieldValidatorSchemas()` returns them, allowing
//     `npm run check:constraints` to detect that a constraint file exists for
//     each of these schemas (closes the "constraint file for X does not match
//     any registered schema" warning for the v8.4.0 schemas);
//   * the registry shape stays uniform across schemas with mixed validation
//     surfaces (TS-resident validators for transactional flows like
//     `BillingEntry`; constraint-file-only validators for declarative
//     contract sets like the deliberation primitives).
//
// Returning `{ valid: true, errors: [], warnings: [] }` is honest: the TS
// pipeline does NOT enforce these rules — consumers MUST evaluate the
// constraint files via `evaluateConstraint(...)` (or the equivalent
// cross-language runner) to enforce PDA-1..5, PV-1..4, DD-1..2, CSR-1, OI-1,
// ORD-3, SP-1..2. ORD-1 and ORD-2 carry their consumer obligation in the
// UnverifiedObligationsManifest emitted at validate() time per SDD section 5.8.

const constraintFileOnlyValidator: CrossFieldValidator = () => ({
  valid: true,
  errors: [],
  warnings: [],
});

registerCrossFieldValidator('PanelDecisionArtifact', constraintFileOnlyValidator);
registerCrossFieldValidator('PanelVerdict', constraintFileOnlyValidator);
registerCrossFieldValidator('DeliberationDissent', constraintFileOnlyValidator);
registerCrossFieldValidator('CrossScoreReport', constraintFileOnlyValidator);
registerCrossFieldValidator('OrgIdentity', constraintFileOnlyValidator);
registerCrossFieldValidator('OrgRepresentativeDelegation', constraintFileOnlyValidator);
registerCrossFieldValidator('SuccessionPolicy', constraintFileOnlyValidator);

// PR-A2.0 hygiene — register every schema that already ships a constraint
// file under `constraints/<schema_id>.constraints.json`. The vast majority
// of these have no TS-resident cross-field logic; the registration is
// purely a declaration that the constraint file is canonical for the
// schema, closing `npm run check:constraints` against drift between the
// registry and the on-disk constraint corpus. Where a schema later grows
// real cross-field invariants, the registration here can be replaced with
// a non-trivial `CrossFieldValidator` without changing the registry shape.
registerCrossFieldValidator('AgentIdentity', constraintFileOnlyValidator);
registerCrossFieldValidator('AuditTimestamp', constraintFileOnlyValidator);
registerCrossFieldValidator('AuditTrail', constraintFileOnlyValidator);
registerCrossFieldValidator('BasketComposition', constraintFileOnlyValidator);
registerCrossFieldValidator('BridgeTransferSaga', constraintFileOnlyValidator);
registerCrossFieldValidator('ChainBoundHash', constraintFileOnlyValidator);
registerCrossFieldValidator('CollectionGovernanceConfig', constraintFileOnlyValidator);
registerCrossFieldValidator('CollectionScoreUpdatedPayload', constraintFileOnlyValidator);
registerCrossFieldValidator('CommunityEngagementSignal', constraintFileOnlyValidator);
registerCrossFieldValidator('ConservationLaw', constraintFileOnlyValidator);
registerCrossFieldValidator('ConservationPropertyRegistry', constraintFileOnlyValidator);
registerCrossFieldValidator('ConstraintCandidate', constraintFileOnlyValidator);
registerCrossFieldValidator('ConstraintLifecycleEvent', constraintFileOnlyValidator);
registerCrossFieldValidator('ConsumerContract', constraintFileOnlyValidator);
registerCrossFieldValidator('ContractNegotiation', constraintFileOnlyValidator);
registerCrossFieldValidator('DelegationChain', constraintFileOnlyValidator);
registerCrossFieldValidator('DelegationOutcome', constraintFileOnlyValidator);
registerCrossFieldValidator('DelegationQualityEvent', constraintFileOnlyValidator);
registerCrossFieldValidator('DelegationTree', constraintFileOnlyValidator);
registerCrossFieldValidator('DynamicContract', constraintFileOnlyValidator);
registerCrossFieldValidator('EconomicBoundary', constraintFileOnlyValidator);
registerCrossFieldValidator('EconomicBoundaryEvaluationResult', constraintFileOnlyValidator);
registerCrossFieldValidator('EconomicPerformanceEvent', constraintFileOnlyValidator);
registerCrossFieldValidator('EnsembleCapabilityProfile', constraintFileOnlyValidator);
registerCrossFieldValidator('EpistemicTristate', constraintFileOnlyValidator);
registerCrossFieldValidator('EventSubscription', constraintFileOnlyValidator);
registerCrossFieldValidator('ExecutionCheckpoint', constraintFileOnlyValidator);
registerCrossFieldValidator('FeedbackDampeningConfig', constraintFileOnlyValidator);
registerCrossFieldValidator('GovernanceConfig', constraintFileOnlyValidator);
registerCrossFieldValidator('GovernanceProposal', constraintFileOnlyValidator);
registerCrossFieldValidator('GovernedCredits', constraintFileOnlyValidator);
registerCrossFieldValidator('GovernedFreshness', constraintFileOnlyValidator);
registerCrossFieldValidator('GovernedReputation', constraintFileOnlyValidator);
registerCrossFieldValidator('GovernedResourceRuntime', constraintFileOnlyValidator);
registerCrossFieldValidator('HashChainDiscontinuity', constraintFileOnlyValidator);
registerCrossFieldValidator('InterAgentTransactionAudit', constraintFileOnlyValidator);
registerCrossFieldValidator('JwtBoundarySpec', constraintFileOnlyValidator);
registerCrossFieldValidator('LivenessProperty', constraintFileOnlyValidator);
registerCrossFieldValidator('MicroUSDC', constraintFileOnlyValidator);
registerCrossFieldValidator('MintingPolicy', constraintFileOnlyValidator);
registerCrossFieldValidator('ModelEconomicProfile', constraintFileOnlyValidator);
registerCrossFieldValidator('MonetaryPolicy', constraintFileOnlyValidator);
registerCrossFieldValidator('MutationContext', constraintFileOnlyValidator);
registerCrossFieldValidator('PerformanceQualityBridge', constraintFileOnlyValidator);
registerCrossFieldValidator('PermissionBoundary', constraintFileOnlyValidator);
registerCrossFieldValidator('PersonalityAssignment', constraintFileOnlyValidator);
registerCrossFieldValidator('PolicyVersion', constraintFileOnlyValidator);
registerCrossFieldValidator('PortabilityResponse', constraintFileOnlyValidator);
registerCrossFieldValidator('ProposalExecution', constraintFileOnlyValidator);
registerCrossFieldValidator('ProposalOutcomeEvent', constraintFileOnlyValidator);
registerCrossFieldValidator('QualityEvent', constraintFileOnlyValidator);
registerCrossFieldValidator('QualityEventRecordedPayload', constraintFileOnlyValidator);
registerCrossFieldValidator('QuarantineRecord', constraintFileOnlyValidator);
registerCrossFieldValidator('QueryReputationCommand', constraintFileOnlyValidator);
registerCrossFieldValidator('RecordQualityEventCommand', constraintFileOnlyValidator);
registerCrossFieldValidator('RegistryBridge', constraintFileOnlyValidator);
registerCrossFieldValidator('ReputationAggregate', constraintFileOnlyValidator);
registerCrossFieldValidator('ReputationCredential', constraintFileOnlyValidator);
registerCrossFieldValidator('ReputationEconomicImpact', constraintFileOnlyValidator);
registerCrossFieldValidator('ReputationEvent', constraintFileOnlyValidator);
registerCrossFieldValidator('ReputationPortabilityRequest', constraintFileOnlyValidator);
registerCrossFieldValidator('ReputationRoutingSignal', constraintFileOnlyValidator);
registerCrossFieldValidator('ReputationStateChangedPayload', constraintFileOnlyValidator);
registerCrossFieldValidator('ReservationArithmetic', constraintFileOnlyValidator);
registerCrossFieldValidator('ResetReputationCommand', constraintFileOnlyValidator);
registerCrossFieldValidator('RollbackScope', constraintFileOnlyValidator);
registerCrossFieldValidator('RoutingRebalanceEvent', constraintFileOnlyValidator);
registerCrossFieldValidator('ScoringPathLog', constraintFileOnlyValidator);
registerCrossFieldValidator('StateMachineConfig', constraintFileOnlyValidator);
registerCrossFieldValidator('TaskType', constraintFileOnlyValidator);
registerCrossFieldValidator('TaskTypeCohort', constraintFileOnlyValidator);

// v8.5.0 PR-A2.2 — Authority Cascade Layer 2 + 3.
// Constraint-file-only by design: hounfour ships shape; consumers
// own the policy that applies these schemas. SignatureEnvelope is
// crypto-bearing and gets the safe-by-default opt-in path through
// validate() rather than a non-trivial cross-field validator here.
// Exception: Keyring carries a structural-uniqueness check (KR-1 +
// KR-2) that the schema layer cannot express — duplicate signer_id
// or key_ref entries within the same keyring create ambiguous key
// resolution at consumption time.
registerCrossFieldValidator('Keyring', (data) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const keyring = data as { signers?: Array<{ signer_id?: string; key_ref?: string }> };
  const signers = Array.isArray(keyring.signers) ? keyring.signers : [];

  // KR-1: signer_id MUST be unique within signers[]
  const seenIds = new Map<string, number>();
  signers.forEach((entry, idx) => {
    const id = entry?.signer_id;
    if (typeof id !== 'string') return;
    const prior = seenIds.get(id);
    if (prior !== undefined) {
      errors.push(
        `KR-1: duplicate signer_id "${id}" at signers[${idx}] (first seen at signers[${prior}]). Each signer_id MUST be unique within a keyring; duplicates create ambiguous key resolution at consumption time.`,
      );
    } else {
      seenIds.set(id, idx);
    }
  });

  // KR-2: duplicate key_ref entries trigger a warning (not an error). Two
  // SignerEntry rows pointing at the same underlying key material is
  // typically a misconfiguration (rotation didn't drop the prior entry),
  // but is sometimes legitimate (active + retiring overlap window). The
  // schema cannot decide; surfacing as warning lets the consumer decide.
  // Dedup: emit ONE warning per shared key_ref, listing every offending
  // index. A keyring with 3+ signers sharing a key_ref produces one
  // KR-2 warning naming all of them, not N-1 separate warnings.
  const refIndices = new Map<string, number[]>();
  signers.forEach((entry, idx) => {
    const ref = entry?.key_ref;
    if (typeof ref !== 'string') return;
    const arr = refIndices.get(ref);
    if (arr) {
      arr.push(idx);
    } else {
      refIndices.set(ref, [idx]);
    }
  });
  for (const [ref, indices] of refIndices) {
    if (indices.length < 2) continue;
    warnings.push(
      `KR-2: duplicate key_ref "${ref}" at signers[${indices.join(', ')}]. Two SignerEntry rows referencing the same key material is typically a misconfiguration; if intentional (rotation overlap), set distinct signer_ids and document the window.`,
    );
  }

  return errors.length > 0
    ? { valid: false, errors, warnings }
    : { valid: true, errors: [], warnings };
});
registerCrossFieldValidator('SignerEntry', constraintFileOnlyValidator);
registerCrossFieldValidator('SignerCompetenceRule', constraintFileOnlyValidator);
registerCrossFieldValidator('SignerCompetenceResult', constraintFileOnlyValidator);
registerCrossFieldValidator('SignatureEnvelope', constraintFileOnlyValidator);
registerCrossFieldValidator('SignerType', constraintFileOnlyValidator);
registerCrossFieldValidator('SignatureType', constraintFileOnlyValidator);
registerCrossFieldValidator('SignerStatus', constraintFileOnlyValidator);
registerCrossFieldValidator('PolicyDecisionOutcome', constraintFileOnlyValidator);

// v8.5.0 PR-A2.3 — Recall machinery + Forget/Commit/Estate + Assertion family.
// Constraint-file-only by design: hounfour ships shape; consumers
// own the policy. RecallReceipt + CommitmentRoot are crypto-bearing
// and gate via the safe-by-default opt-in path through validate();
// AssertionSchema is variant-aware crypto-bearing (J3) — the
// candidate variant is shape-only, the other 7 carry signatures and
// gate via validate()'s union-walk.
registerCrossFieldValidator('ReceiptDetailLevel', constraintFileOnlyValidator);
registerCrossFieldValidator('SurfaceContext', constraintFileOnlyValidator);
registerCrossFieldValidator('RecallRequest', constraintFileOnlyValidator);
registerCrossFieldValidator('RecallPack', constraintFileOnlyValidator);
registerCrossFieldValidator('RecallReceipt', constraintFileOnlyValidator);
registerCrossFieldValidator('ForgetRecord', constraintFileOnlyValidator);
registerCrossFieldValidator('CommitmentType', constraintFileOnlyValidator);
registerCrossFieldValidator('CommitmentRoot', constraintFileOnlyValidator);
registerCrossFieldValidator('AgentEstateStatus', constraintFileOnlyValidator);
registerCrossFieldValidator('AgentEstate', constraintFileOnlyValidator);
registerCrossFieldValidator('PrivacyScope', constraintFileOnlyValidator);
registerCrossFieldValidator('RiskLevel', constraintFileOnlyValidator);
registerCrossFieldValidator('AssertionStatus', constraintFileOnlyValidator);
registerCrossFieldValidator('AssertionClass', constraintFileOnlyValidator);
registerCrossFieldValidator('Assertion', constraintFileOnlyValidator);

// v8.6.0 PR-A3.4 — FR-B2 PhaseCompletionEnvelope (Tier-2 only;
// Tier-1 has no cross-field rules — `agent_signature` derivation is
// runtime-deferred per NF-1, surfaced via the existing
// `'x-crypto-bearing': true` manifest path). Tier-2 carries the
// signer_key_id derivation invariant + canonical-size cap +
// FR-C1/C2/C3 chain references via the constraint file at
// `constraints/PhaseCompletionEnvelope.constraints.json`.
registerCrossFieldValidator('PhaseCompletionEnvelope', constraintFileOnlyValidator);

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
 * @remarks v8.4.0 — return type is additively extended with an optional
 * `unverified_obligations` field. When the schema's constraint file (loaded
 * elsewhere in the runtime; see SDD section 5.8) contains rules tagged
 * `evaluator: 'runtime-deferred'`, an `UnverifiedObligationsManifest` is
 * surfaced on the result. When no such rules apply, the field is **omitted**
 * entirely from the result object — consumers derive "no obligations" from
 * absence (`'unverified_obligations' in result` or `if (result.unverified_obligations)`).
 * The base `validate()` here does not load constraint files; it carries the
 * field shape so callers that DO load constraint files can attach the
 * manifest before returning to user code without widening the type.
 *
 * @param schema - TypeBox schema to validate against
 * @param data - Unknown data to validate
 * @param options - Optional: skip cross-field validation with `{ crossField: false }`;
 *   opt in to shape-only validation of crypto-bearing schemas with `{ acceptDeferred: true }`
 *   (per ADR-010 / G1 — see safe-by-default note below); inject a deterministic
 *   `manifest_emitted_at` via `{ now: '<ISO8601>' }` for snapshot / golden-file
 *   parity (otherwise defaults to `new Date().toISOString()`).
 * @returns `{ valid: true }` or `{ valid: false, errors: [...] }`, optionally with `warnings` and `unverified_obligations`
 *
 * @remarks Safe-by-default crypto-bearing API (G1): when the schema's TypeBox
 *   options carry `'x-crypto-bearing': true` (e.g. `SignatureEnvelope`), the
 *   call's behavior depends on whether the data is structurally valid AND
 *   whether `{ acceptDeferred: true }` is passed:
 *
 *   - Structural failure (any schema/format violation): the call returns the
 *     usual `{ valid: false, errors: [<schema errors>] }` regardless of
 *     `acceptDeferred`. Structural failures take precedence and surface as
 *     normal — `CRYPTO_DEFERRED` is NOT emitted in this branch.
 *   - Structural success + `acceptDeferred` ABSENT: the call returns
 *     `{ valid: false, errors: ['CRYPTO_DEFERRED: ...'] }`. Each error string
 *     is prefixed with the literal token `CRYPTO_DEFERRED:` so consumers can
 *     match by `error.startsWith('CRYPTO_DEFERRED:')`. The opt-in flag IS the
 *     safety mechanism — it forces the consumer to acknowledge that the
 *     library has NOT verified the signature.
 *   - Structural success + `acceptDeferred: true`: the call returns
 *     `{ valid: true, unverified_obligations: { ..., unverified_rules: [{
 *     rule_id: 'CRYPTO_DEFERRED', evaluator: 'runtime-deferred', ... }] } }`.
 *     PR-A2.3 widens `evaluator` to carry `'consumer'` alongside a `reason`
 *     vocabulary (`'crypto_deferred'`, `'pattern_matching'`, etc.).
 *
 *   The error contract is currently `string[]`, so the prefix `CRYPTO_DEFERRED:`
 *   is the binding token. v8.6.0 is expected to migrate to a structured
 *   `{ code, message }[]` form (per docs/architecture/authority-cascade.md
 *   roadmap); consumers should prefer prefix matching over substring matching
 *   to ease that transition.
 *
 * @see SDD section 5.8 — Unverified-Obligations Manifest Emission Contract
 * @see ADR-010 — Class-vs-Policy Boundary
 */
export function validate<T extends TSchema>(
  schema: T,
  data: unknown,
  options?: {
    crossField?: boolean;
    acceptDeferred?: boolean;
    now?: string;
    /**
     * Auxiliary validation context the library evaluator can read for rules
     * that cannot be checked from a single record in isolation. v8.5.0
     * surfaces one consumer of this option:
     *
     * - `granted_by_chain_records` — array of OrgRepresentativeDelegation
     *   ancestor records (the record under validation plus all ancestors
     *   back to the genesis-rooted record, plus the synthetic terminator
     *   `{ delegation_id: 'genesis:org-public-key' }`). When supplied,
     *   validate() may library-evaluate ORD-3; when omitted, ORD-3 is
     *   surfaced via the unverified-obligations manifest with
     *   `reason: 'context_absent'`.
     */
    chainContext?: { granted_by_chain_records?: unknown };
    /**
     * FR-A4 (v8.6.0) opt-in fail-closed semantics for `x-chain-bearing`
     * schemas (currently only `OrgRepresentativeDelegation`). When set
     * to `true`:
     *
     *   - If `chainContext.granted_by_chain_records` is absent or empty,
     *     validate() returns `{ valid: false, errors: ['CHAIN_CONTEXT_DEFERRED: ...'] }`
     *     instead of emitting an `unverified_obligations` manifest.
     *   - If the chain context is supplied, validate() emits the ORD-3
     *     manifest entry with `reason: 'chain_context_provided'` (the
     *     opt-in acknowledgment) instead of the default `'pattern_matching'`.
     *
     * When unset or `false`, validate() preserves v8.5.x behavior exactly:
     * the manifest is emitted with `reason: 'context_absent'` (chain
     * absent) or `reason: 'pattern_matching'` (chain present), and the
     * outcome is `valid: true` regardless. This default is locked for the
     * v8.6.x line; v9.0.0 flips the default to fail-closed per the
     * MIGRATION.md FR-A4 forward-pointer.
     *
     * @since v8.6.0 — FR-A4 (DP-02 option C)
     */
    failClosed?: boolean;
  },
): ValidationResult {
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

  // Safe-by-default crypto-bearing API (G1, per ADR-010).
  // When the schema is flagged x-crypto-bearing, the consumer MUST
  // explicitly opt in to shape-only validation. Returning structurally-
  // valid {valid: true} would let consumers write
  //   if (validate(SignatureEnvelopeSchema, p).valid) { authorize(); }
  // and treat shape-validity as crypto authority. The opt-in flag is
  // the forced acknowledgment that downstream verification is the
  // consumer's responsibility.
  //
  // J3 variant-aware crypto-bearing: when the schema is a Type.Union
  // (e.g. AssertionSchema) the union itself carries no flag, but each
  // variant's options object MAY carry 'x-crypto-bearing': true. The
  // matching variant for the payload is found by walking anyOf and
  // re-checking each variant; if the matched variant is crypto-bearing,
  // the safe-by-default branch fires (e.g. status: 'admitted'); if the
  // matched variant is shape-only (e.g. status: 'candidate'), validate()
  // returns valid: true without acceptDeferred.
  const schemaRecord = schema as Record<string, unknown>;
  let isCryptoBearing = schemaRecord['x-crypto-bearing'] === true;
  let cryptoBearingVariantId: string | undefined;
  if (!isCryptoBearing && Array.isArray(schemaRecord.anyOf)) {
    const variants = schemaRecord.anyOf as Array<Record<string, unknown>>;
    for (const variant of variants) {
      if (variant['x-crypto-bearing'] !== true) continue;
      const variantSchema = variant as unknown as TSchema;
      const variantCompiled = getOrCompile(variantSchema);
      if (variantCompiled.Check(data)) {
        isCryptoBearing = true;
        // Iter-2 F7 mitigation: surface which variant matched so consumers
        // / operators can distinguish 'admitted' from 'forgotten' in the
        // manifest. Prefer an explicit variant-level $id when present;
        // otherwise synthesize a `<UnionId>#<discriminator-value>` form
        // by reading the literal `status` (or any single-literal field)
        // from the matched variant's properties.
        if (typeof variant.$id === 'string') {
          cryptoBearingVariantId = variant.$id;
        } else if (
          schema.$id &&
          variant.properties &&
          typeof variant.properties === 'object'
        ) {
          const props = variant.properties as Record<string, Record<string, unknown>>;
          for (const [name, propSchema] of Object.entries(props)) {
            if (
              typeof propSchema === 'object' &&
              propSchema !== null &&
              'const' in propSchema &&
              typeof propSchema.const === 'string'
            ) {
              cryptoBearingVariantId = `${schema.$id}#${name}=${propSchema.const}`;
              break;
            }
          }
        }
        break;
      }
    }
  }
  if (isCryptoBearing && options?.acceptDeferred !== true) {
    return {
      valid: false,
      errors: [
        'CRYPTO_DEFERRED: Crypto-bearing schema requires { acceptDeferred: true } ' +
          'to receive shape-only valid: true. The library does not verify the ' +
          'signature; downstream verification is the consumer\'s responsibility. ' +
          'See ADR-010 (Class-vs-Policy Boundary).',
      ],
    };
  }
  // PR-A2.3 iter-3 refactor (F1 + F-002 mitigation): manifest entries now
  // accumulate rather than short-circuit. The previous early-return shape
  // prevented composition — a hypothetical schema that is BOTH crypto-
  // bearing AND has a runtime-deferred obligation (e.g., a future
  // ORD-3-equivalent) would silently emit only the first entry. The
  // accumulator pattern is forward-compatible: every layer that wants to
  // surface an obligation pushes onto `obligations`, and the single
  // closing return assembles the manifest. Cross-field validators still
  // run BEFORE this section (they short-circuit on invalid as the contract
  // requires); the accumulator only runs once cross-field has passed.
  const obligations: UnverifiedObligationEntry[] = [];
  let manifestSchemaId: string =
    cryptoBearingVariantId ?? schema.$id ?? '<unverified-obligations>';

  if (isCryptoBearing && options?.acceptDeferred === true) {
    // The CRYPTO_DEFERRED / INTEGRITY_DEFERRED path. Integrity-bearing
    // detection (PR-A2.3 iter-2 F3 mitigation) keys on the schema-level
    // `'x-integrity-bearing': true` flag rather than a hardcoded $id list,
    // so new content-addressed schemas only need the flag in TypeBox
    // options to surface the obligation. RecallPack + CommitmentRoot both
    // carry it; the manifest discriminates via reason.
    const isIntegrityBearing = schemaRecord['x-integrity-bearing'] === true;
    const ruleId = isIntegrityBearing ? 'INTEGRITY_DEFERRED' : 'CRYPTO_DEFERRED';
    const reason: UnverifiedObligationReason = isIntegrityBearing
      ? 'integrity_deferred'
      : 'crypto_deferred';
    const ruleDescription = isIntegrityBearing
      ? 'Content-addressed hash present in payload — library does NOT recompute or compare; consumer responsibility per ADR-010.'
      : 'Signature value present in payload — library does NOT verify; consumer responsibility per ADR-010.';
    const ruleNote = isIntegrityBearing
      ? 'Content-addressed hash present in payload was NOT recomputed or compared by the library. ' +
        'Consumer MUST recompute the hash via safeCanonicalize() over the canonical-JSON payload ' +
        'and reject the record on hash mismatch before treating the record as integrity-verified.'
      : 'Signature value present in payload was NOT verified by the library. ' +
        'Consumer MUST verify the signature against the public key referenced ' +
        'by the SignerEntry that produced it before treating the envelope as ' +
        'cryptographically authoritative.';
    obligations.push({
      rule_id: ruleId,
      rule: ruleDescription,
      evaluator: 'consumer',
      reason,
      evaluation_note: ruleNote,
      consumer_acknowledgment_required: true,
    });
  }

  // ORD-3 manifest promotion (PR-A2.3 — HIGH carry-forward from v8.5.0
  // backlog). Emits the chain-validity obligation in BOTH context-present
  // and context-absent paths so the audit trail is unambiguous (PR-A2.3
  // iter-2 F4 mitigation: silence on the context-present path would let
  // consumers conflate "library validated chain" with "library skipped
  // because no context was supplied").
  //
  // FR-A4 (PR-A3.2, v8.6.0): generalized from `schema.$id ===
  // 'OrgRepresentativeDelegation'` to the metadata-driven
  // `'x-chain-bearing': true` flag, mirroring the existing
  // `x-crypto-bearing` / `x-integrity-bearing` patterns. When `failClosed`
  // is opted in, chain-context-absent is a HARD reject; chain-context-
  // present uses the `chain_context_provided` reason as the opt-in
  // acknowledgment. Default (failClosed unset/false) preserves v8.5.x
  // semantics exactly per NFR-1.
  const isChainBearing = schemaRecord['x-chain-bearing'] === true;
  if (isChainBearing) {
    const contextSupplied = hasChainContextRecords(options?.chainContext);
    if (options?.failClosed === true && !contextSupplied) {
      // FR-A4 fail-closed branch: reject the record outright. No manifest
      // emission — the error itself is the audit signal, and the v9.0.0
      // forward-pointer in MIGRATION.md documents the eventual default flip.
      return {
        valid: false,
        errors: [
          'CHAIN_CONTEXT_DEFERRED: Chain-bearing schema validated with ' +
            '{ failClosed: true } but `chainContext.granted_by_chain_records` ' +
            'was absent or not a non-empty array. ORD-3 cannot be library-' +
            'evaluated against a single record in isolation; assemble the ' +
            'chain (the record under validation plus all ancestors back to ' +
            'the genesis-rooted record, plus the synthetic terminator ' +
            '`{ delegation_id: "genesis:org-public-key" }`) and pass it as ' +
            '`{ chainContext: { granted_by_chain_records: [...] } }`. ' +
            'See MIGRATION.md v8.5.x → v8.6.0 FR-A4 section for the opt-in ' +
            'contract and the v9.0.0 default-flip forward-pointer.',
        ],
      };
    }
    const reason: UnverifiedObligationReason =
      options?.failClosed === true
        ? 'chain_context_provided'
        : (contextSupplied ? 'pattern_matching' : 'context_absent');
    obligations.push({
      rule_id: 'ORD-3',
      rule:
        'Delegation chain forms a valid DAG keyed by delegation_id, terminates at the genesis sentinel, and has chain_depth <= 20.',
      evaluator: 'consumer',
      reason,
      evaluation_note: options?.failClosed === true
        ? 'granted_by_chain_records was supplied via options.chainContext under ' +
          'FR-A4 opt-in (failClosed: true). validate() does NOT run is_valid_dag ' +
          'at this layer — chain-DSL evaluation runs in npm run check:constraints — ' +
          'but the manifest entry records the consumer\'s explicit acknowledgment ' +
          'of the v9.0.0 default-flip semantics. Reason: \'chain_context_provided\' ' +
          'distinguishes this opt-in path from the default (\'pattern_matching\') ' +
          'so audits can attribute the v9.0.0 readiness state per record.'
        : contextSupplied
          ? 'granted_by_chain_records was supplied via options.chainContext, but validate() does NOT run ' +
            'is_valid_dag at this layer — chain-DSL evaluation runs in npm run check:constraints. The ' +
            'consumer MUST run the chain check itself (or wait for the runtime constraint-evaluator to ' +
            'land in a later cycle). The manifest entry remains so the obligation is auditable even on ' +
            'the success path; consumers reconciling the entry can branch on reason: \'pattern_matching\'.'
          : 'granted_by_chain_records was not supplied via options.chainContext at validate() time. ' +
            'ORD-3 cannot be library-evaluated against a single record in isolation; the consumer MUST ' +
            'assemble the chain (the record under validation plus all ancestors back to the genesis-rooted ' +
            'record) and pass it as `{ chainContext: { granted_by_chain_records: [...] } }` to enable ' +
            'library-side DAG validation, OR perform the chain check consumer-side. See ' +
            'docs/architecture/org-overseer.md for the verification profile.',
      consumer_acknowledgment_required: true,
    });
  }

  // ORD-5 vocabulary-drift manifest promotion (PR-A3.2 — FR-A3 v8.6.0).
  // The constraint file flags capability_scope keys outside the canonical
  // CAPABILITY_SCOPES vocabulary (billing, governance, inference, delegation,
  // audit, composition) as warnings; v8.5.x evaluated this rule only at
  // `npm run check:constraints` time. v8.6.0 surfaces it at validate() so
  // consumers can branch on `reason: 'vocabulary_drift'` without parsing
  // the per-call warnings array. Each non-canonical key yields one
  // manifest entry; consumers aggregate fire counts per-window for the
  // soak metric driving the PR-A3.10 hosaka-fm review-window decision.
  // Severity stays 'warning' for v8.6.0 — no behavioral change to the
  // valid/invalid outcome (`valid: true` continues to hold). Promotion
  // to `severity: 'error'` is a PR-A3.10 decision per soak telemetry.
  //
  // TODO(cycle-005, deferred): The dispatch is currently $id-keyed because
  // `OrgRepresentativeDelegation` is the only vocabulary-bearing schema
  // in cycle-005. **Generalization trigger:** when a second
  // controlled-vocabulary field lands on any schema in cycle-005 or
  // later (e.g., a `Resource.tag_scope` field with a canonical tag set,
  // or a second capability-scope-bearing record), generalize this block
  // to a metadata-driven `'x-vocabulary-bearing'` flag whose value is a
  // descriptor `{ field: '<name>', canonical_set: ReadonlySet<string> }`.
  // The generalization must mirror the `'x-chain-bearing'` schema-flag
  // pattern that FR-A4 introduced and must be paired with a corresponding
  // `'x-vocabulary-bearing'` schema-metadata declaration in TypeBox
  // options on the originating schema. Single-schema today,
  // partial-generalization deferred to avoid over-engineering the
  // metadata surface ahead of a second concrete user.
  if (
    schema.$id === 'OrgRepresentativeDelegation' &&
    typeof data === 'object' &&
    data !== null &&
    'capability_scope' in data
  ) {
    const capabilityScope = (data as Record<string, unknown>).capability_scope;
    // F003 mitigation (PR-A3.2 iter-3): defense-in-depth — `typeof === 'object'`
    // returns true for arrays in JavaScript, and while the TypeBox structural
    // check upstream rejects arrays here, an explicit `!Array.isArray()` guard
    // costs one expression and prevents nonsense vocabulary_drift entries if
    // validation order ever shifts in a future refactor.
    if (
      typeof capabilityScope === 'object' &&
      capabilityScope !== null &&
      !Array.isArray(capabilityScope)
    ) {
      // F2 mitigation (PR-A3.2 iter-1): sort drift keys before iteration so
      // manifest entry order is deterministic across input JSON serialization
      // variations — content-addressable diffing across corpora does not
      // depend on upstream key-order accidents.
      const driftKeys = Object.keys(capabilityScope)
        .filter((k) => !CANONICAL_CAPABILITY_SCOPES.has(k))
        .sort();
      for (const driftKey of driftKeys) {
        obligations.push({
          rule_id: 'ORD-5',
          rule:
            'capability_scope MUST bind to a member of the canonical CapabilityScope set ' +
            '(billing, governance, inference, delegation, audit, composition). Non-canonical ' +
            'keys are surfaced as a vocabulary_drift warning during the cycle-005 soak window; ' +
            'promotion to error severity is a PR-A3.10 decision per soak telemetry.',
          evaluator: 'library',
          reason: 'vocabulary_drift',
          evaluation_note:
            `capability_scope key "${driftKey}" is outside the canonical vocabulary. ` +
            'Downstream Layer-2 SignerEntry.scoped_trust and Layer-3 ' +
            'SignerCompetenceRule.required_capability_scopes evaluators will treat ' +
            'this key as the default trust level — a potential authorization drift. ' +
            'Coordinate with the vocabulary maintainer before relying on the key in ' +
            'production policy. The soak telemetry windowing (consumer aggregates ' +
            'fire counts of `reason: \'vocabulary_drift\'` entries per validation pass ' +
            'across calendar windows) feeds the PR-A3.10 promotion decision; see ' +
            'NOTES.md ORD-5 fire-rate tracking template.',
          consumer_acknowledgment_required: true,
        });
      }
    }
  }

  if (obligations.length > 0) {
    return {
      valid: true,
      unverified_obligations: {
        schema_id: manifestSchemaId,
        contract_version: CONTRACT_VERSION,
        // F2 mitigation: accept an injected timestamp via options.now so
        // snapshot / golden-file parity tests can reproduce manifest output
        // byte-for-byte across runs. Falls through to wall-clock when absent.
        manifest_emitted_at: options?.now ?? new Date().toISOString(),
        unverified_rules: obligations,
      },
    };
  }

  return { valid: true };
}

/**
 * Detect whether the consumer supplied a non-empty `granted_by_chain_records`
 * array via the `chainContext` option. An empty array is also treated as
 * absent — chain validation requires at least one ancestor record (the
 * genesis-rooted sentinel) to resolve correctly.
 */
function hasChainContextRecords(
  chainContext: { granted_by_chain_records?: unknown } | undefined,
): boolean {
  const records = chainContext?.granted_by_chain_records;
  return Array.isArray(records) && records.length > 0;
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

  // v5.2.0 — Agent Capacity Reservation
  agentCapacityReservation: () => getOrCompile(AgentCapacityReservationSchema),

  // v5.2.0 — Audit Trail
  auditTrailEntry: () => getOrCompile(AuditTrailEntrySchema),

  // v8.4.0 — Deliberation Set (FR-A1..FR-A4)
  panelDecisionArtifact: () => getOrCompile(PanelDecisionArtifactSchema),
  panelVerdict: () => getOrCompile(PanelVerdictSchema),
  deliberationDissent: () => getOrCompile(DeliberationDissentSchema),
  crossScoreReport: () => getOrCompile(CrossScoreReportSchema),

  // v8.4.0 — OrgOverseer (FR-B1..FR-B3)
  orgIdentity: () => getOrCompile(OrgIdentitySchema),
  orgRepresentativeDelegation: () => getOrCompile(OrgRepresentativeDelegationSchema),
  successionPolicy: () => getOrCompile(SuccessionPolicySchema),
} as const;
