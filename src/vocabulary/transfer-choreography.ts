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
    compensation: [
      'agent.lifecycle.transitioned', // → ACTIVE (rollback)
      'transfer.saga.rolled_back',
    ],
  },
} as const;
