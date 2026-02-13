/**
 * Saga execution context for multi-step distributed operations.
 *
 * Distinguishes forward-path events from compensation (rollback) events
 * in transfer sagas. Consumers use `direction` to determine whether a batch
 * progresses or compensates the saga.
 *
 * @see BB-V3-012 — Transfer saga compensation protocol
 */
import { type Static } from '@sinclair/typebox';
export declare const SagaContextSchema: import("@sinclair/typebox").TObject<{
    saga_id: import("@sinclair/typebox").TString;
    step: import("@sinclair/typebox").TInteger;
    total_steps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    direction: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"forward">, import("@sinclair/typebox").TLiteral<"compensation">]>;
}>;
export type SagaContext = Static<typeof SagaContextSchema>;
/**
 * Validate cross-field invariants that JSON Schema cannot express.
 *
 * Currently checks:
 * - `step <= total_steps` when total_steps is provided
 *
 * JSON Schema 2020-12 can express some cross-field constraints via if/then,
 * but numeric comparisons between fields remain beyond its expressiveness.
 * This utility fills the gap — the same pattern as Kubernetes admission
 * controllers validating replicas <= maxReplicas.
 *
 * @returns `{ valid: true }` or `{ valid: false, reason: string }`
 */
export declare function validateSagaContext(ctx: SagaContext): {
    valid: true;
} | {
    valid: false;
    reason: string;
};
//# sourceMappingURL=saga-context.d.ts.map