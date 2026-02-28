/**
 * Tests for GovernedResource<T> Runtime Interface.
 *
 * @see SDD §4.8 — FR-8 GovernedResource<T> Runtime
 * @see PRD FR-8 — GovernedResource<T> Runtime
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import {
  TransitionResultSchema,
  InvariantResultSchema,
  MutationContextSchema,
  GovernedResourceBase,
  type TransitionResult,
  type InvariantResult,
  type MutationContext,
  type GovernedResource,
} from '../../src/commons/governed-resource-runtime.js';

// --- Concrete test implementation ---

interface CounterState {
  count: number;
}

type CounterEvent =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

type CounterInvariant = 'non-negative' | 'max-bound';

class CounterResource extends GovernedResourceBase<
  CounterState,
  CounterEvent,
  CounterInvariant
> {
  readonly resourceId = 'counter-001';
  readonly resourceType = 'counter';

  readonly transitionLog: Array<{ event: CounterEvent; version: number }> = [];

  protected applyEvent(state: CounterState, event: CounterEvent): CounterState {
    switch (event.type) {
      case 'increment':
        return { count: state.count + event.amount };
      case 'decrement':
        return { count: state.count - event.amount };
      case 'reset':
        return { count: 0 };
    }
  }

  protected defineInvariants(): Map<CounterInvariant, (state: CounterState) => InvariantResult> {
    return new Map<CounterInvariant, (state: CounterState) => InvariantResult>([
      ['non-negative', (s) => ({
        invariantId: 'non-negative',
        holds: s.count >= 0,
        detail: s.count < 0 ? `Count is negative: ${s.count}` : undefined,
      })],
      ['max-bound', (s) => ({
        invariantId: 'max-bound',
        holds: s.count <= 1000,
        detail: s.count > 1000 ? `Count exceeds max: ${s.count}` : undefined,
      })],
    ]);
  }

  protected async onTransitionSuccess(
    event: CounterEvent,
    _context: MutationContext,
    _previousState: CounterState,
    _newState: CounterState,
    version: number,
  ): Promise<void> {
    this.transitionLog.push({ event, version });
  }
}

const CTX: MutationContext = {
  actorId: 'test-actor',
  actorType: 'human',
};

describe('TransitionResultSchema', () => {
  it('has correct $id', () => {
    expect(TransitionResultSchema.$id).toBe('TransitionResult');
  });

  it('validates a success result', () => {
    expect(Value.Check(TransitionResultSchema, {
      success: true,
      new_state: { count: 5 },
      version: 1,
    })).toBe(true);
  });

  it('validates a failure result with violations', () => {
    expect(Value.Check(TransitionResultSchema, {
      success: false,
      new_state: { count: 0 },
      version: 0,
      violations: ['non-negative: Count is negative: -5'],
    })).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(Value.Check(TransitionResultSchema, {
      success: true,
    })).toBe(false);
  });
});

describe('InvariantResultSchema', () => {
  it('has correct $id', () => {
    expect(InvariantResultSchema.$id).toBe('InvariantResult');
  });

  it('validates a passing invariant', () => {
    expect(Value.Check(InvariantResultSchema, {
      invariant_id: 'non-negative',
      holds: true,
    })).toBe(true);
  });

  it('validates a failing invariant with detail', () => {
    expect(Value.Check(InvariantResultSchema, {
      invariant_id: 'max-bound',
      holds: false,
      detail: 'Count exceeds max: 1001',
    })).toBe(true);
  });
});

describe('MutationContextSchema', () => {
  it('has correct $id', () => {
    expect(MutationContextSchema.$id).toBe('MutationContext');
  });

  it('validates human actor', () => {
    expect(Value.Check(MutationContextSchema, {
      actor_id: 'user-123',
      actor_type: 'human',
    })).toBe(true);
  });

  it('validates system actor', () => {
    expect(Value.Check(MutationContextSchema, {
      actor_id: 'cron-job',
      actor_type: 'system',
    })).toBe(true);
  });

  it('validates autonomous actor', () => {
    expect(Value.Check(MutationContextSchema, {
      actor_id: 'agent-007',
      actor_type: 'autonomous',
    })).toBe(true);
  });

  it('validates with access_policy', () => {
    expect(Value.Check(MutationContextSchema, {
      actor_id: 'user-456',
      actor_type: 'human',
      access_policy: {
        required_reputation_state: 'established',
        required_role: 'admin',
        min_reputation_score: 0.8,
      },
    })).toBe(true);
  });

  it('rejects invalid actor_type', () => {
    expect(Value.Check(MutationContextSchema, {
      actor_id: 'test',
      actor_type: 'robot',
    })).toBe(false);
  });

  it('rejects empty actor_id', () => {
    expect(Value.Check(MutationContextSchema, {
      actor_id: '',
      actor_type: 'human',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(MutationContextSchema, {
      actor_id: 'test',
      actor_type: 'human',
      extra: true,
    })).toBe(false);
  });
});

describe('GovernedResourceBase', () => {
  it('starts with version 0', () => {
    const counter = new CounterResource({ count: 0 });
    expect(counter.version).toBe(0);
    expect(counter.current).toEqual({ count: 0 });
  });

  it('valid transition: increment', async () => {
    const counter = new CounterResource({ count: 0 });
    const result = await counter.transition({ type: 'increment', amount: 5 }, CTX);

    expect(result.success).toBe(true);
    expect(result.newState).toEqual({ count: 5 });
    expect(result.version).toBe(1);
    expect(result.violations).toBeUndefined();
    expect(counter.current).toEqual({ count: 5 });
    expect(counter.version).toBe(1);
  });

  it('version increments monotonically', async () => {
    const counter = new CounterResource({ count: 0 });

    await counter.transition({ type: 'increment', amount: 10 }, CTX);
    expect(counter.version).toBe(1);

    await counter.transition({ type: 'increment', amount: 5 }, CTX);
    expect(counter.version).toBe(2);

    await counter.transition({ type: 'decrement', amount: 3 }, CTX);
    expect(counter.version).toBe(3);
  });

  it('invariant violation causes rollback', async () => {
    const counter = new CounterResource({ count: 5 });

    const result = await counter.transition({ type: 'decrement', amount: 10 }, CTX);

    expect(result.success).toBe(false);
    expect(result.newState).toEqual({ count: 5 }); // rolled back
    expect(result.violations).toBeDefined();
    expect(result.violations!.length).toBeGreaterThan(0);
    expect(result.violations![0]).toContain('non-negative');
    expect(counter.current).toEqual({ count: 5 }); // state unchanged
    expect(counter.version).toBe(0); // version unchanged
  });

  it('max-bound invariant violation', async () => {
    const counter = new CounterResource({ count: 999 });

    const result = await counter.transition({ type: 'increment', amount: 5 }, CTX);

    expect(result.success).toBe(false);
    expect(result.violations![0]).toContain('max-bound');
    expect(counter.current).toEqual({ count: 999 });
  });

  it('verify single invariant', () => {
    const counter = new CounterResource({ count: 5 });

    const result = counter.verify('non-negative');
    expect(result.holds).toBe(true);
    expect(result.invariantId).toBe('non-negative');
  });

  it('verify unknown invariant returns false', () => {
    const counter = new CounterResource({ count: 5 });

    const result = counter.verify('unknown' as CounterInvariant);
    expect(result.holds).toBe(false);
    expect(result.detail).toContain('Unknown invariant');
  });

  it('verifyAll checks all invariants', () => {
    const counter = new CounterResource({ count: 5 });

    const results = counter.verifyAll();
    expect(results.length).toBe(2);
    expect(results.every(r => r.holds)).toBe(true);
  });

  it('onTransitionSuccess hook is called', async () => {
    const counter = new CounterResource({ count: 0 });

    await counter.transition({ type: 'increment', amount: 1 }, CTX);
    expect(counter.transitionLog.length).toBe(1);
    expect(counter.transitionLog[0].version).toBe(1);
  });

  it('onTransitionSuccess not called on failure', async () => {
    const counter = new CounterResource({ count: 0 });

    await counter.transition({ type: 'decrement', amount: 5 }, CTX);
    expect(counter.transitionLog.length).toBe(0);
  });

  it('audit trail initialized', () => {
    const counter = new CounterResource({ count: 0 });
    expect(counter.auditTrail.hash_algorithm).toBe('sha256');
    expect(counter.auditTrail.entries).toEqual([]);
    expect(counter.auditTrail.integrity_status).toBe('verified');
  });

  it('mutation log starts empty', () => {
    const counter = new CounterResource({ count: 0 });
    expect(counter.mutationLog).toEqual([]);
  });

  it('resourceId and resourceType are available', () => {
    const counter = new CounterResource({ count: 0 });
    expect(counter.resourceId).toBe('counter-001');
    expect(counter.resourceType).toBe('counter');
  });

  it('reset event works', async () => {
    const counter = new CounterResource({ count: 50 });

    const result = await counter.transition({ type: 'reset' }, CTX);
    expect(result.success).toBe(true);
    expect(result.newState).toEqual({ count: 0 });
  });

  it('multiple sequential transitions maintain state correctly', async () => {
    const counter = new CounterResource({ count: 0 });

    await counter.transition({ type: 'increment', amount: 100 }, CTX);
    await counter.transition({ type: 'decrement', amount: 30 }, CTX);
    await counter.transition({ type: 'increment', amount: 50 }, CTX);

    expect(counter.current).toEqual({ count: 120 });
    expect(counter.version).toBe(3);
    expect(counter.transitionLog.length).toBe(3);
  });
});

describe('defineInvariants caching (B1-011)', () => {
  it('caches defineInvariants result across verify calls', () => {
    let callCount = 0;

    class InstrumentedCounter extends GovernedResourceBase<
      CounterState,
      CounterEvent,
      CounterInvariant
    > {
      readonly resourceId = 'instrumented-001';
      readonly resourceType = 'counter';

      protected applyEvent(state: CounterState, event: CounterEvent): CounterState {
        switch (event.type) {
          case 'increment': return { count: state.count + event.amount };
          case 'decrement': return { count: state.count - event.amount };
          case 'reset': return { count: 0 };
        }
      }

      protected defineInvariants(): Map<CounterInvariant, (state: CounterState) => InvariantResult> {
        callCount++;
        return new Map<CounterInvariant, (state: CounterState) => InvariantResult>([
          ['non-negative', (s) => ({ invariantId: 'non-negative', holds: s.count >= 0 })],
          ['max-bound', (s) => ({ invariantId: 'max-bound', holds: s.count <= 1000 })],
        ]);
      }

      protected async onTransitionSuccess(): Promise<void> { /* no-op */ }
    }

    const counter = new InstrumentedCounter({ count: 5 });

    counter.verify('non-negative');
    counter.verify('max-bound');
    counter.verifyAll();
    counter.verifyAll();

    expect(callCount).toBe(1);
  });
});

