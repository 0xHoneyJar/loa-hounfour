/**
 * Routing Rebalance Event — records basket weight adjustments.
 *
 * When the system learns from performance feedback (Sprint 2) that
 * model weights should change, a RoutingRebalanceEvent captures
 * what triggered the rebalance and the before/after state.
 *
 * @see DR-F2 — Static routing weights (no rebalancing event)
 * @see FAANG parallel: Netflix CDN traffic proportion adjustments
 * @since v7.8.0 (Sprint 3)
 */
import { Type } from '@sinclair/typebox';
// ---------------------------------------------------------------------------
// Rebalance Trigger Type
// ---------------------------------------------------------------------------
export const RebalanceTriggerTypeSchema = Type.Union([
    Type.Literal('periodic'),
    Type.Literal('threshold_breach'),
    Type.Literal('manual'),
    Type.Literal('performance_driven'),
], {
    $id: 'RebalanceTriggerType',
    description: 'What triggered a basket rebalancing event.',
});
// ---------------------------------------------------------------------------
// Routing Rebalance Event
// ---------------------------------------------------------------------------
export const RoutingRebalanceEventSchema = Type.Object({
    event_id: Type.String({
        format: 'uuid',
        description: 'Unique identifier for this rebalance event.',
    }),
    trigger_type: RebalanceTriggerTypeSchema,
    before_composition_id: Type.String({
        format: 'uuid',
        description: 'BasketComposition before rebalance.',
    }),
    after_composition_id: Type.String({
        format: 'uuid',
        description: 'BasketComposition after rebalance.',
    }),
    trigger_details: Type.Optional(Type.String({
        description: 'Human-readable description of what triggered the rebalance.',
    })),
    performance_window_start: Type.Optional(Type.String({
        format: 'date-time',
        description: 'Start of performance observation period.',
    })),
    performance_window_end: Type.Optional(Type.String({
        format: 'date-time',
        description: 'End of performance observation period.',
    })),
    occurred_at: Type.String({
        format: 'date-time',
        description: 'When the rebalance occurred.',
    }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol version.',
    }),
}, {
    $id: 'RoutingRebalanceEvent',
    additionalProperties: false,
    description: 'Records a basket rebalancing — what triggered it, what changed, ' +
        'and the before/after composition state.',
});
//# sourceMappingURL=routing-rebalance.js.map