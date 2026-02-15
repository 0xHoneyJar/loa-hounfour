/**
 * Reusable fast-check arbitraries for economy aggregate events.
 *
 * Generates valid event sequences for escrow, stake, and credit state
 * machines using the STATE_MACHINES vocabulary as the source of truth
 * for valid transitions.
 *
 * @see S2-T2 — v4.6.0 Formalization Release, Sprint 2
 */
import * as fc from 'fast-check';
import { STATE_MACHINES } from '../../src/vocabulary/state-machines.js';
import type { DomainEvent } from '../../src/schemas/domain-event.js';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Arbitrary for a UUID-like string. */
const uuidArb = fc.uuid();

/** Arbitrary for an ISO date-time string in a reasonable range. */
const isoDateArb = fc.integer({
  min: new Date('2024-01-01T00:00:00Z').getTime(),
  max: new Date('2026-12-31T23:59:59Z').getTime(),
}).map((ts) => new Date(ts).toISOString());

/**
 * Arbitrary for a positive BigInt string representing micro-USD amounts.
 * Values range from 1 to 2^53 - 1 to stay within safe integer range
 * while still exercising large amounts.
 */
export function amountMicroArbitrary(): fc.Arbitrary<string> {
  return fc.bigInt({ min: 1n, max: (1n << 53n) - 1n }).map((n) => String(n));
}

// ---------------------------------------------------------------------------
// Event factory
// ---------------------------------------------------------------------------

function makeDomainEvent(
  eventId: string,
  aggregateId: string,
  type: string,
  occurredAt: string,
  actor: string,
  payload: Record<string, unknown>,
): DomainEvent {
  return {
    event_id: eventId,
    aggregate_id: aggregateId,
    aggregate_type: 'economy',
    type,
    version: 1,
    occurred_at: occurredAt,
    actor,
    payload,
    contract_version: '5.0.0',
  } as DomainEvent;
}

// ---------------------------------------------------------------------------
// Escrow lifecycle arbitrary
// ---------------------------------------------------------------------------

/**
 * Generates a valid escrow lifecycle: created event followed by a random
 * walk through the escrow state machine until a terminal state is reached.
 *
 * Each event uses a consistent escrow_id and aggregate_id.
 */
export function escrowLifecycleArbitrary(): fc.Arbitrary<DomainEvent[]> {
  const machine = STATE_MACHINES.escrow;

  return fc.tuple(
    uuidArb,         // escrow_id / aggregate_id
    uuidArb,         // actor
    isoDateArb,      // base timestamp
    amountMicroArbitrary(),
    // Random picks for transition choices (enough for any walk depth)
    fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 10, maxLength: 10 }),
  ).map(([escrowId, actor, baseTs, amount, picks]) => {
    const events: DomainEvent[] = [];
    let eventCounter = 0;

    // Created event (enters initial state)
    events.push(makeDomainEvent(
      `${escrowId}-evt-${eventCounter++}`,
      escrowId,
      'economy.escrow.created',
      baseTs,
      actor,
      { escrow_id: escrowId, amount_micro: amount },
    ));

    // Walk the state machine from initial until terminal
    let currentState = machine.initial;
    for (const pick of picks) {
      const validTargets = machine.transitions
        .filter((t) => t.from === currentState)
        .map((t) => t.to);
      if (validTargets.length === 0) break; // terminal reached

      const nextState = validTargets[pick % validTargets.length];
      const eventType = machine.transitions.find(
        (t) => t.from === currentState && t.to === nextState,
      )!.event!;

      events.push(makeDomainEvent(
        `${escrowId}-evt-${eventCounter++}`,
        escrowId,
        eventType,
        baseTs,
        actor,
        { escrow_id: escrowId, amount_micro: amount },
      ));

      currentState = nextState;
    }

    return events;
  });
}

// ---------------------------------------------------------------------------
// Stake lifecycle arbitrary
// ---------------------------------------------------------------------------

/**
 * Generates a valid stake lifecycle: created event followed by a random
 * walk through the stake state machine until a terminal state is reached.
 */
export function stakeLifecycleArbitrary(): fc.Arbitrary<DomainEvent[]> {
  const machine = STATE_MACHINES.stake;

  return fc.tuple(
    uuidArb,
    uuidArb,
    isoDateArb,
    amountMicroArbitrary(),
    fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 10, maxLength: 10 }),
  ).map(([stakeId, actor, baseTs, amount, picks]) => {
    const events: DomainEvent[] = [];
    let eventCounter = 0;

    events.push(makeDomainEvent(
      `${stakeId}-evt-${eventCounter++}`,
      stakeId,
      'economy.stake.created',
      baseTs,
      actor,
      { stake_id: stakeId, amount_micro: amount },
    ));

    let currentState = machine.initial;
    for (const pick of picks) {
      const validTargets = machine.transitions
        .filter((t) => t.from === currentState)
        .map((t) => t.to);
      if (validTargets.length === 0) break;

      const nextState = validTargets[pick % validTargets.length];
      const eventType = machine.transitions.find(
        (t) => t.from === currentState && t.to === nextState,
      )!.event!;

      events.push(makeDomainEvent(
        `${stakeId}-evt-${eventCounter++}`,
        stakeId,
        eventType,
        baseTs,
        actor,
        { stake_id: stakeId, amount_micro: amount },
      ));

      currentState = nextState;
    }

    return events;
  });
}

