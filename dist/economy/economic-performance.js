/**
 * Economic Performance Events — the feedback loop that closes the membrane.
 *
 * After an access decision is made (EconomicBoundary) and a model invocation
 * occurs, these schemas capture what happened and feed it back into the trust
 * layer. Without this, the membrane is unidirectional — a wall with a door.
 *
 * The PerformanceQualityBridge is the return path: it translates economic
 * outcomes into QualityEvents that the reputation system can process. This
 * is how the membrane becomes bidirectional.
 *
 * @see DR-F1 — Unidirectional membrane gap
 * @see FAANG parallel: Google ad auction click-through → quality score feedback
 * @since v7.8.0 (Sprint 2)
 */
import { Type } from '@sinclair/typebox';
// ---------------------------------------------------------------------------
// Performance Outcome Type
// ---------------------------------------------------------------------------
export const PerformanceOutcomeTypeSchema = Type.Union([
    Type.Literal('cost_within_budget'),
    Type.Literal('cost_exceeded'),
    Type.Literal('quality_met'),
    Type.Literal('quality_below_threshold'),
    Type.Literal('timeout'),
    Type.Literal('error'),
], {
    $id: 'PerformanceOutcomeType',
    description: 'Classification of how a model invocation performed against expectations.',
});
// ---------------------------------------------------------------------------
// Economic Performance Event
// ---------------------------------------------------------------------------
export const EconomicPerformanceEventSchema = Type.Object({
    event_id: Type.String({
        format: 'uuid',
        description: 'Unique identifier for this performance event.',
    }),
    boundary_id: Type.String({
        format: 'uuid',
        description: 'References the EconomicBoundary that granted access.',
    }),
    model_id: Type.String({
        minLength: 1,
        description: 'Which model was invoked.',
    }),
    outcome_type: PerformanceOutcomeTypeSchema,
    actual_cost: Type.String({
        pattern: '^[0-9]+$',
        description: 'Actual cost of the invocation in micro-USD.',
    }),
    budgeted_cost: Type.String({
        pattern: '^[0-9]+$',
        description: 'Budgeted/reserved cost in micro-USD.',
    }),
    actual_quality: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Observed quality of the invocation (0-1).',
    }),
    expected_quality: Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Expected quality from ModelEconomicProfile.quality_yield.',
    }),
    tokens_used: Type.Object({
        input: Type.Integer({ minimum: 0, description: 'Input tokens consumed.' }),
        output: Type.Integer({ minimum: 0, description: 'Output tokens generated.' }),
    }, { additionalProperties: false }),
    duration_ms: Type.Integer({
        minimum: 0,
        description: 'Invocation duration in milliseconds.',
    }),
    occurred_at: Type.String({
        format: 'date-time',
        description: 'When the invocation completed.',
    }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol version.',
    }),
}, {
    $id: 'EconomicPerformanceEvent',
    additionalProperties: false,
    description: 'Captures the outcome of a model invocation following an EconomicBoundary access decision. ' +
        'This is the return signal that closes the unidirectional membrane gap.',
});
// ---------------------------------------------------------------------------
// Quality Bridge Direction
// ---------------------------------------------------------------------------
export const QualityBridgeDirectionSchema = Type.Union([
    Type.Literal('positive'),
    Type.Literal('negative'),
    Type.Literal('neutral'),
], {
    $id: 'QualityBridgeDirection',
    description: 'Whether the economic outcome helped or hurt the model reputation.',
});
// ---------------------------------------------------------------------------
// Performance Quality Bridge
// ---------------------------------------------------------------------------
export const PerformanceQualityBridgeSchema = Type.Object({
    bridge_id: Type.String({
        format: 'uuid',
        description: 'Unique identifier for this bridge event.',
    }),
    performance_event_id: Type.String({
        format: 'uuid',
        description: 'References the EconomicPerformanceEvent.',
    }),
    quality_event_id: Type.String({
        format: 'uuid',
        description: 'References the QualityEvent that was generated.',
    }),
    model_id: Type.String({
        minLength: 1,
        description: 'Which model this bridge applies to.',
    }),
    direction: QualityBridgeDirectionSchema,
    quality_delta: Type.Number({
        description: 'Change in quality score attributable to this event.',
    }),
    weight_adjustment_suggested: Type.Number({
        minimum: -1,
        maximum: 1,
        description: 'Recommended routing weight adjustment (-1 to 1).',
    }),
    occurred_at: Type.String({
        format: 'date-time',
        description: 'When the bridge event was created.',
    }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol version.',
    }),
}, {
    $id: 'PerformanceQualityBridge',
    additionalProperties: false,
    description: 'Connects economic performance outcomes to reputation quality events. ' +
        'This is the return path through the membrane — economic outcomes become trust signals.',
});
//# sourceMappingURL=economic-performance.js.map