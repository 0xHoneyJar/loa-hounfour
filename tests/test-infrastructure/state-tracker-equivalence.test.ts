/**
 * Behavioral equivalence tests for the ProtocolStateTracker refactor.
 *
 * Verifies that the data-driven STATE_MACHINES-based implementation
 * produces identical results to the original hardcoded implementation
 * for all existing event sequences.
 *
 * @see S1-T3, S1-T5 — v4.6.0 Formalization Release
 */
import { describe, it, expect } from 'vitest';
import {
  ProtocolStateTracker,
  VALID_REJECTION_REASONS,
} from '../../src/test-infrastructure/protocol-state-tracker.js';
import { STATE_MACHINES } from '../../src/vocabulary/state-machines.js';
import type { DomainEvent } from '../../src/schemas/domain-event.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let eventCounter = 0;

function makeEconomyEvent(
  type: string,
  aggregateId: string,
  payload: Record<string, unknown> = {},
): DomainEvent {
  eventCounter++;
  return {
    event_id: `evt-equiv-${eventCounter}-${Date.now()}`,
    aggregate_id: aggregateId,
    aggregate_type: 'economy',
    type,
    version: 1,
    occurred_at: new Date().toISOString(),
    actor: 'test',
    payload,
    contract_version: '4.6.0',
  } as DomainEvent;
}

// ---------------------------------------------------------------------------
// Escrow equivalence
// ---------------------------------------------------------------------------

describe('ProtocolStateTracker — Escrow behavioral equivalence (S1-T3)', () => {
  it('created sets initial state from STATE_MACHINES.escrow.initial', () => {
    const tracker = new ProtocolStateTracker();
    const r = tracker.apply(
      makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }),
    );
    expect(r.applied).toBe(true);
    // Can release (held -> released is valid)
    const r2 = tracker.apply(
      makeEconomyEvent('economy.escrow.released', 'e1', { escrow_id: 'e1' }),
    );
    expect(r2.applied).toBe(true);
  });

  it('held -> released (valid, same as before)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }));
    const r = tracker.apply(makeEconomyEvent('economy.escrow.released', 'e1', { escrow_id: 'e1' }));
    expect(r.applied).toBe(true);
  });

  it('held -> expired (valid, same as before)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }));
    const r = tracker.apply(makeEconomyEvent('economy.escrow.expired', 'e1', { escrow_id: 'e1' }));
    expect(r.applied).toBe(true);
  });

  it('released -> refunded (invalid — released is terminal)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }));
    tracker.apply(makeEconomyEvent('economy.escrow.released', 'e1', { escrow_id: 'e1' }));
    const r = tracker.apply(makeEconomyEvent('economy.escrow.refunded', 'e1', { escrow_id: 'e1' }));
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('invalid_escrow_transition');
  });

  it('unknown escrow returns escrow_not_found', () => {
    const tracker = new ProtocolStateTracker();
    const r = tracker.apply(
      makeEconomyEvent('economy.escrow.released', 'missing', { escrow_id: 'missing' }),
    );
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('escrow_not_found');
  });

  it('funded is a passthrough (no state change)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }));
    const r = tracker.apply(makeEconomyEvent('economy.escrow.funded', 'e1', { escrow_id: 'e1' }));
    expect(r.applied).toBe(true);
    // Can still release after funded
    const r2 = tracker.apply(makeEconomyEvent('economy.escrow.released', 'e1', { escrow_id: 'e1' }));
    expect(r2.applied).toBe(true);
  });

  it('getOrphanedEscrows still works after refactor', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'o1', { escrow_id: 'o1' }));
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'o2', { escrow_id: 'o2' }));
    tracker.apply(makeEconomyEvent('economy.escrow.released', 'o2', { escrow_id: 'o2' }));
    const orphaned = tracker.getOrphanedEscrows();
    expect(orphaned).toContain('o1');
    expect(orphaned).not.toContain('o2');
  });

  it('held -> disputed (new capability via STATE_MACHINES)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }));
    const r = tracker.apply(
      makeEconomyEvent('economy.escrow.disputed', 'e1', { escrow_id: 'e1' }),
    );
    expect(r.applied).toBe(true);
  });

  it('disputed -> refunded (new capability via STATE_MACHINES)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }));
    tracker.apply(makeEconomyEvent('economy.escrow.disputed', 'e1', { escrow_id: 'e1' }));
    const r = tracker.apply(
      makeEconomyEvent('economy.escrow.refunded', 'e1', { escrow_id: 'e1' }),
    );
    expect(r.applied).toBe(true);
  });

  it('disputed -> released (new capability via STATE_MACHINES)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.escrow.created', 'e1', { escrow_id: 'e1' }));
    tracker.apply(makeEconomyEvent('economy.escrow.disputed', 'e1', { escrow_id: 'e1' }));
    const r = tracker.apply(
      makeEconomyEvent('economy.escrow.released', 'e1', { escrow_id: 'e1' }),
    );
    expect(r.applied).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stake equivalence
