/**
 * Transfer saga choreography — expected event sequences per TransferScenario.
 *
 * This is the "state machine documentation" that tells Go/Python consumers
 * what events to expect during a transfer. Each scenario maps to an ordered
 * array of EventType values representing the forward (happy-path) sequence,
 * plus a compensation (rollback) sequence for failure recovery.
 *
 * Choreography is *expected*, not enforced — the schema validates individual
 * events, not their ordering. This constant enables consumer-side assertions
 * and monitoring dashboards.
 *
 * @see BB-POST-002 — Transfer saga choreography specification
 */
import type { EventType } from './event-types.js';
import type { TransferScenario } from '../schemas/transfer-spec.js';

/**
 * Choreography for a single transfer scenario:
 * forward path (happy) and compensation path (rollback).
 */
export interface ScenarioChoreography {
  /** Ordered event sequence for the successful (forward) path. */
  readonly forward: readonly EventType[];
  /** Ordered event sequence for compensation (rollback) on failure. */
  readonly compensation: readonly EventType[];
}

/** Maps each TransferScenario to its expected event choreography. */
export type TransferChoreography = Readonly<Record<TransferScenario, ScenarioChoreography>>;

/**
 * Expected event sequences for each transfer scenario.
 *
 * **sale**: Full lifecycle — initiate, seal conversations, transition agent,
 * create billing entry, complete saga.
 *
 * **gift**: Like sale but no billing entry (no financial transaction).
 *
 * **admin_recovery**: Administrative override — no conversation sealing
 * (admin has access to all data). Minimal ceremony.
 *
 * **custody_change**: Organizational custody transfer — seals conversations
 * but no billing (internal transfer).
 *
 * ### Compensation and Sealed Conversations
 *
 * Compensation paths do NOT unseal conversations. Sealed conversations remain
 * sealed after a rollback — this is intentional:
 *
 * 1. **Data integrity**: Unsealing requires decryption key re-derivation, which
 *    may not be possible if the key material was rotated during the transfer.
 * 2. **Audit trail**: The sealing event is part of the permanent event log.
 *    Unsealing would require a separate `conversation.thread.unsealed` event
 *    type (not yet defined in the vocabulary).
 * 3. **Admin override**: If conversations must be restored after a failed
 *    transfer, an admin can issue explicit unsealing through the admin_recovery
 *    scenario, which bypasses sealing entirely.
 *
 * This matches the Kubernetes pattern: a drained pod's data volumes are not
 * automatically re-mounted if the drain fails — recovery requires explicit action.
 */
