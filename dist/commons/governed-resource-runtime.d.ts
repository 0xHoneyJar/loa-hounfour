/**
 * GovernedResource<T> Runtime Interface — abstract base for governed resources.
 *
 * Runtime complement to the existing `GOVERNED_RESOURCE_FIELDS` schema spread.
 * Consumers who need only schemas continue using the spread; consumers who need
 * runtime behavior (transition, verify, audit) extend GovernedResourceBase.
 *
 * @see SDD §4.8 — FR-8 GovernedResource<T> Runtime Interface Extraction
 * @see PRD FR-8 — GovernedResource<T> Runtime
 * @since v8.3.0
 */
import type { AuditTrail } from './audit-trail.js';
import type { GovernanceMutation } from './governed-resource.js';
import { type Static } from '@sinclair/typebox';
/**
 * Result of a GovernedResource state transition.
 */
export declare const TransitionResultSchema: import("@sinclair/typebox").TObject<{
    success: import("@sinclair/typebox").TBoolean;
    new_state: import("@sinclair/typebox").TUnknown;
    version: import("@sinclair/typebox").TInteger;
    violations: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type TransitionResultStatic = Static<typeof TransitionResultSchema>;
/**
 * Result of checking a single invariant on a GovernedResource.
 */
export declare const InvariantResultSchema: import("@sinclair/typebox").TObject<{
    invariant_id: import("@sinclair/typebox").TString;
    holds: import("@sinclair/typebox").TBoolean;
    detail: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type InvariantResultStatic = Static<typeof InvariantResultSchema>;
/**
 * Context for a governed resource mutation — actor identity, type, and access policy.
 * Generalized from freeside's CreditMutationContext (6-witness pattern).
 */
export declare const MutationContextSchema: import("@sinclair/typebox").TObject<{
    actor_id: import("@sinclair/typebox").TString;
    actor_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"autonomous">]>;
    access_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        required_reputation_state: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        required_role: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        min_reputation_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    }>>;
}>;
export type MutationContextStatic = Static<typeof MutationContextSchema>;
export interface TransitionResult<TState> {
    readonly success: boolean;
    readonly newState: TState;
    readonly version: number;
    readonly violations?: ReadonlyArray<string>;
}
export interface InvariantResult {
    readonly invariantId: string;
    readonly holds: boolean;
    readonly detail?: string;
}
export interface MutationContext {
    readonly actorId: string;
    readonly actorType: 'human' | 'system' | 'autonomous';
    readonly accessPolicy?: {
        required_reputation_state?: string;
        required_role?: string;
        min_reputation_score?: number;
    };
}
/**
 * Runtime interface for governed resources.
 *
 * Consumers implement this for resources requiring:
 * - Event-sourced state transitions with invariant verification
 * - Append-only audit trail integration
 * - Optimistic concurrency control (version monotonicity)
 *
 * The existing GOVERNED_RESOURCE_FIELDS schema spread remains available
 * for consumers who need only the schema (no runtime behavior).
 *
 * @typeParam TState - Resource state type
 * @typeParam TEvent - Event type that triggers transitions
 * @typeParam TInvariant - String literal union of invariant IDs
 */
export interface GovernedResource<TState, TEvent, TInvariant extends string = string> {
    readonly resourceId: string;
    readonly resourceType: string;
    readonly current: TState;
    readonly version: number;
    transition(event: TEvent, context: MutationContext): Promise<TransitionResult<TState>>;
    verify(invariantId: TInvariant): InvariantResult;
    verifyAll(): InvariantResult[];
    readonly auditTrail: Readonly<AuditTrail>;
    readonly mutationLog: ReadonlyArray<GovernanceMutation>;
}
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
export declare abstract class GovernedResourceBase<TState, TEvent, TInvariant extends string = string, TContext extends MutationContext = MutationContext> implements GovernedResource<TState, TEvent, TInvariant> {
    abstract readonly resourceId: string;
    abstract readonly resourceType: string;
    private _state;
    private _version;
    private _auditTrail;
    private _mutationLog;
    private _cachedInvariants;
    constructor(initialState: TState);
    get current(): TState;
    get version(): number;
    get auditTrail(): Readonly<AuditTrail>;
    get mutationLog(): ReadonlyArray<GovernanceMutation>;
    transition(event: TEvent, context: TContext): Promise<TransitionResult<TState>>;
    /**
     * Hook called after a successful transition. Subclasses MUST implement to:
     * - Append to audit trail (via computeChainBoundHash or computeAuditEntryHash)
     * - Append to mutation log
     * - Perform post-transition side effects (e.g., event emission)
     *
     * The base class does NOT auto-append — this is intentional to avoid
     * coupling the abstract base to a specific persistence model.
     */
    protected abstract onTransitionSuccess(event: TEvent, context: TContext, previousState: TState, newState: TState, version: number): Promise<void>;
    /**
     * Hook called after a failed transition (invariant violation, rollback).
     * Optional override — default is no-op.
     */
    protected onTransitionFailure(_event: TEvent, _context: TContext, _violations: InvariantResult[]): Promise<void>;
    /**
     * Returns cached invariant map, calling defineInvariants() only once per instance.
     */
    private getInvariants;
    verify(invariantId: TInvariant): InvariantResult;
    verifyAll(): InvariantResult[];
    /**
     * Apply an event to the current state, producing a new state.
     * Must be a pure function — no side effects.
     */
    protected abstract applyEvent(state: TState, event: TEvent, context: TContext): TState;
    /**
     * Define invariants that must hold after every transition.
     * Returns a map of invariant ID → check function.
     */
    protected abstract defineInvariants(): Map<TInvariant, (state: TState) => InvariantResult>;
}
//# sourceMappingURL=governed-resource-runtime.d.ts.map