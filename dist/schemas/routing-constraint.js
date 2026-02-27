import { Type } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';
/**
 * Routing constraint for agent task dispatch.
 *
 * Constrains which agents/providers can handle a task based on
 * capabilities, cost limits, health requirements, and trust levels.
 *
 * Evaluation semantics: all present fields are AND-combined.
 * Absent fields impose no constraint (open by default).
 *
 * @since v4.0.0
 */
export const RoutingConstraintSchema = Type.Object({
    /** Required capabilities the handler must advertise. */
    required_capabilities: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        description: 'Capabilities the handler must advertise (AND logic)',
    })),
    /** Maximum cost in micro-USD the caller is willing to pay. */
    max_cost_micro: Type.Optional(MicroUSD),
    /** Minimum health score (0.0-1.0) the handler must report. */
    min_health: Type.Optional(Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Minimum health score (0=unhealthy, 1=fully healthy)',
    })),
    /** Allowlist of provider identifiers. Empty = any provider. */
    allowed_providers: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        description: 'Provider allowlist (empty array = any provider)',
    })),
    /** Minimum trust level required. */
    trust_level: Type.Optional(Type.Union([
        Type.Literal('public'),
        Type.Literal('authenticated'),
        Type.Literal('verified'),
        Type.Literal('trusted'),
    ], {
        description: 'Minimum trust level: public < authenticated < verified < trusted',
    })),
    /** Minimum reputation score (0.0-1.0) the handler must hold. */
    min_reputation: Type.Optional(Type.Number({
        minimum: 0,
        maximum: 1,
        description: 'Minimum reputation score (0=unknown, 1=highest)',
    })),
    /** Contract version for constraint interpretation. */
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Semver contract version governing constraint semantics',
    }),
}, {
    $id: 'RoutingConstraint',
    $comment: 'Financial amounts (max_cost_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. See vocabulary/currency.ts for arithmetic utilities.',
    additionalProperties: false,
    description: 'Agent routing constraint for task dispatch — all present fields AND-combined',
});
//# sourceMappingURL=routing-constraint.js.map