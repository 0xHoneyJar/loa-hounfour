/**
 * L2 Temporal Property Tests — random event sequence consistency.
 *
 * Uses fast-check to generate random sequences of domain events and
 * verify that the ProtocolStateTracker maintains invariant consistency
 * regardless of event ordering or content.
 *
 * @see S6-T3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ProtocolStateTracker,
  VALID_REJECTION_REASONS,
} from '../../src/test-infrastructure/protocol-state-tracker.js';
import { AGENT_LIFECYCLE_STATES, AGENT_LIFECYCLE_TRANSITIONS } from '../../src/schemas/agent-lifecycle.js';
import type { AgentLifecycleState } from '../../src/schemas/agent-lifecycle.js';
import type { DomainEvent } from '../../src/schemas/domain-event.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const AGGREGATE_TYPES = [
  'agent',
  'billing',
  'conversation',
  'transfer',
  'tool',
  'message',
  'performance',
  'governance',
  'reputation',
  'economy',
] as const;

type AggregateType = (typeof AGGREGATE_TYPES)[number];

/** Noun segments for event type generation, keyed by aggregate. */
const EVENT_NOUNS: Record<AggregateType, string[]> = {
  agent: ['lifecycle', 'descriptor', 'capability'],
  billing: ['entry', 'credit', 'allocation'],
  conversation: ['thread', 'message', 'policy'],
  transfer: ['spec', 'escrow', 'result'],
  tool: ['call', 'result', 'registry'],
  message: ['content', 'delivery', 'moderation'],
  performance: ['record', 'outcome', 'metric'],
  governance: ['sanction', 'dispute', 'vote'],
  reputation: ['score', 'component', 'decay'],
  economy: ['escrow', 'stake', 'dividend'],
};

/** Verb segments for event type generation. */
const EVENT_VERBS = [
  'created',
  'updated',
  'transitioned',
  'deleted',
  'imposed',
  'resolved',
  'sealed',
  'completed',
];

/** Arbitrary for a UUID-like string. */
const uuidArb = fc.uuid();

/** Arbitrary for an ISO date-time string. */
const isoDateArb = fc.integer({
  min: new Date('2024-01-01T00:00:00Z').getTime(),
  max: new Date('2026-12-31T23:59:59Z').getTime(),
}).map((ts) => new Date(ts).toISOString());

/** Arbitrary for an aggregate type. */
const aggregateTypeArb = fc.constantFrom(...AGGREGATE_TYPES);

/** Build a dotted event type string for a given aggregate. */
function eventTypeArb(aggregate: AggregateType): fc.Arbitrary<string> {
  const nouns = EVENT_NOUNS[aggregate];
  return fc.tuple(
    fc.constantFrom(...nouns),
    fc.constantFrom(...EVENT_VERBS),
  ).map(([noun, verb]) => `${aggregate}.${noun}.${verb}`);
}

/** Lifecycle states usable as from/to in transition payloads. */
const lifecycleStateArb = fc.constantFrom(...AGENT_LIFECYCLE_STATES);

/**
 * Generic domain event arbitrary — covers all 10 aggregate types.
 *
 * Agent lifecycle.transitioned events get `from_state` / `to_state` in the
 * payload; governance sanction.imposed events get `evidence_event_ids`.
 * All others get an empty payload.
 */
const eventArbitrary: fc.Arbitrary<DomainEvent> = aggregateTypeArb.chain((aggType) => {
  return fc.tuple(
    uuidArb,                   // event_id
    uuidArb,                   // aggregate_id
    eventTypeArb(aggType),     // type
    isoDateArb,                // occurred_at
    uuidArb,                   // actor
    // Conditional payload components
    lifecycleStateArb,         // potential from_state
    lifecycleStateArb,         // potential to_state
    fc.array(uuidArb, { minLength: 0, maxLength: 3 }), // potential evidence_event_ids
  ).map(([eventId, aggId, type, occurredAt, actor, fromState, toState, evidenceIds]) => {
    let payload: Record<string, unknown> = {};

    // Agent lifecycle transition events need from/to states
    if (aggType === 'agent' && type === 'agent.lifecycle.transitioned') {
      payload = { from_state: fromState, to_state: toState };
    }

    // Governance sanction.imposed events need evidence
    if (aggType === 'governance' && type === 'governance.sanction.imposed') {
      payload = { evidence_event_ids: evidenceIds };
    }

    return {
      event_id: eventId,
      aggregate_id: aggId,
      aggregate_type: aggType,
      type,
      version: 1,
      occurred_at: occurredAt,
      actor,
      payload,
      contract_version: '4.4.0',
    } as DomainEvent;
  });
});