// ---------------------------------------------------------------------------
// Credit lifecycle arbitrary
// ---------------------------------------------------------------------------

/**
 * Generates a valid credit lifecycle: extended event followed by settled.
 * The credit machine has only one transition, so the lifecycle is always
 * exactly 2 events.
 */
export function creditLifecycleArbitrary(): fc.Arbitrary<DomainEvent[]> {
  return fc.tuple(
    uuidArb,
    uuidArb,
    isoDateArb,
    amountMicroArbitrary(),
  ).map(([creditId, actor, baseTs, amount]) => {
    return [
      makeDomainEvent(
        `${creditId}-evt-0`,
        creditId,
        'economy.credit.extended',
        baseTs,
        actor,
        { credit_id: creditId, amount_micro: amount },
      ),
      makeDomainEvent(
        `${creditId}-evt-1`,
        creditId,
        'economy.credit.settled',
        baseTs,
        actor,
        { credit_id: creditId, amount_micro: amount },
      ),
    ];
  });
}

// ---------------------------------------------------------------------------
// Mixed economy event sequence arbitrary
// ---------------------------------------------------------------------------

/**
 * Generates an interleaved sequence of events across escrow, stake, and
 * credit state machines. Each sub-lifecycle uses its own entity ID.
 *
 * The result is a single flat array of events from multiple lifecycles,
 * shuffled to test interleaved processing.
 */
export function mixedEconomyEventSequenceArbitrary(): fc.Arbitrary<DomainEvent[]> {
  return fc.tuple(
    fc.array(escrowLifecycleArbitrary(), { minLength: 0, maxLength: 3 }),
    fc.array(stakeLifecycleArbitrary(), { minLength: 0, maxLength: 3 }),
    fc.array(creditLifecycleArbitrary(), { minLength: 0, maxLength: 3 }),
    // Use a seed for deterministic interleaving
    fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 0, maxLength: 50 }),
  ).map(([escrows, stakes, credits, interleaveOrder]) => {
    // Flatten each lifecycle group into queues
    const queues: DomainEvent[][] = [
      escrows.flat(),
      stakes.flat(),
      credits.flat(),
    ];

    const indices = [0, 0, 0];
    const result: DomainEvent[] = [];

    // Interleave events from the three queues
    for (const queueIdx of interleaveOrder) {
      const queue = queues[queueIdx];
      if (indices[queueIdx] < queue.length) {
        result.push(queue[indices[queueIdx]]);
        indices[queueIdx]++;
      }
    }

    // Drain remaining events from all queues
    for (let q = 0; q < queues.length; q++) {
      while (indices[q] < queues[q].length) {
        result.push(queues[q][indices[q]]);
        indices[q]++;
      }
    }

    return result;
  });
}

// ---------------------------------------------------------------------------
// Single valid domain event arbitrary
// ---------------------------------------------------------------------------

/**
 * Generates a single valid DomainEvent for the economy aggregate.
 * Randomly picks an event type from the escrow, stake, or credit machines.
 */
export function validDomainEventArbitrary(): fc.Arbitrary<DomainEvent> {
  const economyEventTypes = [
    'economy.escrow.created',
    'economy.escrow.funded',
    'economy.escrow.released',
    'economy.escrow.disputed',
    'economy.escrow.refunded',
    'economy.escrow.expired',
    'economy.stake.created',
    'economy.stake.slashed',
    'economy.stake.vested',
    'economy.stake.withdrawn',
    'economy.credit.extended',
    'economy.credit.settled',
  ] as const;

  return fc.tuple(
    uuidArb,
    uuidArb,
    fc.constantFrom(...economyEventTypes),
    isoDateArb,
    uuidArb,
    amountMicroArbitrary(),
  ).map(([eventId, aggregateId, type, occurredAt, actor, amount]) => {
    // Build appropriate payload based on event type
    const subAggregate = type.split('.')[1]; // escrow, stake, or credit
    const idKey = `${subAggregate}_id`;
    const payload: Record<string, unknown> = {
      [idKey]: aggregateId,
      amount_micro: amount,
    };

    return makeDomainEvent(eventId, aggregateId, type, occurredAt, actor, payload);
  });
}
