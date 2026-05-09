/**
 * Invariant schema — constraint DSL expressions for governed resources.
 *
 * Invariant expressions use the existing 42-builtin constraint DSL
 * (v1.0/v2.0) defined in `constraints/GRAMMAR.md`. Variable binding
 * resolves field paths against the GovernedResource<T> instance.
 *
 * @see SDD §4.2 — ConservationLaw (FR-1.2)
 * @see constraints/GRAMMAR.md — Expression grammar
 * @since v8.0.0
 */
import { Type } from '@sinclair/typebox';
/**
 * A single named invariant with a constraint DSL expression.
 *
 * Expression variables bind to field paths on the resource:
 * - Resource-specific fields: `balance`, `lot_id`, `freshness_score`
 * - Governance fields: `conservation_law.*`, `audit_trail.*`, `version`
 * - No temporal operators (invariants evaluate against a single snapshot)
 */
export const InvariantSchema = Type.Object({
    invariant_id: Type.String({
        pattern: '^[A-Z]+-\\d{1,4}$',
        description: 'Canonical identifier (e.g., I-1, CL-01, REP-001).',
    }),
    name: Type.String({ minLength: 1, maxLength: 255 }),
    expression: Type.String({
        minLength: 1,
        description: 'Constraint DSL expression evaluated against the GovernedResource<T> instance. '
            + 'Uses the existing 42-builtin evaluator (v7.11.0). Expression variables bind to '
            + 'field paths on the resource (e.g., resource.balance, audit_trail.integrity_status).',
    }),
    severity: Type.Union([
        Type.Literal('error'),
        Type.Literal('warning'),
        Type.Literal('info'),
    ]),
    description: Type.Optional(Type.String({ maxLength: 1000 })),
}, {
    $id: 'Invariant',
    additionalProperties: false,
});
//# sourceMappingURL=invariant.js.map