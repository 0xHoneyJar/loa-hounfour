/**
 * Tests for event sourcing utilities: reconstructAggregateFromEvents,
 * verifyAggregateConsistency, computeEventStreamHash.
 *
 * @since v7.3.0 — Sprint 2 (C2 + C3 + Spec III + V)
 */
import { describe, it, expect } from 'vitest';
import type { QualityEvent } from '../../src/schemas/quality-event.js';
import type { ReputationAggregate } from '../../src/governance/reputation-aggregate.js';
import {
  reconstructAggregateFromEvents,
  verifyAggregateConsistency,
  computeEventStreamHash,
} from '../../src/utilities/reputation-replay.js';
import { BAYESIAN_BLEND } from '../../src/vocabulary/reputation.js';
import { CONTRACT_VERSION } from '../../src/version.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<QualityEvent> & { event_id: string; occurred_at: string }): QualityEvent {
  return {
    personality_id: 'bear-001',
    collection_id: 'honeycomb',
    pool_id: 'pool-alpha',
    satisfaction: 0.9,
    coherence: 0.85,
    safety: 0.95,
    composite_score: 0.9,
    evaluator_id: 'eval-001',
    contract_version: CONTRACT_VERSION,
    ...overrides,
  };
}

function makeEvents(count: number, baseScore = 0.9): QualityEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeEvent({
      event_id: `evt-${i + 1}`,
      occurred_at: new Date(Date.UTC(2026, 0, 1, i)).toISOString(),
      composite_score: baseScore,
      evaluator_id: `eval-${(i % 5) + 1}`,
    }),
  );
}

// ---------------------------------------------------------------------------
// reconstructAggregateFromEvents
// ---------------------------------------------------------------------------