/** Arbitrary for a sequence of 2-20 random domain events. */
const eventSequenceArb = fc.array(eventArbitrary, { minLength: 2, maxLength: 20 });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('L2 Temporal Property Tests (S6-T3)', () => {
  describe('random event sequence consistency', () => {
    it('state is always consistent after applying any random event sequence', () => {
      fc.assert(
        fc.property(eventSequenceArb, (events) => {
          const tracker = new ProtocolStateTracker();

          for (const event of events) {
            const result = tracker.apply(event);

            // Every event either applies or is rejected with a valid reason
            if (!result.applied) {
              expect(result.reason).toBeDefined();
              expect(VALID_REJECTION_REASONS).toContain(result.reason);
            }
          }

          expect(tracker.isConsistent()).toBe(true);
        }),
        { numRuns: 500 },
      );
    });

    it('every rejection reason is from the canonical VALID_REJECTION_REASONS list', () => {
      fc.assert(
        fc.property(eventSequenceArb, (events) => {
          const tracker = new ProtocolStateTracker();
          const collectedReasons: string[] = [];

          for (const event of events) {
            const result = tracker.apply(event);
            if (!result.applied && result.reason) {
              collectedReasons.push(result.reason);
            }
          }

          for (const reason of collectedReasons) {
            expect(
              (VALID_REJECTION_REASONS as readonly string[]).includes(reason),
            ).toBe(true);
          }
        }),
        { numRuns: 500 },
      );
    });
  });

  describe('agent lifecycle transitions', () => {
    it('valid transitions are accepted', () => {
      // For each valid transition in the state machine, construct an event
      // and verify the tracker accepts it.
      for (const from of AGENT_LIFECYCLE_STATES) {
        const validTargets = AGENT_LIFECYCLE_TRANSITIONS[from];
        for (const to of validTargets) {
          const tracker = new ProtocolStateTracker();

          // Seed the agent with the from_state via an initial transition
          // (unless from is DORMANT, which requires no prior state)
          if (from !== 'DORMANT') {
            // Establish agent at `from` state via direct DORMANT -> ... chain
            // For simplicity, just apply a transition where from_state matches
            // what we need — the tracker accepts first-seen agents at any from_state
            const seedEvent: DomainEvent = {
              event_id: `seed-${from}-${to}`,
              aggregate_id: 'agent-lifecycle-test',
              aggregate_type: 'agent',
              type: 'agent.lifecycle.transitioned',
              version: 1,
              occurred_at: new Date().toISOString(),
              actor: 'test',
              payload: { from_state: 'DORMANT', to_state: from },
              contract_version: '4.4.0',
            } as DomainEvent;

            // This may or may not be a valid transition (DORMANT -> from),
            // so only proceed if it is
            const seedResult = tracker.apply(seedEvent);
            if (!seedResult.applied) continue;
          }

          const event: DomainEvent = {
            event_id: `test-${from}-${to}`,
            aggregate_id: 'agent-lifecycle-test',
            aggregate_type: 'agent',
            type: 'agent.lifecycle.transitioned',
            version: 1,
            occurred_at: new Date().toISOString(),
            actor: 'test',
            payload: { from_state: from, to_state: to },
            contract_version: '4.4.0',
          } as DomainEvent;

          const result = tracker.apply(event);
          expect(result.applied).toBe(true);
          expect(tracker.isConsistent()).toBe(true);
        }
      }
    });

    it('invalid transitions are rejected', () => {
      fc.assert(
        fc.property(
          lifecycleStateArb,
          lifecycleStateArb,
          uuidArb,
          (from, to, agentId) => {
            const validTargets = AGENT_LIFECYCLE_TRANSITIONS[from] as readonly AgentLifecycleState[];
            if (validTargets.includes(to)) return; // skip valid transitions

            const tracker = new ProtocolStateTracker();
            const event: DomainEvent = {
              event_id: `invalid-${from}-${to}-${agentId}`,
              aggregate_id: agentId,
              aggregate_type: 'agent',
              type: 'agent.lifecycle.transitioned',
              version: 1,
              occurred_at: new Date().toISOString(),
              actor: 'test',
              payload: { from_state: from, to_state: to },
              contract_version: '4.4.0',
            } as DomainEvent;

            const result = tracker.apply(event);
            expect(result.applied).toBe(false);
            expect(result.reason).toBe('invalid_lifecycle_transition');
          },
        ),
        { numRuns: 500 },
      );
    });
  });

  describe('event deduplication', () => {
    it('duplicate event_ids are rejected', () => {
      fc.assert(
        fc.property(eventArbitrary, (event) => {
          const tracker = new ProtocolStateTracker();

          const firstResult = tracker.apply(event);
          // First application may succeed or fail for other reasons
          // but second application must be rejected as duplicate
          const secondResult = tracker.apply(event);
          expect(secondResult.applied).toBe(false);
          expect(secondResult.reason).toBe('duplicate_event_id');
          expect(tracker.isConsistent()).toBe(true);
        }),
        { numRuns: 500 },
      );
    });

    it('events with distinct IDs are not treated as duplicates', () => {
      fc.assert(
        fc.property(
          uuidArb,
          uuidArb,
          fc.constantFrom('billing', 'conversation', 'tool', 'message') as fc.Arbitrary<AggregateType>,
          isoDateArb,
          (id1, id2, aggType, occurredAt) => {
            fc.pre(id1 !== id2); // ensure distinct

            const tracker = new ProtocolStateTracker();
            const makeEvent = (eventId: string): DomainEvent => ({
              event_id: eventId,
              aggregate_id: 'agg-1',
              aggregate_type: aggType,
              type: `${aggType}.item.created`,
              version: 1,
              occurred_at: occurredAt,
              actor: 'test',
              payload: {},
              contract_version: '4.4.0',
            } as DomainEvent);

            const r1 = tracker.apply(makeEvent(id1));
            const r2 = tracker.apply(makeEvent(id2));

            expect(r1.applied).toBe(true);
            expect(r2.applied).toBe(true);
          },
        ),
        { numRuns: 500 },
      );
    });
  });

  describe('unknown / novel aggregate types', () => {
    it('events with all 10 aggregate types process without error', () => {
      fc.assert(
        fc.property(eventArbitrary, (event) => {
          const tracker = new ProtocolStateTracker();
          // Should never throw regardless of aggregate type
          const result = tracker.apply(event);
          expect(typeof result.applied).toBe('boolean');
          if (!result.applied) {
            expect(result.reason).toBeDefined();
          }
          expect(tracker.isConsistent()).toBe(true);
        }),
        { numRuns: 500 },
      );
    });
  });

  describe('governance / sanction events', () => {
    it('sanction.imposed events without evidence are rejected', () => {
      fc.assert(
        fc.property(uuidArb, uuidArb, isoDateArb, (eventId, aggId, occurredAt) => {
          const tracker = new ProtocolStateTracker();

          const event: DomainEvent = {
            event_id: eventId,
            aggregate_id: aggId,
            aggregate_type: 'governance',
            type: 'governance.sanction.imposed',
            version: 1,
            occurred_at: occurredAt,
            actor: 'test',
            payload: { evidence_event_ids: [] }, // empty evidence
            contract_version: '4.4.0',
          } as DomainEvent;

          const result = tracker.apply(event);
          expect(result.applied).toBe(false);
          expect(result.reason).toBe('sanction_missing_evidence');
        }),
        { numRuns: 500 },
      );
    });

    it('sanction.imposed events with evidence are accepted', () => {
      fc.assert(
        fc.property(
          uuidArb,
          uuidArb,
          isoDateArb,
          fc.array(uuidArb, { minLength: 1, maxLength: 5 }),
          (eventId, aggId, occurredAt, evidenceIds) => {
            const tracker = new ProtocolStateTracker();

            const event: DomainEvent = {
              event_id: eventId,
              aggregate_id: aggId,
              aggregate_type: 'governance',
              type: 'governance.sanction.imposed',
              version: 1,
              occurred_at: occurredAt,
              actor: 'test',
              payload: { evidence_event_ids: evidenceIds },
              contract_version: '4.4.0',
            } as DomainEvent;

            const result = tracker.apply(event);
            expect(result.applied).toBe(true);
            expect(tracker.isConsistent()).toBe(true);
          },
        ),
        { numRuns: 500 },
      );
    });

    it('sanction.imposed events with missing evidence_event_ids field are rejected', () => {
      const tracker = new ProtocolStateTracker();

      const event: DomainEvent = {
        event_id: 'no-evidence-field',
        aggregate_id: 'gov-1',
        aggregate_type: 'governance',
        type: 'governance.sanction.imposed',
        version: 1,
        occurred_at: new Date().toISOString(),
        actor: 'test',
        payload: {}, // no evidence_event_ids at all
        contract_version: '4.4.0',
      } as DomainEvent;

      const result = tracker.apply(event);
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('sanction_missing_evidence');
    });
  });
});
