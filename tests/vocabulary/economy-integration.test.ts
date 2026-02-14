/**
 * ECONOMY_FLOW structural invariant tests.
 *
 * Validates that the economy-integration vocabulary correctly references
 * known schemas and maintains structural integrity.
 *
 * Finding: BB-C8-I1-TST-005
 */
import { describe, it, expect } from 'vitest';
import { ECONOMY_FLOW, type EconomyFlowEntry } from '../../src/vocabulary/economy-integration.js';

// Import all schemas referenced by ECONOMY_FLOW to collect their $ids
import { PerformanceRecordSchema } from '../../src/schemas/performance-record.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';
import { RoutingConstraintSchema } from '../../src/schemas/routing-constraint.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';

// Collect all known schema $ids
const KNOWN_SCHEMA_IDS = new Set([
  PerformanceRecordSchema.$id,
  ReputationScoreSchema.$id,
  RoutingConstraintSchema.$id,
  BillingEntrySchema.$id,
  SanctionSchema.$id,
  CommonsDividendSchema.$id,
]);

describe('ECONOMY_FLOW structural invariants', () => {
  it('has the expected number of entries (5)', () => {
    expect(ECONOMY_FLOW).toHaveLength(5);
  });

  it('each entry has all required fields', () => {
    const requiredFields: (keyof EconomyFlowEntry)[] = [
      'source_schema',
      'target_schema',
      'linking_field',
      'description',
    ];

    for (const entry of ECONOMY_FLOW) {
      for (const field of requiredFields) {
        expect(entry[field], `entry ${entry.source_schema}->${entry.target_schema} missing ${field}`).toBeDefined();
        expect(typeof entry[field]).toBe('string');
        expect(entry[field].length).toBeGreaterThan(0);
      }
    }
  });

  it('each source_schema matches a known schema $id', () => {
    for (const entry of ECONOMY_FLOW) {
      expect(
        KNOWN_SCHEMA_IDS.has(entry.source_schema),
        `source_schema "${entry.source_schema}" is not a known schema $id. Known: ${[...KNOWN_SCHEMA_IDS].join(', ')}`,
      ).toBe(true);
    }
  });

  it('each target_schema matches a known schema $id', () => {
    for (const entry of ECONOMY_FLOW) {
      expect(
        KNOWN_SCHEMA_IDS.has(entry.target_schema),
        `target_schema "${entry.target_schema}" is not a known schema $id. Known: ${[...KNOWN_SCHEMA_IDS].join(', ')}`,
      ).toBe(true);
    }
  });

  it('no duplicate source->target pairs', () => {
    const pairs = new Set<string>();
    for (const entry of ECONOMY_FLOW) {
      const key = `${entry.source_schema}->${entry.target_schema}`;
      expect(pairs.has(key), `duplicate pair: ${key}`).toBe(false);
      pairs.add(key);
    }
  });

  it('linking_field "pool_id" for RoutingConstraint->BillingEntry is a semantic link', () => {
    const routingToBilling = ECONOMY_FLOW.find(
      (e) => e.source_schema === 'RoutingConstraint' && e.target_schema === 'BillingEntry',
    );
    expect(routingToBilling).toBeDefined();
    expect(routingToBilling!.linking_field).toBe('pool_id');
  });
});
