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
import { Type, type Static } from '@sinclair/typebox';

// --- Schemas for cross-language vectors ---

/**
 * Result of a GovernedResource state transition.
 */
export const TransitionResultSchema = Type.Object(
  {
    success: Type.Boolean(),
    new_state: Type.Unknown({ description: 'The state after transition (type varies per resource).' }),
    version: Type.Integer({ minimum: 0 }),
    violations: Type.Optional(Type.Array(Type.String())),
  },
  {
    $id: 'TransitionResult',
    additionalProperties: false,
    description: 'Result of a GovernedResource state transition.',
  },
);

export type TransitionResultStatic = Static<typeof TransitionResultSchema>;

/**
 * Result of checking a single invariant on a GovernedResource.
 */
export const InvariantResultSchema = Type.Object(
  {
    invariant_id: Type.String({ minLength: 1 }),
    holds: Type.Boolean(),
    detail: Type.Optional(Type.String()),
  },
  {
    $id: 'InvariantResult',
    additionalProperties: false,
    description: 'Result of checking a single invariant on a GovernedResource.',
  },
);

export type InvariantResultStatic = Static<typeof InvariantResultSchema>;

/**
 * Context for a governed resource mutation — actor identity, type, and access policy.
 * Generalized from freeside's CreditMutationContext (6-witness pattern).
 */
export const MutationContextSchema = Type.Object(
  {
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
  },
  {
    $id: 'MutationContext',
    additionalProperties: false,
    description:
      'Context for a governed resource mutation — actor identity, type, and access policy. '
      + 'Generalized from freeside\'s CreditMutationContext (6-witness pattern).',
  },
);

export type MutationContextStatic = Static<typeof MutationContextSchema>;

// --- TypeScript interfaces ---

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
export interface GovernedResource<
  TState,
  TEvent,
  TInvariant extends string = string,
> {
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
export abstract class GovernedResourceBase<
  TState,
  TEvent,
  TInvariant extends string = string,
  TContext extends MutationContext = MutationContext,
> implements GovernedResource<TState, TEvent, TInvariant> {
  abstract readonly resourceId: string;
  abstract readonly resourceType: string;

  private _state: TState;
  private _version: number;
  private _auditTrail: AuditTrail;
  private _mutationLog: GovernanceMutation[];

  constructor(initialState: TState) {
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

  get current(): TState { return this._state; }
  get version(): number { return this._version; }
  get auditTrail(): Readonly<AuditTrail> { return this._auditTrail; }
  get mutationLog(): ReadonlyArray<GovernanceMutation> { return this._mutationLog; }

  async transition(event: TEvent, context: TContext): Promise<TransitionResult<TState>> {
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
   * Hook called after a successful transition. Subclasses MUST implement to:
   * - Append to audit trail (via computeChainBoundHash or computeAuditEntryHash)
   * - Append to mutation log
   * - Perform post-transition side effects (e.g., event emission)
   *
   * The base class does NOT auto-append — this is intentional to avoid
   * coupling the abstract base to a specific persistence model.
   */
  protected abstract onTransitionSuccess(
    event: TEvent,
    context: TContext,
    previousState: TState,
    newState: TState,
    version: number,
  ): Promise<void>;

  /**
   * Hook called after a failed transition (invariant violation, rollback).
   * Optional override — default is no-op.
   */
  protected async onTransitionFailure(
    _event: TEvent,
    _context: TContext,
    _violations: InvariantResult[],
  ): Promise<void> { /* no-op by default */ }

  verify(invariantId: TInvariant): InvariantResult {
    const invariants = this.defineInvariants();
    const check = invariants.get(invariantId);
    if (!check) {
      return { invariantId, holds: false, detail: `Unknown invariant: ${invariantId}` };
    }
    return check(this._state);
  }

  verifyAll(): InvariantResult[] {
    const invariants = this.defineInvariants();
    return Array.from(invariants.entries()).map(([id, check]) => {
      const result = check(this._state);
      return { ...result, invariant_id: id };
    });
  }

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
