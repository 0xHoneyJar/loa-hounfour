/**
 * AGGREGATE_BOUNDARIES structural invariant tests.
 *
 * Validates that aggregate boundary definitions reference known schema $ids,
 * have unique IDs, valid consistency models, and non-empty invariant descriptions.
 *
 * @see S1-T4, S1-T6 — v4.6.0 Formalization Release
 */
import { describe, it, expect } from 'vitest';
import {
  AGGREGATE_BOUNDARIES,
  type AggregateBoundary,
  type ConsistencyModel,
} from '../../src/vocabulary/aggregate-boundaries.js';

// Import all schemas referenced as roots or members
import { EscrowEntrySchema } from '../../src/schemas/escrow-entry.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';
import { PerformanceRecordSchema } from '../../src/schemas/performance-record.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';
import { DisputeRecordSchema } from '../../src/schemas/dispute-record.js';
import { RoutingConstraintSchema } from '../../src/schemas/routing-constraint.js';

// Collect known schema $ids
const KNOWN_SCHEMA_IDS = new Set([
  EscrowEntrySchema.$id,
  BillingEntrySchema.$id,
  CommonsDividendSchema.$id,
  PerformanceRecordSchema.$id,
  ReputationScoreSchema.$id,
  SanctionSchema.$id,
  DisputeRecordSchema.$id,
  RoutingConstraintSchema.$id,
]);

// Also check for TransferEvent which may or may not have an $id
// (TransferEventSchema uses 'TransferEventRecord' as $id based on its export name)
import { TransferEventSchema } from '../../src/schemas/transfer-spec.js';
if (TransferEventSchema.$id) {
  KNOWN_SCHEMA_IDS.add(TransferEventSchema.$id);
}

// Add plain string references for members that use short names
const KNOWN_SCHEMA_NAMES = new Set([
  ...KNOWN_SCHEMA_IDS,
  'EscrowEntry',
  'BillingEntry',
  'TransferEvent',
  'CommonsDividend',
  'PerformanceRecord',
  'ReputationScore',
  'Sanction',
  'DisputeRecord',
  'RoutingConstraint',
]);

const VALID_CONSISTENCY_MODELS: ConsistencyModel[] = ['causal', 'read-your-writes', 'eventual'];

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

describe('AGGREGATE_BOUNDARIES structural invariants', () => {
  it('has exactly 5 boundary definitions', () => {
    expect(AGGREGATE_BOUNDARIES).toHaveLength(5);
  });

  it('all IDs are unique', () => {
    const ids = new Set<string>();
    for (const boundary of AGGREGATE_BOUNDARIES) {
      expect(ids.has(boundary.id), `duplicate boundary id: ${boundary.id}`).toBe(false);
      ids.add(boundary.id);
    }
  });

  it('expected boundary IDs are present', () => {
    const ids = AGGREGATE_BOUNDARIES.map(b => b.id);
    expect(ids).toContain('escrow_settlement');
    expect(ids).toContain('dividend_distribution');
    expect(ids).toContain('reputation_computation');
    expect(ids).toContain('dispute_lifecycle');
    expect(ids).toContain('governance_enforcement');
  });

  for (const boundary of AGGREGATE_BOUNDARIES) {
    describe(`boundary: ${boundary.id}`, () => {
      it('has a non-empty id', () => {
        expect(boundary.id.length).toBeGreaterThan(0);
      });

      it('has a non-empty root', () => {
        expect(boundary.root.length).toBeGreaterThan(0);
      });

      it('root references a known schema name', () => {
        expect(
          KNOWN_SCHEMA_NAMES.has(boundary.root),
          `root "${boundary.root}" is not a known schema name`,
        ).toBe(true);
      });

      it('has at least one member', () => {
        expect(boundary.members.length).toBeGreaterThan(0);
      });

      it('all members reference known schema names', () => {
        for (const member of boundary.members) {
          expect(
            KNOWN_SCHEMA_NAMES.has(member),
            `member "${member}" in boundary "${boundary.id}" is not a known schema name`,
          ).toBe(true);
        }
      });

      it('root is NOT included in members', () => {
        expect(
          boundary.members.includes(boundary.root),
          `root "${boundary.root}" should not be in members`,
        ).toBe(false);
      });

      it('has no duplicate members', () => {
        const memberSet = new Set(boundary.members);
        expect(memberSet.size).toBe(boundary.members.length);
      });

      it('has a non-empty invariant description', () => {
        expect(boundary.invariant.length).toBeGreaterThan(10);
      });

      it('has a valid consistency model', () => {
        expect(
          VALID_CONSISTENCY_MODELS.includes(boundary.ordering),
          `ordering "${boundary.ordering}" is not a valid ConsistencyModel`,
        ).toBe(true);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Specific boundary checks
// ---------------------------------------------------------------------------

describe('AGGREGATE_BOUNDARIES specific constraints', () => {
  it('escrow_settlement uses causal ordering', () => {
    const boundary = AGGREGATE_BOUNDARIES.find(b => b.id === 'escrow_settlement')!;
    expect(boundary.ordering).toBe('causal');
    expect(boundary.root).toBe('EscrowEntry');
  });

  it('dividend_distribution uses read-your-writes ordering', () => {
    const boundary = AGGREGATE_BOUNDARIES.find(b => b.id === 'dividend_distribution')!;
    expect(boundary.ordering).toBe('read-your-writes');
    expect(boundary.root).toBe('CommonsDividend');
  });

  it('reputation_computation uses eventual ordering', () => {
    const boundary = AGGREGATE_BOUNDARIES.find(b => b.id === 'reputation_computation')!;
    expect(boundary.ordering).toBe('eventual');
    expect(boundary.root).toBe('ReputationScore');
  });

  it('dispute_lifecycle uses causal ordering', () => {
    const boundary = AGGREGATE_BOUNDARIES.find(b => b.id === 'dispute_lifecycle')!;
    expect(boundary.ordering).toBe('causal');
    expect(boundary.root).toBe('DisputeRecord');
  });

  it('governance_enforcement uses causal ordering', () => {
    const boundary = AGGREGATE_BOUNDARIES.find(b => b.id === 'governance_enforcement')!;
    expect(boundary.ordering).toBe('causal');
    expect(boundary.root).toBe('Sanction');
  });

  it('at least 3 boundaries use causal ordering', () => {
    const causal = AGGREGATE_BOUNDARIES.filter(b => b.ordering === 'causal');
    expect(causal.length).toBeGreaterThanOrEqual(3);
  });
});
