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
import { CONTRACT_VERSION } from '../version.js';
// Register string formats so TypeCompiler validates them at runtime.
// ISO 8601 date-time (simplified check — full ISO parsing delegated to consumers).
if (!FormatRegistry.Has('date-time')) {
    FormatRegistry.Set('date-time', (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v));
}
if (!FormatRegistry.Has('uri')) {
    FormatRegistry.Set('uri', (v) => /^https?:\/\/.+/.test(v));
}
if (!FormatRegistry.Has('uuid')) {
    FormatRegistry.Set('uuid', (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));
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
import { ModelProviderSpecSchema } from '../schemas/model/model-provider-spec.js';
import { ConformanceLevelSchema } from '../schemas/model/conformance-level.js';
import { AgentCapacityReservationSchema } from '../schemas/model/routing/agent-capacity-reservation.js';
import { RESERVATION_TIER_MAP } from '../vocabulary/reservation-tier.js';
import { AuditTrailEntrySchema } from '../schemas/audit-trail-entry.js';
import { PanelDecisionArtifactSchema } from '../governance/panel-decision-artifact.js';
import { PanelVerdictSchema } from '../governance/panel-verdict.js';
import { DeliberationDissentSchema } from '../governance/deliberation-dissent.js';
import { CrossScoreReportSchema } from '../governance/cross-score-report.js';
import { OrgIdentitySchema } from '../governance/org-identity.js';
import { OrgRepresentativeDelegationSchema } from '../governance/org-representative-delegation.js';
import { SuccessionPolicySchema } from '../governance/succession-policy.js';
// Compile cache — lazily populated on first use.
// Only caches schemas with $id to prevent unbounded growth from
// consumer-supplied schemas (BB-V3-003).
const cache = new Map();
function getOrCompile(schema) {
    const id = schema.$id;
    if (id) {
        let compiled = cache.get(id);
        if (!compiled) {
            compiled = TypeCompiler.Compile(schema);
            cache.set(id, compiled);
        }
        return compiled;
    }
    // Non-$id schemas are compiled per-call (no caching) to prevent
    // unbounded cache growth from arbitrary consumer schemas.
    return TypeCompiler.Compile(schema);
}
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
const crossFieldRegistry = new Map();
/**
 * Register a cross-field validator for a schema.
 * Used internally to wire cross-field checks into the main pipeline.
 */
export function registerCrossFieldValidator(schemaId, validator) {
    crossFieldRegistry.set(schemaId, validator);
}
// Wire built-in cross-field validators (BB-C4-ADV-003)
import { validateSealingPolicy, validateAccessPolicy } from '../schemas/conversation.js';
import { validateBillingEntry } from '../utilities/billing.js';
registerCrossFieldValidator('ConversationSealingPolicy', (data) => {
    return validateSealingPolicy(data);
});
registerCrossFieldValidator('AccessPolicy', (data) => {
    return validateAccessPolicy(data);
});
registerCrossFieldValidator('BillingEntry', (data) => {
    const result = validateBillingEntry(data);
    if (!result.valid) {
        return { valid: false, errors: [result.reason], warnings: [] };
    }
    // v5.1.0 — Pricing provenance rules (warning severity)
    const d = data;
    const warnings = [];
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
    const record = data;
    const errors = [];
    const warnings = [];
    // dividend_split_bps is required when dividend_target is 'mixed'
    if (record.dividend_target === 'mixed' && record.dividend_split_bps === undefined) {
        errors.push('dividend_split_bps is required when dividend_target is "mixed"');
    }
    // Warn when outcome_validated is true but validated_by is empty or missing
    if (record.outcome?.outcome_validated === true &&
        (!record.outcome.validated_by || record.outcome.validated_by.length === 0)) {
        warnings.push('outcome_validated is true but validated_by is empty or missing');
    }
    if (errors.length > 0) {
        return { valid: false, errors, warnings };
    }
    return { valid: true, errors: [], warnings };
});
// --- v4.x cross-field validators (BB-C7-VALIDATOR-001..004, BB-C7-SECURITY-001..002) ---
registerCrossFieldValidator('EscrowEntry', (data) => {
    const entry = data;
    const errors = [];
    const warnings = [];
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
    const stake = data;
    const errors = [];
    const warnings = [];
    // Vesting conservation: vested + remaining == total
    try {
        const total = BigInt(stake.amount_micro);
        const vested = BigInt(stake.vesting.vested_micro);
        const remaining = BigInt(stake.vesting.remaining_micro);
        if (vested + remaining !== total) {
            errors.push(`vesting conservation violated: vested (${vested}) + remaining (${remaining}) !== amount (${total})`);
        }
    }
    catch {
        // BigInt parse failures handled by schema validation
    }
    // Immediate schedule: remaining must be 0
    if (stake.vesting.schedule === 'immediate' && stake.vesting.remaining_micro !== '0') {
        errors.push('remaining_micro must be "0" when vesting schedule is "immediate"');
    }
    return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});
registerCrossFieldValidator('MutualCredit', (data) => {
    const credit = data;
    const errors = [];
    const warnings = [];
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
    const dividend = data;
    const errors = [];
    const warnings = [];
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
                const amounts = recipients.map((r) => BigInt(r.amount_micro));
                // Reject negative amounts in dividend context (BB-C8-I2-COR-005)
                if (amounts.some((a) => a < BigInt(0))) {
                    errors.push('distribution recipient amount_micro must be non-negative');
                }
                const sum = amounts.reduce((acc, a) => acc + a, BigInt(0));
                if (sum !== total) {
                    errors.push(`distribution amount_micro sum (${sum}) does not equal total_micro (${total})`);
                }
            }
            catch {
                // BigInt parse failures handled by schema validation
            }
        }
    }
    return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});