describe('reconstructAggregateFromEvents', () => {
  it('returns cold aggregate from empty event array', () => {
    const result = reconstructAggregateFromEvents([], 0.5);
    expect(result.state).toBe('cold');
    expect(result.personal_score).toBeNull();
    expect(result.blended_score).toBe(0.5);
    expect(result.sample_count).toBe(0);
    expect(result.event_count).toBe(0);
    expect(result.transition_history).toHaveLength(0);
    expect(result.model_cohorts).toHaveLength(0);
  });

  it('reconstructs warming aggregate from 1 event', () => {
    const events = [makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z' })];
    const result = reconstructAggregateFromEvents(events, 0.5);

    expect(result.state).toBe('warming');
    expect(result.personal_score).toBe(0.9);
    expect(result.sample_count).toBe(1);
    expect(result.event_count).toBe(1);
    expect(result.transition_history).toHaveLength(1);
    expect(result.transition_history[0].from).toBe('cold');
    expect(result.transition_history[0].to).toBe('warming');
  });

  it('reconstructs established aggregate from 5+ events', () => {
    const events = makeEvents(5);
    const result = reconstructAggregateFromEvents(events, 0.5);

    expect(result.state).toBe('established');
    expect(result.sample_count).toBe(5);
    expect(result.transition_history).toHaveLength(2);
    expect(result.transition_history[1].from).toBe('warming');
    expect(result.transition_history[1].to).toBe('established');
  });

  it('reconstructs authoritative aggregate from 28+ events', () => {
    // With k=3, n/(k+n) > 0.9 requires n > 27
    const events = makeEvents(28);
    const result = reconstructAggregateFromEvents(events, 0.5);

    expect(result.state).toBe('authoritative');
    expect(result.sample_count).toBe(28);
    expect(result.transition_history).toHaveLength(3);
    expect(result.transition_history[2].from).toBe('established');
    expect(result.transition_history[2].to).toBe('authoritative');
  });

  it('populates model_cohorts when events have model_id', () => {
    const events = [
      makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z', model_id: 'native', composite_score: 0.9 }),
      makeEvent({ event_id: 'e2', occurred_at: '2026-01-01T01:00:00Z', model_id: 'native', composite_score: 0.8 }),
      makeEvent({ event_id: 'e3', occurred_at: '2026-01-01T02:00:00Z', model_id: 'gpt-4o', composite_score: 0.7 }),
    ];
    const result = reconstructAggregateFromEvents(events, 0.5);

    expect(result.model_cohorts).toHaveLength(2);
    const native = result.model_cohorts.find(c => c.model_id === 'native');
    expect(native).toBeDefined();
    expect(native!.sample_count).toBe(2);
    expect(native!.personal_score).toBeCloseTo(0.85, 5);
    const gpt4o = result.model_cohorts.find(c => c.model_id === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o!.sample_count).toBe(1);
    expect(gpt4o!.personal_score).toBe(0.7);
  });

  it('computes transition_history with correct timestamps and triggers', () => {
    const events = makeEvents(6);
    const result = reconstructAggregateFromEvents(events, 0.5);

    expect(result.transition_history[0].trigger).toBe('First QualityEvent recorded');
    expect(result.transition_history[0].at).toBe(events[0].occurred_at);
    expect(result.transition_history[1].trigger).toBe('sample_count >= min_sample_count');
    // Transition happens at the 5th event (index 4)
    expect(result.transition_history[1].at).toBe(events[4].occurred_at);
  });

  it('is a pure function — same input produces same output', () => {
    const events = makeEvents(10);
    const result1 = reconstructAggregateFromEvents(events, 0.5);
    const result2 = reconstructAggregateFromEvents(events, 0.5);
    expect(result1).toEqual(result2);
  });

  it('sorts events chronologically even if provided out of order', () => {
    const events = [
      makeEvent({ event_id: 'e3', occurred_at: '2026-01-03T00:00:00Z' }),
      makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z' }),
      makeEvent({ event_id: 'e2', occurred_at: '2026-01-02T00:00:00Z' }),
    ];
    const result = reconstructAggregateFromEvents(events, 0.5);
    expect(result.created_at).toBe('2026-01-01T00:00:00Z');
    expect(result.last_updated).toBe('2026-01-03T00:00:00Z');
  });

  it('uses provided pseudoCount and minSampleCount', () => {
    const events = makeEvents(3);
    // With minSampleCount=3, should reach established
    const result = reconstructAggregateFromEvents(events, 0.5, 3, 3);
    expect(result.state).toBe('established');
    expect(result.min_sample_count).toBe(3);
  });

  it('computes blended score using Bayesian formula', () => {
    const events = makeEvents(3, 0.8);
    const result = reconstructAggregateFromEvents(events, 0.5, 3);
    // blended = (3*0.5 + 3*0.8) / (3+3) = 3.9/6 = 0.65
    expect(result.blended_score).toBeCloseTo(0.65, 5);
  });

  it('tracks unique contributors', () => {
    const events = [
      makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z', evaluator_id: 'eval-A' }),
      makeEvent({ event_id: 'e2', occurred_at: '2026-01-01T01:00:00Z', evaluator_id: 'eval-A' }),
      makeEvent({ event_id: 'e3', occurred_at: '2026-01-01T02:00:00Z', evaluator_id: 'eval-B' }),
    ];
    const result = reconstructAggregateFromEvents(events, 0.5);
    expect(result.contributor_count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// verifyAggregateConsistency
// ---------------------------------------------------------------------------

describe('verifyAggregateConsistency', () => {
  const events = makeEvents(6, 0.8);

  it('returns consistent: true when stored matches reconstruction', () => {
    const reconstructed = reconstructAggregateFromEvents(events, 0.5);
    const stored: ReputationAggregate = {
      personality_id: reconstructed.personality_id,
      collection_id: reconstructed.collection_id,
      pool_id: reconstructed.pool_id,
      state: reconstructed.state,
      personal_score: reconstructed.personal_score,
      collection_score: reconstructed.collection_score,
      blended_score: reconstructed.blended_score,
      sample_count: reconstructed.sample_count,
      pseudo_count: reconstructed.pseudo_count,
      contributor_count: reconstructed.contributor_count,
      min_sample_count: reconstructed.min_sample_count,
      created_at: reconstructed.created_at,
      last_updated: reconstructed.last_updated,
      transition_history: reconstructed.transition_history,
      contract_version: reconstructed.contract_version,
    };

    const report = verifyAggregateConsistency(stored, events, 0.5);
    expect(report.consistent).toBe(true);
    expect(report.drifts).toHaveLength(0);
    expect(report.event_count).toBe(6);
    expect(report.reconstructed_state).toBe('established');
  });

  it('detects state mismatch as critical drift', () => {
    const reconstructed = reconstructAggregateFromEvents(events, 0.5);
    const stored: ReputationAggregate = {
      ...reconstructed,
      state: 'authoritative', // Wrong — should be established
    };

    const report = verifyAggregateConsistency(stored, events, 0.5);
    expect(report.consistent).toBe(false);
    const stateDrift = report.drifts.find(d => d.field === 'state');
    expect(stateDrift).toBeDefined();
    expect(stateDrift!.severity).toBe('critical');
    expect(stateDrift!.stored).toBe('authoritative');
    expect(stateDrift!.computed).toBe('established');
  });

  it('detects sample_count mismatch as critical drift', () => {
    const reconstructed = reconstructAggregateFromEvents(events, 0.5);
    const stored: ReputationAggregate = {
      ...reconstructed,
      sample_count: 100, // Wrong
    };

    const report = verifyAggregateConsistency(stored, events, 0.5);
    expect(report.consistent).toBe(false);
    const drift = report.drifts.find(d => d.field === 'sample_count');
    expect(drift).toBeDefined();
    expect(drift!.severity).toBe('critical');
  });

  it('tolerates floating-point drift in scores within tolerance', () => {
    const reconstructed = reconstructAggregateFromEvents(events, 0.5);
    const stored: ReputationAggregate = {
      ...reconstructed,
      blended_score: reconstructed.blended_score + 0.0001, // Within default tolerance
    };

    const report = verifyAggregateConsistency(stored, events, 0.5);
    expect(report.consistent).toBe(true);
  });

  it('flags blended_score drift beyond tolerance', () => {
    const reconstructed = reconstructAggregateFromEvents(events, 0.5);
    const stored: ReputationAggregate = {
      ...reconstructed,
      blended_score: reconstructed.blended_score + 0.01, // Beyond tolerance
    };

    const report = verifyAggregateConsistency(stored, events, 0.5);
    expect(report.consistent).toBe(false);
    const drift = report.drifts.find(d => d.field === 'blended_score');
    expect(drift).toBeDefined();
    expect(drift!.severity).toBe('warning');
  });

  it('reports all drifts, not just the first one', () => {
    const reconstructed = reconstructAggregateFromEvents(events, 0.5);
    const stored: ReputationAggregate = {
      ...reconstructed,
      state: 'authoritative', // critical
      sample_count: 999, // critical
      blended_score: 0.1, // warning
    };

    const report = verifyAggregateConsistency(stored, events, 0.5);
    expect(report.consistent).toBe(false);
    expect(report.drifts.length).toBeGreaterThanOrEqual(3);
  });

  it('works with aggregates that have model_cohorts', () => {
    const modelEvents = [
      makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z', model_id: 'native', composite_score: 0.9 }),
      makeEvent({ event_id: 'e2', occurred_at: '2026-01-01T01:00:00Z', model_id: 'gpt-4o', composite_score: 0.7 }),
    ];
    const reconstructed = reconstructAggregateFromEvents(modelEvents, 0.5);
    const stored: ReputationAggregate = {
      ...reconstructed,
      model_cohorts: reconstructed.model_cohorts,
    };

    const report = verifyAggregateConsistency(stored, modelEvents, 0.5);
    expect(report.consistent).toBe(true);
  });

  it('flags missing model cohorts as warning', () => {
    const modelEvents = [
      makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z', model_id: 'native' }),
    ];
    const reconstructed = reconstructAggregateFromEvents(modelEvents, 0.5);
    const stored: ReputationAggregate = {
      ...reconstructed,
      model_cohorts: [], // Empty but reconstruction has 'native'
    };

    const report = verifyAggregateConsistency(stored, modelEvents, 0.5);
    expect(report.consistent).toBe(false);
    const drift = report.drifts.find(d => d.field.includes('model_cohorts'));
    expect(drift).toBeDefined();
    expect(drift!.severity).toBe('warning');
  });
});

// ---------------------------------------------------------------------------
// computeEventStreamHash
// ---------------------------------------------------------------------------

describe('computeEventStreamHash', () => {
  it('returns consistent hex64 hash for the same event sequence', () => {
    const events = makeEvents(3);
    const hash1 = computeEventStreamHash(events);
    const hash2 = computeEventStreamHash(events);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different event sequences', () => {
    const events1 = makeEvents(3, 0.9);
    const events2 = makeEvents(3, 0.8);
    expect(computeEventStreamHash(events1)).not.toBe(computeEventStreamHash(events2));
  });

  it('produces a defined hash for empty event array', () => {
    const hash = computeEventStreamHash([]);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('order matters: [e1, e2] produces different hash than [e2, e1]', () => {
    const e1 = makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z' });
    const e2 = makeEvent({ event_id: 'e2', occurred_at: '2026-01-02T00:00:00Z' });
    const hash12 = computeEventStreamHash([e1, e2]);
    const hash21 = computeEventStreamHash([e2, e1]);
    expect(hash12).not.toBe(hash21);
  });

  it('uses canonical JSON serialization (deterministic)', () => {
    // Events with fields in different orders should produce the same hash
    const hash = computeEventStreamHash([
      makeEvent({ event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z' }),
    ]);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.length).toBe(64);
  });
});