// ---------------------------------------------------------------------------

describe('ProtocolStateTracker — Stake behavioral equivalence (S1-T3)', () => {
  it('created -> vested -> withdrawn', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.stake.created', 's1', { stake_id: 's1' }));
    const r1 = tracker.apply(makeEconomyEvent('economy.stake.vested', 's1', { stake_id: 's1' }));
    expect(r1.applied).toBe(true);
    const r2 = tracker.apply(makeEconomyEvent('economy.stake.withdrawn', 's1', { stake_id: 's1' }));
    expect(r2.applied).toBe(true);
  });

  it('created -> slashed (valid)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.stake.created', 's1', { stake_id: 's1' }));
    const r = tracker.apply(makeEconomyEvent('economy.stake.slashed', 's1', { stake_id: 's1' }));
    expect(r.applied).toBe(true);
  });

  it('created -> withdrawn directly (valid)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.stake.created', 's1', { stake_id: 's1' }));
    const r = tracker.apply(makeEconomyEvent('economy.stake.withdrawn', 's1', { stake_id: 's1' }));
    expect(r.applied).toBe(true);
  });

  it('slashed -> withdrawn (invalid — slashed is terminal)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.stake.created', 's1', { stake_id: 's1' }));
    tracker.apply(makeEconomyEvent('economy.stake.slashed', 's1', { stake_id: 's1' }));
    const r = tracker.apply(makeEconomyEvent('economy.stake.withdrawn', 's1', { stake_id: 's1' }));
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('invalid_stake_transition');
  });

  it('vested on unknown stake returns stake_not_found', () => {
    const tracker = new ProtocolStateTracker();
    const r = tracker.apply(
      makeEconomyEvent('economy.stake.vested', 'missing', { stake_id: 'missing' }),
    );
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('stake_not_found');
  });

  it('initial state is from STATE_MACHINES.stake.initial', () => {
    expect(STATE_MACHINES.stake.initial).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// Credit equivalence
// ---------------------------------------------------------------------------

describe('ProtocolStateTracker — Credit behavioral equivalence (S1-T3)', () => {
  it('extended -> settled', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.credit.extended', 'c1', { credit_id: 'c1' }));
    const r = tracker.apply(makeEconomyEvent('economy.credit.settled', 'c1', { credit_id: 'c1' }));
    expect(r.applied).toBe(true);
  });

  it('double settlement (invalid)', () => {
    const tracker = new ProtocolStateTracker();
    tracker.apply(makeEconomyEvent('economy.credit.extended', 'c1', { credit_id: 'c1' }));
    tracker.apply(makeEconomyEvent('economy.credit.settled', 'c1', { credit_id: 'c1' }));
    const r = tracker.apply(makeEconomyEvent('economy.credit.settled', 'c1', { credit_id: 'c1' }));
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('invalid_credit_transition');
  });

  it('settle unknown credit returns credit_not_found', () => {
    const tracker = new ProtocolStateTracker();
    const r = tracker.apply(
      makeEconomyEvent('economy.credit.settled', 'missing', { credit_id: 'missing' }),
    );
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('credit_not_found');
  });

  it('initial state is from STATE_MACHINES.credit.initial', () => {
    expect(STATE_MACHINES.credit.initial).toBe('extended');
  });
});

// ---------------------------------------------------------------------------
// VALID_REJECTION_REASONS consistency
// ---------------------------------------------------------------------------

describe('VALID_REJECTION_REASONS unchanged after refactor', () => {
  it('contains all expected economy rejection reasons', () => {
    const expected = [
      'invalid_escrow_transition',
      'escrow_not_found',
      'invalid_stake_transition',
      'stake_not_found',
      'invalid_credit_transition',
      'credit_not_found',
    ];
    for (const reason of expected) {
      expect(
        (VALID_REJECTION_REASONS as readonly string[]).includes(reason),
        `missing reason: ${reason}`,
      ).toBe(true);
    }
  });

  it('contains all expected lifecycle rejection reasons', () => {
    const expected = [
      'duplicate_event_id',
      'invalid_lifecycle_transition',
      'missing_lifecycle_from_state',
      'missing_lifecycle_to_state',
      'unknown_lifecycle_from_state',
      'unknown_lifecycle_to_state',
      'lifecycle_from_state_mismatch',
      'agent_not_found_for_transition',
      'sanction_missing_evidence',
    ];
    for (const reason of expected) {
      expect(
        (VALID_REJECTION_REASONS as readonly string[]).includes(reason),
        `missing reason: ${reason}`,
      ).toBe(true);
    }
  });
});