registerCrossFieldValidator('DisputeRecord', (data) => {
    const dispute = data;
    const errors = [];
    const warnings = [];
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
    const sanction = data;
    const errors = [];
    const warnings = [];
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
    const rule = ESCALATION_RULES[sanction.trigger.violation_type];
    if (rule) {
        // Find which threshold bracket the occurrence_count falls into
        let expectedSeverity;
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
    const score = data;
    const errors = [];
    const warnings = [];
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
    const req = data;
    const errors = [];
    const warnings = [];
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
    const result = data;
    const errors = [];
    const warnings = [];
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
    const msg = data;
    const errors = [];
    const warnings = [];
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
    const req = data;
    const errors = [];
    const warnings = [];
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
    const result = data;
    const errors = [];
    const warnings = [];
    if (result.strategy === 'consensus' && result.consensus_score === undefined) {
        errors.push('consensus_score is required when strategy is "consensus"');
    }
    if (BigInt(result.total_cost_micro) < BigInt(result.selected.usage.cost_micro)) {
        errors.push('total_cost_micro must be >= selected.usage.cost_micro');
    }
    // Cost conservation: total_cost_micro == sum of all candidate costs
    if (result.candidates) {
        const candidateSum = result.candidates.reduce((sum, c) => sum + BigInt(c.usage.cost_micro), BigInt(0));
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
        const roundCostSum = result.rounds.reduce((sum, r) => sum + BigInt(r.response.usage.cost_micro), BigInt(0));
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
    const ctx = data;
    const errors = [];
    const warnings = [];
    // step must not exceed total_steps when total_steps is provided
    if (ctx.total_steps !== undefined && ctx.step > ctx.total_steps) {
        errors.push(`step (${ctx.step}) must not exceed total_steps (${ctx.total_steps})`);
    }
    return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});
// v5.0.0 — BudgetScope cross-field validator
registerCrossFieldValidator('BudgetScope', (data) => {
    const scope = data;
    const errors = [];
    const warnings = [];
    if (BigInt(scope.spent_micro) > BigInt(scope.limit_micro)) {
        warnings.push(`spent_micro (${scope.spent_micro}) exceeds limit_micro (${scope.limit_micro})`);
    }
    return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
});
// v5.0.0 — ConstraintProposal cross-field validator
registerCrossFieldValidator('ConstraintProposal', (data) => {
    const proposal = data;
    const errors = [];
    const warnings = [];
    // Accepted proposals must have HIGH_CONSENSUS
    if (proposal.review_status === 'accepted' && proposal.consensus_category !== 'HIGH_CONSENSUS') {
        errors.push(`consensus_category must be "HIGH_CONSENSUS" when review_status is "accepted", got "${proposal.consensus_category ?? 'undefined'}"`);
    }
    // sunset_version must be >= expression_version (semver comparison, not string)
    if (proposal.sunset_version != null) {
        const parseSemver = (v) => v.split('.').map(Number);
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
    const d = data;
    const errors = [];
    const warnings = [];
    // certified-requires-vectors: protocol_certified requires all vector results passing
    if (d.conformance_level === 'protocol_certified') {
        if (!d.conformance_vector_results?.length) {
            errors.push('protocol_certified requires conformance_vector_results');
        }
        else if (d.conformance_vector_results.some((r) => !r.passed)) {
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
    const r = data;
    const errors = [];
    const warnings = [];
    // Temporal ordering: effective_until must be after effective_from
    if (r.effective_until && r.effective_from) {
        if (new Date(r.effective_until) <= new Date(r.effective_from)) {
            errors.push('effective_until must be after effective_from');
        }
    }
    // Tier minimum: reserved_capacity_bps should meet the minimum for the conformance level
    const tierMin = RESERVATION_TIER_MAP[r.conformance_level];
    if (tierMin !== undefined && r.reserved_capacity_bps < tierMin) {
        warnings.push(`reserved_capacity_bps (${r.reserved_capacity_bps}) is below minimum for ${r.conformance_level} (${tierMin} bps)`);
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
    const scope = data;
    const errors = [];
    const warnings = [];
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
    const entry = data;
    const errors = [];
    const warnings = [];
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
const constraintFileOnlyValidator = () => ({
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
    const errors = [];
    const warnings = [];
    const keyring = data;
    const signers = Array.isArray(keyring.signers) ? keyring.signers : [];
    // KR-1: signer_id MUST be unique within signers[]
    const seenIds = new Map();
    signers.forEach((entry, idx) => {
        const id = entry?.signer_id;
        if (typeof id !== 'string')
            return;
        const prior = seenIds.get(id);
        if (prior !== undefined) {
            errors.push(`KR-1: duplicate signer_id "${id}" at signers[${idx}] (first seen at signers[${prior}]). Each signer_id MUST be unique within a keyring; duplicates create ambiguous key resolution at consumption time.`);
        }
        else {
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
    const refIndices = new Map();
    signers.forEach((entry, idx) => {
        const ref = entry?.key_ref;
        if (typeof ref !== 'string')
            return;
        const arr = refIndices.get(ref);
        if (arr) {
            arr.push(idx);
        }
        else {
            refIndices.set(ref, [idx]);
        }
    });
    for (const [ref, indices] of refIndices) {
        if (indices.length < 2)
            continue;
        warnings.push(`KR-2: duplicate key_ref "${ref}" at signers[${indices.join(', ')}]. Two SignerEntry rows referencing the same key material is typically a misconfiguration; if intentional (rotation overlap), set distinct signer_ids and document the window.`);
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
/**
 * Returns schema $ids that have registered cross-field validators.
 * Enables consumers to discover which schemas benefit from cross-field validation.
 */
export function getCrossFieldValidatorSchemas() {
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
export function validate(schema, data, options) {
    const compiled = getOrCompile(schema);
    if (!compiled.Check(data)) {
        const errors = [...compiled.Errors(data)].map((e) => `${e.path}: ${e.message}`);
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
    const isCryptoBearing = schema['x-crypto-bearing'] === true;
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
    if (isCryptoBearing && options?.acceptDeferred === true) {
        // The full NF-2 shape (evaluator: 'consumer' + reason vocabulary)
        // lands in PR-A2.3 along with the consumer-evaluator extension.
        // For PR-A2.2 we emit a manifest entry under the existing v8.4.0
        // schema with a CRYPTO_DEFERRED rule_id, so consumers can detect
        // the obligation without waiting for the type widening.
        // contract_version sources from CONTRACT_VERSION so that the runtime
        // emission, schemas/index.json, and the published $id namespace stay
        // aligned through the dev cycle (per cycle-003 D-005 precedent: the
        // namespace bumps in the version-bump sprint, not mid-cycle).
        return {
            valid: true,
            unverified_obligations: {
                schema_id: schema.$id ?? '<crypto-bearing>',
                contract_version: CONTRACT_VERSION,
                // F2 mitigation: accept an injected timestamp via options.now so
                // snapshot / golden-file parity tests can reproduce manifest output
                // byte-for-byte across runs. Falls through to wall-clock when absent.
                manifest_emitted_at: options?.now ?? new Date().toISOString(),
                unverified_rules: [
                    {
                        rule_id: 'CRYPTO_DEFERRED',
                        rule: 'Signature value present in payload — library does NOT verify; consumer responsibility per ADR-010.',
                        evaluator: 'runtime-deferred',
                        evaluation_note: 'Signature value present in payload was NOT verified by the library. ' +
                            'Consumer MUST verify the signature against the public key referenced ' +
                            'by the SignerEntry that produced it before treating the envelope as ' +
                            'cryptographically authoritative.',
                        consumer_acknowledgment_required: true,
                    },
                ],
            },
        };
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
};
//# sourceMappingURL=index.js.map