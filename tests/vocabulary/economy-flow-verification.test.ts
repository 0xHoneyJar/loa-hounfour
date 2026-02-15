/**
 * ECONOMY_FLOW verification function tests.
 *
 * Tests each flow entry's verify function with valid and invalid inputs,
 * an end-to-end pipeline test, and null verify handling.
 *
 * @see S4-T2 — v4.6.0 Formalization Release
 */
import { describe, it, expect } from 'vitest';
import {
  ECONOMY_FLOW,
  verifyEconomyFlow,
  type EconomyFlowEntry,
} from '../../src/vocabulary/economy-integration.js';

// ---------------------------------------------------------------------------
// Helper: find flow entry by source->target pair
// ---------------------------------------------------------------------------

function findFlow(source: string, target: string): EconomyFlowEntry {
  const entry = ECONOMY_FLOW.find(
    (e) => e.source_schema === source && e.target_schema === target,
  );
  if (!entry) throw new Error(`No flow entry for ${source} -> ${target}`);
  return entry;
}

// ---------------------------------------------------------------------------
// Per-flow verification tests (5 flows x 2 cases = 10 tests)
// ---------------------------------------------------------------------------

describe('ECONOMY_FLOW verification functions', () => {
  describe('PerformanceRecord -> ReputationScore', () => {
    const flow = findFlow('PerformanceRecord', 'ReputationScore');

    it('valid when agent_id matches and outcome is defined', () => {
      const source = { agent_id: 'agent-1', record_id: 'r1', outcome: 'success' };
      const target = { agent_id: 'agent-1', components: {} };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('invalid when agent_id differs', () => {
      const source = { agent_id: 'agent-1', record_id: 'r1', outcome: 'success' };
      const target = { agent_id: 'agent-2', components: {} };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('invalid when source.outcome is undefined', () => {
      const source = { agent_id: 'agent-1', record_id: 'r1' };
      const target = { agent_id: 'agent-1', components: {} };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('outcome');
    });
  });

  describe('ReputationScore -> RoutingConstraint', () => {
    const flow = findFlow('ReputationScore', 'RoutingConstraint');

    it('valid when score meets min_reputation', () => {
      const source = { score: 850 };
      const target = { min_reputation: 700 };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('invalid when min_reputation is missing', () => {
      const source = { score: 850 };
      const target = {};
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('invalid when score is below min_reputation', () => {
      const source = { score: 500 };
      const target = { min_reputation: 700 };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('below');
    });
  });

  describe('RoutingConstraint -> BillingEntry', () => {
    const flow = findFlow('RoutingConstraint', 'BillingEntry');

    it('valid when pool_id matches', () => {
      const source = { pool_id: 'pool-a' };
      const target = { pool_id: 'pool-a' };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('invalid when pool_id is missing from target', () => {
      const source = { pool_id: 'pool-a' };
      const target = {};
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('invalid when pool_id mismatches between source and target', () => {
      const source = { pool_id: 'pool-a' };
      const target = { pool_id: 'pool-b' };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('match');
    });
  });

  describe('Sanction -> RoutingConstraint', () => {
    const flow = findFlow('Sanction', 'RoutingConstraint');

    it('valid when trust_level and severity are defined', () => {
      const source = { severity: 'warning' };
      const target = { trust_level: 'restricted' };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('invalid when trust_level is missing', () => {
      const source = { severity: 'warning' };
      const target = {};
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('invalid when source.severity is missing', () => {
      const source = {};
      const target = { trust_level: 'restricted' };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('severity');
    });
  });

  describe('PerformanceRecord -> CommonsDividend', () => {
    const flow = findFlow('PerformanceRecord', 'CommonsDividend');

    it('valid when source_performance_ids includes record_id', () => {
      const source = { record_id: 'perf-42' };
      const target = { source_performance_ids: ['perf-42', 'perf-43'] };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('invalid when source_performance_ids does not include record_id', () => {
      const source = { record_id: 'perf-42' };
      const target = { source_performance_ids: ['perf-99'] };
      const result = verifyEconomyFlow(source, target, flow);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// End-to-end pipeline test
// ---------------------------------------------------------------------------

describe('ECONOMY_FLOW end-to-end pipeline', () => {
  it('Performance -> Reputation -> RoutingConstraint -> BillingEntry', () => {
    const perfRecord = { agent_id: 'agent-1', record_id: 'perf-1', outcome: 'success' };
    const repScore = { agent_id: 'agent-1', score: 900 };
    const routing = { min_reputation: 700, pool_id: 'pool-a', trust_level: 'trusted' };
    const billing = { pool_id: 'pool-a' };

    // Step 1: Performance -> Reputation
    const flow1 = findFlow('PerformanceRecord', 'ReputationScore');
    expect(verifyEconomyFlow(perfRecord, repScore, flow1).valid).toBe(true);

    // Step 2: Reputation -> RoutingConstraint
    const flow2 = findFlow('ReputationScore', 'RoutingConstraint');
    expect(verifyEconomyFlow(repScore, routing, flow2).valid).toBe(true);

    // Step 3: RoutingConstraint -> BillingEntry
    const flow3 = findFlow('RoutingConstraint', 'BillingEntry');
    expect(verifyEconomyFlow(routing, billing, flow3).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Null verify function handling
// ---------------------------------------------------------------------------

describe('verifyEconomyFlow with no verify function', () => {
  it('returns valid: true when verify is undefined', () => {
    const entry: EconomyFlowEntry = {
      source_schema: 'Test',
      target_schema: 'Test',
      linking_field: 'id',
      description: 'test entry without verify',
    };
    const result = verifyEconomyFlow({}, {}, entry);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// All ECONOMY_FLOW entries have verify functions
// ---------------------------------------------------------------------------

describe('ECONOMY_FLOW completeness', () => {
  it('all 5 entries have verify functions', () => {
    for (const entry of ECONOMY_FLOW) {
      expect(
        entry.verify,
        `${entry.source_schema} -> ${entry.target_schema} missing verify`,
      ).toBeDefined();
    }
  });
});