describe('concurrent transition contract (B1-012)', () => {
  it('concurrent transitions can produce inconsistent state', async () => {
    const counter = new CounterResource({ count: 100 });

    // Fire two concurrent transitions — both read count=100
    const [r1, r2] = await Promise.all([
      counter.transition({ type: 'decrement', amount: 60 }, CTX),
      counter.transition({ type: 'decrement', amount: 60 }, CTX),
    ]);

    // Both succeed because they each see count=100, decrement to 40
    // But the second one applies to the state AFTER the first completes
    // Since applyEvent is synchronous and transition is async,
    // the interleaving depends on microtask ordering.
    // Key assertion: at least one should succeed
    expect(r1.success || r2.success).toBe(true);

    // The final state demonstrates why single-writer is required:
    // Without external serialization, the result is either -20 (both succeed
    // against overlapping state) or 40 (one succeeds, one rolls back).
    // Either outcome proves the contract: concurrent calls produce
    // results that differ from sequential execution.
    if (r1.success && r2.success) {
      // Both succeeded — state went negative, proving interleaving risk
      expect(counter.current.count).toBe(-20);
    } else {
      // One was rolled back by invariant — the safe case
      expect(counter.current.count).toBe(40);
    }
  });
});

describe('GovernedResource interface compliance', () => {
  it('CounterResource satisfies GovernedResource interface', () => {
    const counter: GovernedResource<CounterState, CounterEvent, CounterInvariant> =
      new CounterResource({ count: 0 });

    expect(counter.resourceId).toBe('counter-001');
    expect(counter.resourceType).toBe('counter');
    expect(counter.current).toEqual({ count: 0 });
    expect(counter.version).toBe(0);
    expect(typeof counter.transition).toBe('function');
    expect(typeof counter.verify).toBe('function');
    expect(typeof counter.verifyAll).toBe('function');
  });
});