export const TRANSFER_CHOREOGRAPHY: TransferChoreography = {
  sale: {
    forward: [
      'transfer.saga.initiated',
      'conversation.thread.sealed',
      'agent.lifecycle.transitioned', // → TRANSFERRED
      'billing.entry.created',
      'transfer.saga.completed',
    ],
    // Compensation: void billing, rollback lifecycle. Conversations remain sealed.
    compensation: [
      'billing.entry.voided',
      'agent.lifecycle.transitioned', // → ACTIVE (rollback)
      'transfer.saga.rolled_back',
    ],
  },

  gift: {
    forward: [
      'transfer.saga.initiated',
      'conversation.thread.sealed',
      'agent.lifecycle.transitioned', // → TRANSFERRED
      'transfer.saga.completed',
    ],
    // Compensation: rollback lifecycle. Conversations remain sealed.
    compensation: [
      'agent.lifecycle.transitioned', // → ACTIVE (rollback)
      'transfer.saga.rolled_back',
    ],
  },

  admin_recovery: {
    forward: [
      'transfer.saga.initiated',
      'agent.lifecycle.transitioned', // → TRANSFERRED
      'transfer.saga.completed',
    ],
    // Compensation: rollback lifecycle. No conversations were sealed (admin override).
    compensation: [
      'agent.lifecycle.transitioned', // → ACTIVE (rollback)
      'transfer.saga.rolled_back',
    ],
  },

  custody_change: {
    forward: [
      'transfer.saga.initiated',
      'conversation.thread.sealed',
      'agent.lifecycle.transitioned', // → TRANSFERRED
      'transfer.saga.completed',
    ],
    // Compensation: rollback lifecycle. Conversations remain sealed.
    compensation: [
      'agent.lifecycle.transitioned', // → ACTIVE (rollback)
      'transfer.saga.rolled_back',
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Transfer Invariants (v2.4.0, BB-C4-ADV-002)
//
// Safety properties that must hold regardless of event ordering or
// compensation failure. These transform the choreography from "expected
// event sequences" to "expected event sequences with safety invariants" —
// the difference between a state machine diagram and a TLA+ specification.
// ---------------------------------------------------------------------------

/**
 * A safety property that must hold for a transfer scenario.
 */
export interface TransferInvariant {
  /** Human-readable description of the invariant. */
  readonly description: string;
  /**
   * Whether this invariant can be enforced at the protocol layer (true)
   * or is a service-layer responsibility (false).
   */
  readonly enforceable: boolean;
  /** How this invariant is or should be enforced. */
  readonly enforcement_mechanism: string;
}

/** Maps each TransferScenario to its safety invariants. */
export type TransferInvariants = Readonly<Record<TransferScenario, readonly TransferInvariant[]>>;

/**
 * Safety invariants for each transfer scenario.
 *
 * These properties must hold regardless of event ordering, network
 * partitions, or compensation failure. When compensation itself fails
 * (the "sad path of sad path"), these invariants describe what the
 * system MUST guarantee.
 *
 * **What happens when compensation fails?**
 *
 * 1. **billing_atomicity**: If `billing.entry.voided` fails after
 *    `billing.entry.created`, the billing store enters an inconsistent
 *    state. The invariant requires that voiding MUST eventually succeed
 *    (at-least-once delivery with idempotent void). Consumers should
 *    implement a dead letter queue for failed voids.
 *
 * 2. **seal_permanence**: Sealed conversations stay sealed regardless
 *    of saga outcome. This is a design choice, not a limitation. See
 *    the TSDoc on `TRANSFER_CHOREOGRAPHY` for rationale.
 *
 * 3. **terminal_event_exactly_once**: The saga MUST produce exactly one
 *    of `saga.completed` or `saga.rolled_back`. If neither fires
 *    (e.g., process crash), a saga recovery sweep must detect orphaned
 *    sagas and emit the terminal event.
 *
 * @see BB-C4-ADV-002 — No spec for compensation failure
 */
export const TRANSFER_INVARIANTS: TransferInvariants = {
  sale: [
    {
      description: 'If billing.entry.created fires, billing.entry.voided MUST fire on compensation',
      enforceable: false,
      enforcement_mechanism: 'Service-layer: idempotent void with dead letter queue for failures',
    },
    {
      description: 'Sealed conversations remain sealed regardless of saga outcome',
      enforceable: true,
      enforcement_mechanism: 'Protocol: no conversation.thread.unsealed event in compensation path',
    },
    {
      description: 'Exactly one of saga.completed or saga.rolled_back must fire',
      enforceable: false,
      enforcement_mechanism: 'Service-layer: saga timeout sweep detects orphaned sagas',
    },
    {
      description: 'Agent returns to ACTIVE on compensation (not to a third state)',
      enforceable: true,
      enforcement_mechanism: 'Protocol: compensation path lifecycle event targets ACTIVE explicitly',
    },
  ],

  gift: [
    {
      description: 'Sealed conversations remain sealed regardless of saga outcome',
      enforceable: true,
      enforcement_mechanism: 'Protocol: no conversation.thread.unsealed event in compensation path',
    },
    {
      description: 'Exactly one of saga.completed or saga.rolled_back must fire',
      enforceable: false,
      enforcement_mechanism: 'Service-layer: saga timeout sweep detects orphaned sagas',
    },
    {
      description: 'No billing events produced (gift is non-financial)',
      enforceable: true,
      enforcement_mechanism: 'Protocol: gift choreography has no billing.entry.* events',
    },
  ],

  admin_recovery: [
    {
      description: 'No conversations sealed (admin has full access)',
      enforceable: true,
      enforcement_mechanism: 'Protocol: admin_recovery choreography has no conversation.thread.sealed event',
    },
    {
      description: 'Exactly one of saga.completed or saga.rolled_back must fire',
      enforceable: false,
      enforcement_mechanism: 'Service-layer: saga timeout sweep detects orphaned sagas',
    },
  ],

  custody_change: [
    {
      description: 'Sealed conversations remain sealed regardless of saga outcome',
      enforceable: true,
      enforcement_mechanism: 'Protocol: no conversation.thread.unsealed event in compensation path',
    },
    {
      description: 'Exactly one of saga.completed or saga.rolled_back must fire',
      enforceable: false,
      enforcement_mechanism: 'Service-layer: saga timeout sweep detects orphaned sagas',
    },
    {
      description: 'No billing events produced (internal transfer)',
      enforceable: true,
      enforcement_mechanism: 'Protocol: custody_change choreography has no billing.entry.* events',
    },
  ],
} as const;
