import { Type } from '@sinclair/typebox';
// --- Schemas for cross-language vectors ---
/**
 * Result of a GovernedResource state transition.
 */
export const TransitionResultSchema = Type.Object({
    success: Type.Boolean(),
    new_state: Type.Unknown({ description: 'The state after transition (type varies per resource).' }),
    version: Type.Integer({ minimum: 0 }),
    violations: Type.Optional(Type.Array(Type.String())),
}, {
    $id: 'TransitionResult',
    additionalProperties: false,
    description: 'Result of a GovernedResource state transition.',
});
/**
 * Result of checking a single invariant on a GovernedResource.
 */
export const InvariantResultSchema = Type.Object({
    invariant_id: Type.String({ minLength: 1 }),
    holds: Type.Boolean(),
    detail: Type.Optional(Type.String()),
}, {
    $id: 'InvariantResult',
    additionalProperties: false,
    description: 'Result of checking a single invariant on a GovernedResource.',
});
/**
 * Context for a governed resource mutation — actor identity, type, and access policy.
 * Generalized from freeside's CreditMutationContext (6-witness pattern).
 */
export const MutationContextSchema = Type.Object({
    actor_id: Type.String({ minLength: 1 }),
    actor_type: Type.Union([
        Type.Literal('human'),
        Type.Literal('system'),
        Type.Literal('autonomous'),
    ]),
    access_policy: Type.Optional(Type.Object({
        required_reputation_state: Type.Optional(Type.String()),
        required_role: Type.Optional(Type.String()),
        min_reputation_score: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    }, { additionalProperties: false })),
}, {
    $id: 'MutationContext',
    additionalProperties: false,
    description: 'Context for a governed resource mutation — actor identity, type, and access policy. '
        + 'Generalized from freeside\'s CreditMutationContext (6-witness pattern).',
});
/**
 * Abstract base providing invariant verification harness and audit trail wiring.
 *
 * Consumers extend this and implement:
 * - applyEvent(state, event, context) — pure state transition logic
 * - defineInvariants() — returns invariant check functions
 * - onTransitionSuccess(event, context, prev, next, version) — audit trail + mutation log append
 *
 * CONCURRENCY CONTRACT: GovernedResourceBase assumes single-writer semantics.
 * Callers MUST NOT invoke transition() concurrently on the same instance.
 * For concurrent access, use external serialization (e.g., pg_advisory_xact_lock,
 * optimistic version check at DB layer). The async signature exists to support
 * subclass hooks (e.g., post-transition audit append) — the base applyEvent()
 * is synchronous.
 *
 * @typeParam TState - Resource state type
 * @typeParam TEvent - Event type that triggers transitions
 * @typeParam TInvariant - String literal union of invariant IDs
 * @typeParam TContext - Mutation context type (defaults to MutationContext)
 */
export class GovernedResourceBase {
    _state;
    _version;
    _auditTrail;
    _mutationLog;
    _cachedInvariants = null;
    constructor(initialState) {
        this._state = initialState;
        this._version = 0;
        this._auditTrail = {
            entries: [],
            hash_algorithm: 'sha256',
            genesis_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            integrity_status: 'verified',
        };
        this._mutationLog = [];
    }
    get current() { return this._state; }
    get version() { return this._version; }
    get auditTrail() { return this._auditTrail; }
    get mutationLog() { return this._mutationLog; }
    async transition(event, context) {
        // 1. Apply event to produce candidate state (synchronous — applyEvent is pure)
        const candidateState = this.applyEvent(this._state, event, context);
        // 2. Verify all invariants against candidate state
        const previousState = this._state;
        this._state = candidateState;
        const results = this.verifyAll();
        const violations = results.filter(r => !r.holds);
        if (violations.length > 0) {
            // Rollback
            this._state = previousState;
            await this.onTransitionFailure(event, context, violations);
            return {
                success: false,
                newState: previousState,
                version: this._version,
                violations: violations.map(v => `${v.invariantId}: ${v.detail ?? 'violated'}`),
            };
        }
        // 3. Commit: increment version + invoke audit hook
        this._version += 1;
        await this.onTransitionSuccess(event, context, previousState, this._state, this._version);
        return {
            success: true,
            newState: this._state,
            version: this._version,
        };
    }
    /**
     * Hook called after a failed transition (invariant violation, rollback).
     * Optional override — default is no-op.
     */
    async onTransitionFailure(_event, _context, _violations) { }
    /**
     * Returns cached invariant map, calling defineInvariants() only once per instance.
     */
    getInvariants() {
        if (this._cachedInvariants === null) {
            this._cachedInvariants = this.defineInvariants();
        }
        return this._cachedInvariants;
    }
    verify(invariantId) {
        const invariants = this.getInvariants();
        const check = invariants.get(invariantId);
        if (!check) {
            return { invariantId, holds: false, detail: `Unknown invariant: ${invariantId}` };
        }
        return check(this._state);
    }
    verifyAll() {
        const invariants = this.getInvariants();
        return Array.from(invariants.entries()).map(([id, check]) => {
            const result = check(this._state);
            return { ...result, invariant_id: id };
        });
    }
}
//# sourceMappingURL=governed-resource-runtime.js.map