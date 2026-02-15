/**
 * Comprehensive schema validation tests for all v4.x economy schemas.
 *
 * Covers: PerformanceRecord, ContributionRecord, Sanction, DisputeRecord,
 * ValidatedOutcome, ReputationScore, EscrowEntry, StakePosition,
 * CommonsDividend, MutualCredit, RoutingConstraint.
 *
 * Finding: BB-C7-TEST-001
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import { PerformanceRecordSchema } from '../../src/schemas/performance-record.js';
import { ContributionRecordSchema } from '../../src/schemas/contribution-record.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';
import { DisputeRecordSchema } from '../../src/schemas/dispute-record.js';
import { ValidatedOutcomeSchema } from '../../src/schemas/validated-outcome.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';
import { EscrowEntrySchema } from '../../src/schemas/escrow-entry.js';
import { StakePositionSchema } from '../../src/schemas/stake-position.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';
import { MutualCreditSchema } from '../../src/schemas/mutual-credit.js';
import { RoutingConstraintSchema } from '../../src/schemas/routing-constraint.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schema-only validation (no cross-field validators). */
function schemaValidate(schema: Parameters<typeof validate>[0], data: unknown) {
  return validate(schema, data, { crossField: false });
}

/** Clone an object and delete a key. */
function without<T extends Record<string, unknown>>(obj: T, key: keyof T): Partial<T> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

// ---------------------------------------------------------------------------
// Valid document fixtures
// ---------------------------------------------------------------------------

const VALID_PERFORMANCE_RECORD = {
  record_id: 'r1',
  agent_id: 'a1',
  billing_entry_id: 'b1',
  occurred_at: '2026-01-01T00:00:00Z',
  output: { tokens_consumed: 100, model_used: 'gpt-4' },
  contract_version: '4.4.0',
};

const VALID_CONTRIBUTION_RECORD = {
  contribution_id: 'c1',
  agent_id: 'a1',
  contribution_type: 'curation',
  value_micro: '500000',
  assessed_by: 'peer',
  assessed_at: '2026-01-01T00:00:00Z',
  contract_version: '4.4.0',
};

const VALID_SANCTION = {
  sanction_id: 's1',
  agent_id: 'a1',
  severity: 'warning',
  trigger: {
    violation_type: 'content_policy',
    occurrence_count: 1,
    evidence_event_ids: ['e1'],
  },
  imposed_by: 'automatic',
  imposed_at: '2026-01-01T00:00:00Z',
  appeal_available: true,
  contract_version: '4.4.0',
};

const VALID_DISPUTE_RECORD = {
  dispute_id: 'd1',
  filed_by: 'a1',
  filed_against: 'a2',
  dispute_type: 'quality',
  evidence: [{ event_id: 'e1', description: 'bad output' }],
  filed_at: '2026-01-01T00:00:00Z',
  contract_version: '4.4.0',
};

const VALID_VALIDATED_OUTCOME = {
  validation_id: 'v1',
  performance_record_id: 'r1',
  validator_agent_id: 'a2',
  validator_stake_micro: '100000',
  rating: 4.5,
  validated_at: '2026-01-01T00:00:00Z',
  contract_version: '4.4.0',
};

const VALID_REPUTATION_SCORE = {
  agent_id: 'a1',
  score: 0.85,
  components: {
    outcome_quality: 0.9,
    performance_consistency: 0.8,
    dispute_ratio: 0.85,
    community_standing: 0.75,
  },
  sample_size: 10,
  last_updated: '2026-01-01T00:00:00Z',
  decay_applied: false,
  contract_version: '4.4.0',
};

const VALID_ESCROW_ENTRY = {
  escrow_id: '12345678-1234-4123-8123-123456789abc',
  payer_id: 'a1',
  payee_id: 'a2',
  amount_micro: '1000000',
  state: 'held',
  held_at: '2026-01-01T00:00:00Z',
  contract_version: '4.4.0',
};

const VALID_STAKE_POSITION = {
  stake_id: '12345678-1234-4123-8123-123456789abc',
  staker_id: 'a1',
  target_id: 'a2',
  amount_micro: '500000',
  stake_type: 'conviction',
  vesting: {
    schedule: 'immediate',
    vested_micro: '500000',
    remaining_micro: '0',
  },
  staked_at: '2026-01-01T00:00:00Z',
  contract_version: '4.4.0',
};

const VALID_COMMONS_DIVIDEND = {
  dividend_id: 'div1',
  pool_id: 'p1',
  total_micro: '10000000',
  governance: 'algorithmic',
  period_start: '2026-01-01T00:00:00Z',
  period_end: '2026-02-01T00:00:00Z',
  contract_version: '4.4.0',
};

const VALID_MUTUAL_CREDIT = {
  credit_id: 'mc1',
  creditor_id: 'a1',
  debtor_id: 'a2',
  amount_micro: '200000',
  credit_type: 'refund',
  issued_at: '2026-01-01T00:00:00Z',
  settled: false,
  contract_version: '4.4.0',
};

const VALID_ROUTING_CONSTRAINT = {
  trust_level: 'authenticated',
  contract_version: '4.4.0',
};

// ===========================================================================
// PerformanceRecord
// ===========================================================================

describe('PerformanceRecordSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(PerformanceRecordSchema, VALID_PERFORMANCE_RECORD);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional outcome', () => {
    const doc = {
      ...VALID_PERFORMANCE_RECORD,
      outcome: { user_rating: 4.2, resolution_signal: true },
    };
    const result = schemaValidate(PerformanceRecordSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional dividend fields', () => {
    const doc = {
      ...VALID_PERFORMANCE_RECORD,
      dividend_target: 'private',
      dividend_split_bps: 5000,
    };
    const result = schemaValidate(PerformanceRecordSchema, doc);
    expect(result.valid).toBe(true);
  });

  describe('required field rejection', () => {
    const requiredFields = ['record_id', 'agent_id', 'billing_entry_id', 'occurred_at', 'output', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(PerformanceRecordSchema, without(VALID_PERFORMANCE_RECORD, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects non-string record_id', () => {
      const result = schemaValidate(PerformanceRecordSchema, { ...VALID_PERFORMANCE_RECORD, record_id: 123 });
      expect(result.valid).toBe(false);
    });

    it('rejects empty record_id', () => {
      const result = schemaValidate(PerformanceRecordSchema, { ...VALID_PERFORMANCE_RECORD, record_id: '' });
      expect(result.valid).toBe(false);
    });

    it('rejects non-integer tokens_consumed', () => {
      const result = schemaValidate(PerformanceRecordSchema, {
        ...VALID_PERFORMANCE_RECORD,
        output: { tokens_consumed: 10.5, model_used: 'gpt-4' },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects negative tokens_consumed', () => {
      const result = schemaValidate(PerformanceRecordSchema, {
        ...VALID_PERFORMANCE_RECORD,
        output: { tokens_consumed: -1, model_used: 'gpt-4' },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects outcome user_rating above 5', () => {
      const result = schemaValidate(PerformanceRecordSchema, {
        ...VALID_PERFORMANCE_RECORD,
        outcome: { user_rating: 6 },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects dividend_split_bps above 10000', () => {
      const result = schemaValidate(PerformanceRecordSchema, {
        ...VALID_PERFORMANCE_RECORD,
        dividend_target: 'mixed',
        dividend_split_bps: 10001,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for occurred_at', () => {
      const result = schemaValidate(PerformanceRecordSchema, { ...VALID_PERFORMANCE_RECORD, occurred_at: 'not-a-date' });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid contract_version pattern', () => {
      const result = schemaValidate(PerformanceRecordSchema, { ...VALID_PERFORMANCE_RECORD, contract_version: 'v4.4.0' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// ContributionRecord
// ===========================================================================

describe('ContributionRecordSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(ContributionRecordSchema, VALID_CONTRIBUTION_RECORD);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional evidence_event_ids', () => {
    const doc = { ...VALID_CONTRIBUTION_RECORD, evidence_event_ids: ['e1', 'e2'] };
    const result = schemaValidate(ContributionRecordSchema, doc);
    expect(result.valid).toBe(true);
  });

  describe('required field rejection', () => {
    const requiredFields = ['contribution_id', 'agent_id', 'contribution_type', 'value_micro', 'assessed_by', 'assessed_at', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(ContributionRecordSchema, without(VALID_CONTRIBUTION_RECORD, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects invalid contribution_type', () => {
      const result = schemaValidate(ContributionRecordSchema, { ...VALID_CONTRIBUTION_RECORD, contribution_type: 'mining' });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid assessed_by', () => {
      const result = schemaValidate(ContributionRecordSchema, { ...VALID_CONTRIBUTION_RECORD, assessed_by: 'manager' });
      expect(result.valid).toBe(false);
    });

    it('rejects numeric value_micro', () => {
      const result = schemaValidate(ContributionRecordSchema, { ...VALID_CONTRIBUTION_RECORD, value_micro: 500000 });
      expect(result.valid).toBe(false);
    });

    it('rejects value_micro with letters', () => {
      const result = schemaValidate(ContributionRecordSchema, { ...VALID_CONTRIBUTION_RECORD, value_micro: '50abc' });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for assessed_at', () => {
      const result = schemaValidate(ContributionRecordSchema, { ...VALID_CONTRIBUTION_RECORD, assessed_at: '2026-13-01' });
      expect(result.valid).toBe(false);
    });

    it('rejects contract_version without dots', () => {
      const result = schemaValidate(ContributionRecordSchema, { ...VALID_CONTRIBUTION_RECORD, contract_version: '440' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// Sanction
// ===========================================================================

describe('SanctionSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(SanctionSchema, VALID_SANCTION);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional expires_at', () => {
    const doc = { ...VALID_SANCTION, expires_at: '2026-06-01T00:00:00Z' };
    const result = schemaValidate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
  });

  describe('required field rejection', () => {
    const requiredFields = ['sanction_id', 'agent_id', 'severity', 'trigger', 'imposed_by', 'imposed_at', 'appeal_available', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(SanctionSchema, without(VALID_SANCTION, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects invalid severity level', () => {
      const result = schemaValidate(SanctionSchema, { ...VALID_SANCTION, severity: 'critical' });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid violation_type in trigger', () => {
      const result = schemaValidate(SanctionSchema, {
        ...VALID_SANCTION,
        trigger: { ...VALID_SANCTION.trigger, violation_type: 'unknown_violation' },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects occurrence_count of 0', () => {
      const result = schemaValidate(SanctionSchema, {
        ...VALID_SANCTION,
        trigger: { ...VALID_SANCTION.trigger, occurrence_count: 0 },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects empty evidence_event_ids array', () => {
      const result = schemaValidate(SanctionSchema, {
        ...VALID_SANCTION,
        trigger: { ...VALID_SANCTION.trigger, evidence_event_ids: [] },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid imposed_by value', () => {
      const result = schemaValidate(SanctionSchema, { ...VALID_SANCTION, imposed_by: 'admin' });
      expect(result.valid).toBe(false);
    });

    it('rejects non-boolean appeal_available', () => {
      const result = schemaValidate(SanctionSchema, { ...VALID_SANCTION, appeal_available: 'yes' });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for imposed_at', () => {
      const result = schemaValidate(SanctionSchema, { ...VALID_SANCTION, imposed_at: 'yesterday' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// DisputeRecord
// ===========================================================================

describe('DisputeRecordSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(DisputeRecordSchema, VALID_DISPUTE_RECORD);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional resolution', () => {
    const doc = {
      ...VALID_DISPUTE_RECORD,
      resolution: {
        outcome: 'upheld',
        resolved_at: '2026-01-15T00:00:00Z',
        sanction_id: 's1',
      },
    };
    const result = schemaValidate(DisputeRecordSchema, doc);
    expect(result.valid).toBe(true);
  });

  describe('required field rejection', () => {
    const requiredFields = ['dispute_id', 'filed_by', 'filed_against', 'dispute_type', 'evidence', 'filed_at', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(DisputeRecordSchema, without(VALID_DISPUTE_RECORD, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects invalid dispute_type', () => {
      const result = schemaValidate(DisputeRecordSchema, { ...VALID_DISPUTE_RECORD, dispute_type: 'spam' });
      expect(result.valid).toBe(false);
    });

    it('rejects empty evidence array', () => {
      const result = schemaValidate(DisputeRecordSchema, { ...VALID_DISPUTE_RECORD, evidence: [] });
      expect(result.valid).toBe(false);
    });

    it('rejects evidence item with empty event_id', () => {
      const result = schemaValidate(DisputeRecordSchema, {
        ...VALID_DISPUTE_RECORD,
        evidence: [{ event_id: '', description: 'bad output' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects evidence item with empty description', () => {
      const result = schemaValidate(DisputeRecordSchema, {
        ...VALID_DISPUTE_RECORD,
        evidence: [{ event_id: 'e1', description: '' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid resolution outcome', () => {
      const result = schemaValidate(DisputeRecordSchema, {
        ...VALID_DISPUTE_RECORD,
        resolution: { outcome: 'rejected', resolved_at: '2026-01-15T00:00:00Z' },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for filed_at', () => {
      const result = schemaValidate(DisputeRecordSchema, { ...VALID_DISPUTE_RECORD, filed_at: '01-01-2026' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// ValidatedOutcome
// ===========================================================================

describe('ValidatedOutcomeSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(ValidatedOutcomeSchema, VALID_VALIDATED_OUTCOME);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional dispute_outcome', () => {
    const doc = { ...VALID_VALIDATED_OUTCOME, dispute_outcome: 'upheld' };
    const result = schemaValidate(ValidatedOutcomeSchema, doc);
    expect(result.valid).toBe(true);
  });

  describe('required field rejection', () => {
    const requiredFields = ['validation_id', 'performance_record_id', 'validator_agent_id', 'validator_stake_micro', 'rating', 'validated_at', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(ValidatedOutcomeSchema, without(VALID_VALIDATED_OUTCOME, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects rating above 5', () => {
      const result = schemaValidate(ValidatedOutcomeSchema, { ...VALID_VALIDATED_OUTCOME, rating: 5.1 });
      expect(result.valid).toBe(false);
    });

    it('rejects negative rating', () => {
      const result = schemaValidate(ValidatedOutcomeSchema, { ...VALID_VALIDATED_OUTCOME, rating: -1 });
      expect(result.valid).toBe(false);
    });

    it('rejects numeric validator_stake_micro', () => {
      const result = schemaValidate(ValidatedOutcomeSchema, { ...VALID_VALIDATED_OUTCOME, validator_stake_micro: 100000 });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid dispute_outcome', () => {
      const result = schemaValidate(ValidatedOutcomeSchema, { ...VALID_VALIDATED_OUTCOME, dispute_outcome: 'rejected' });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for validated_at', () => {
      const result = schemaValidate(ValidatedOutcomeSchema, { ...VALID_VALIDATED_OUTCOME, validated_at: 'invalid' });
      expect(result.valid).toBe(false);
    });

    it('rejects validator_stake_micro with non-numeric chars', () => {
      const result = schemaValidate(ValidatedOutcomeSchema, { ...VALID_VALIDATED_OUTCOME, validator_stake_micro: '100k' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// ReputationScore
// ===========================================================================

describe('ReputationScoreSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(ReputationScoreSchema, VALID_REPUTATION_SCORE);
    expect(result.valid).toBe(true);
  });

  it('accepts boundary score values (0 and 1)', () => {
    const doc = {
      ...VALID_REPUTATION_SCORE,
      score: 0,
      components: {
        outcome_quality: 0,
        performance_consistency: 1,
        dispute_ratio: 0,
        community_standing: 1,
      },
    };
    const result = schemaValidate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
  });

  describe('required field rejection', () => {
    const requiredFields = ['agent_id', 'score', 'components', 'sample_size', 'last_updated', 'decay_applied', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(ReputationScoreSchema, without(VALID_REPUTATION_SCORE, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects score above 1', () => {
      const result = schemaValidate(ReputationScoreSchema, { ...VALID_REPUTATION_SCORE, score: 1.01 });
      expect(result.valid).toBe(false);
    });

    it('rejects negative score', () => {
      const result = schemaValidate(ReputationScoreSchema, { ...VALID_REPUTATION_SCORE, score: -0.1 });
      expect(result.valid).toBe(false);
    });

    it('rejects component value above 1', () => {
      const result = schemaValidate(ReputationScoreSchema, {
        ...VALID_REPUTATION_SCORE,
        components: { ...VALID_REPUTATION_SCORE.components, outcome_quality: 1.5 },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects negative sample_size', () => {
      const result = schemaValidate(ReputationScoreSchema, { ...VALID_REPUTATION_SCORE, sample_size: -1 });
      expect(result.valid).toBe(false);
    });

    it('rejects non-integer sample_size', () => {
      const result = schemaValidate(ReputationScoreSchema, { ...VALID_REPUTATION_SCORE, sample_size: 10.5 });
      expect(result.valid).toBe(false);
    });

    it('rejects non-boolean decay_applied', () => {
      const result = schemaValidate(ReputationScoreSchema, { ...VALID_REPUTATION_SCORE, decay_applied: 'yes' });
      expect(result.valid).toBe(false);
    });

    it('rejects string score', () => {
      const result = schemaValidate(ReputationScoreSchema, { ...VALID_REPUTATION_SCORE, score: '0.85' });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for last_updated', () => {
      const result = schemaValidate(ReputationScoreSchema, { ...VALID_REPUTATION_SCORE, last_updated: 'Jan 1 2026' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// EscrowEntry
// ===========================================================================

describe('EscrowEntrySchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(EscrowEntrySchema, VALID_ESCROW_ENTRY);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional released_at and dispute_id', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      state: 'disputed',
      released_at: '2026-01-15T00:00:00Z',
      dispute_id: 'd1',
    };
    const result = schemaValidate(EscrowEntrySchema, doc);
    expect(result.valid).toBe(true);
  });

  describe('required field rejection', () => {
    const requiredFields = ['escrow_id', 'payer_id', 'payee_id', 'amount_micro', 'state', 'held_at', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(EscrowEntrySchema, without(VALID_ESCROW_ENTRY, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects invalid state value', () => {
      const result = schemaValidate(EscrowEntrySchema, { ...VALID_ESCROW_ENTRY, state: 'pending' });
      expect(result.valid).toBe(false);
    });

    it('rejects numeric amount_micro', () => {
      const result = schemaValidate(EscrowEntrySchema, { ...VALID_ESCROW_ENTRY, amount_micro: 1000000 });
      expect(result.valid).toBe(false);
    });

    it('rejects negative amount_micro (unsigned)', () => {
      const result = schemaValidate(EscrowEntrySchema, { ...VALID_ESCROW_ENTRY, amount_micro: '-1000000' });
      expect(result.valid).toBe(false);
    });
  });

  describe('pattern violations', () => {
    it('rejects non-UUID escrow_id', () => {
      const result = schemaValidate(EscrowEntrySchema, { ...VALID_ESCROW_ENTRY, escrow_id: 'not-a-uuid' });
      expect(result.valid).toBe(false);
    });

    it('rejects UUID v1 escrow_id (wrong version nibble)', () => {
      const result = schemaValidate(EscrowEntrySchema, {
        ...VALID_ESCROW_ENTRY,
        escrow_id: '12345678-1234-1123-8123-123456789abc',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects UUID with invalid variant nibble', () => {
      const result = schemaValidate(EscrowEntrySchema, {
        ...VALID_ESCROW_ENTRY,
        escrow_id: '12345678-1234-4123-0123-123456789abc',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid date-time for held_at', () => {
      const result = schemaValidate(EscrowEntrySchema, { ...VALID_ESCROW_ENTRY, held_at: '2026/01/01' });
      expect(result.valid).toBe(false);
    });

    it('rejects amount_micro with decimal point', () => {
      const result = schemaValidate(EscrowEntrySchema, { ...VALID_ESCROW_ENTRY, amount_micro: '100.50' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// StakePosition
// ===========================================================================

describe('StakePositionSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(StakePositionSchema, VALID_STAKE_POSITION);
    expect(result.valid).toBe(true);
  });

  it('accepts all stake_type variants', () => {
    for (const stake_type of ['conviction', 'delegation', 'validation'] as const) {
      const doc = { ...VALID_STAKE_POSITION, stake_type };
      const result = schemaValidate(StakePositionSchema, doc);
      expect(result.valid).toBe(true);
    }
  });

  it('accepts all vesting schedule variants', () => {
    for (const schedule of ['immediate', 'performance_gated', 'time_gated'] as const) {
      const doc = {
        ...VALID_STAKE_POSITION,
        vesting: { ...VALID_STAKE_POSITION.vesting, schedule },
      };
      const result = schemaValidate(StakePositionSchema, doc);
      expect(result.valid).toBe(true);
    }
  });

  describe('required field rejection', () => {
    const requiredFields = ['stake_id', 'staker_id', 'target_id', 'amount_micro', 'stake_type', 'vesting', 'staked_at', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(StakePositionSchema, without(VALID_STAKE_POSITION, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects invalid stake_type', () => {
      const result = schemaValidate(StakePositionSchema, { ...VALID_STAKE_POSITION, stake_type: 'liquidity' });
      expect(result.valid).toBe(false);
    });

    it('rejects negative amount_micro (unsigned)', () => {
      const result = schemaValidate(StakePositionSchema, { ...VALID_STAKE_POSITION, amount_micro: '-500000' });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid vesting schedule', () => {
      const result = schemaValidate(StakePositionSchema, {
        ...VALID_STAKE_POSITION,
        vesting: { schedule: 'linear', vested_micro: '0', remaining_micro: '500000' },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('pattern violations', () => {
    it('rejects non-UUID stake_id', () => {
      const result = schemaValidate(StakePositionSchema, { ...VALID_STAKE_POSITION, stake_id: 'stake-123' });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid date-time for staked_at', () => {
      const result = schemaValidate(StakePositionSchema, { ...VALID_STAKE_POSITION, staked_at: 'bad-date' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// CommonsDividend
// ===========================================================================

describe('CommonsDividendSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(CommonsDividendSchema, VALID_COMMONS_DIVIDEND);
    expect(result.valid).toBe(true);
  });

  it('accepts all governance variants', () => {
    for (const governance of ['mod_discretion', 'member_vote', 'algorithmic', 'stake_weighted'] as const) {
      const doc = { ...VALID_COMMONS_DIVIDEND, governance };
      const result = schemaValidate(CommonsDividendSchema, doc);
      expect(result.valid).toBe(true);
    }
  });

  describe('required field rejection', () => {
    const requiredFields = ['dividend_id', 'pool_id', 'total_micro', 'governance', 'period_start', 'period_end', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(CommonsDividendSchema, without(VALID_COMMONS_DIVIDEND, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects invalid governance value', () => {
      const result = schemaValidate(CommonsDividendSchema, { ...VALID_COMMONS_DIVIDEND, governance: 'dictatorship' });
      expect(result.valid).toBe(false);
    });

    it('rejects numeric total_micro', () => {
      const result = schemaValidate(CommonsDividendSchema, { ...VALID_COMMONS_DIVIDEND, total_micro: 10000000 });
      expect(result.valid).toBe(false);
    });

    it('rejects negative total_micro (unsigned)', () => {
      const result = schemaValidate(CommonsDividendSchema, { ...VALID_COMMONS_DIVIDEND, total_micro: '-10000000' });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for period_start', () => {
      const result = schemaValidate(CommonsDividendSchema, { ...VALID_COMMONS_DIVIDEND, period_start: 'Jan 2026' });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid date-time for period_end', () => {
      const result = schemaValidate(CommonsDividendSchema, { ...VALID_COMMONS_DIVIDEND, period_end: '2026-02-31T00:00:00' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// MutualCredit
// ===========================================================================

describe('MutualCreditSchema', () => {
  it('accepts a valid document', () => {
    const result = schemaValidate(MutualCreditSchema, VALID_MUTUAL_CREDIT);
    expect(result.valid).toBe(true);
  });

  it('accepts document with optional settled_at and settlement', () => {
    const doc = {
      ...VALID_MUTUAL_CREDIT,
      settled: true,
      settled_at: '2026-01-15T00:00:00Z',
      settlement: { settlement_method: 'direct_payment' },
    };
    const result = schemaValidate(MutualCreditSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('accepts all credit_type variants', () => {
    for (const credit_type of ['refund', 'prepayment', 'obligation', 'delegation'] as const) {
      const doc = { ...VALID_MUTUAL_CREDIT, credit_type };
      const result = schemaValidate(MutualCreditSchema, doc);
      expect(result.valid).toBe(true);
    }
  });

  it('accepts all settlement_method variants', () => {
    for (const settlement_method of ['direct_payment', 'reciprocal_performance', 'commons_contribution', 'forgiven'] as const) {
      const doc = {
        ...VALID_MUTUAL_CREDIT,
        settled: true,
        settled_at: '2026-01-15T00:00:00Z',
        settlement: { settlement_method },
      };
      const result = schemaValidate(MutualCreditSchema, doc);
      expect(result.valid).toBe(true);
    }
  });

  describe('required field rejection', () => {
    const requiredFields = ['credit_id', 'creditor_id', 'debtor_id', 'amount_micro', 'credit_type', 'issued_at', 'settled', 'contract_version'] as const;

    for (const field of requiredFields) {
      it(`rejects when ${field} is missing`, () => {
        const result = schemaValidate(MutualCreditSchema, without(VALID_MUTUAL_CREDIT, field));
        expect(result.valid).toBe(false);
      });
    }
  });

  describe('type constraint violations', () => {
    it('rejects invalid credit_type', () => {
      const result = schemaValidate(MutualCreditSchema, { ...VALID_MUTUAL_CREDIT, credit_type: 'loan' });
      expect(result.valid).toBe(false);
    });

    it('rejects non-boolean settled', () => {
      const result = schemaValidate(MutualCreditSchema, { ...VALID_MUTUAL_CREDIT, settled: 'false' });
      expect(result.valid).toBe(false);
    });

    it('rejects numeric amount_micro', () => {
      const result = schemaValidate(MutualCreditSchema, { ...VALID_MUTUAL_CREDIT, amount_micro: 200000 });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid settlement_method', () => {
      const result = schemaValidate(MutualCreditSchema, {
        ...VALID_MUTUAL_CREDIT,
        settlement: { settlement_method: 'barter' },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid date-time for issued_at', () => {
      const result = schemaValidate(MutualCreditSchema, { ...VALID_MUTUAL_CREDIT, issued_at: 'not-a-datetime' });
      expect(result.valid).toBe(false);
    });

    it('rejects amount_micro with alphabetic chars', () => {
      const result = schemaValidate(MutualCreditSchema, { ...VALID_MUTUAL_CREDIT, amount_micro: '200k' });
      expect(result.valid).toBe(false);
    });
  });

  describe('unsigned amount (MicroUSDUnsigned) enforcement', () => {
    it('rejects negative amount_micro (unsigned after fix)', () => {
      const doc = { ...VALID_MUTUAL_CREDIT, amount_micro: '-200000' };
      const result = schemaValidate(MutualCreditSchema, doc);
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// RoutingConstraint
// ===========================================================================

describe('RoutingConstraintSchema', () => {
  it('accepts a minimal valid document (only contract_version required)', () => {
    const result = schemaValidate(RoutingConstraintSchema, { contract_version: '4.0.0' });
    expect(result.valid).toBe(true);
  });

  it('accepts a document with trust_level', () => {
    const result = schemaValidate(RoutingConstraintSchema, VALID_ROUTING_CONSTRAINT);
    expect(result.valid).toBe(true);
  });

  it('accepts a fully-populated document', () => {
    const doc = {
      required_capabilities: ['text-generation', 'code-review'],
      max_cost_micro: '5000000',
      min_health: 0.9,
      allowed_providers: ['anthropic', 'openai'],
      trust_level: 'verified',
      min_reputation: 0.7,
      contract_version: '4.0.0',
    };
    const result = schemaValidate(RoutingConstraintSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('accepts all trust_level variants', () => {
    for (const trust_level of ['public', 'authenticated', 'verified', 'trusted'] as const) {
      const doc = { trust_level, contract_version: '4.0.0' };
      const result = schemaValidate(RoutingConstraintSchema, doc);
      expect(result.valid).toBe(true);
    }
  });

  describe('required field rejection', () => {
    it('rejects when contract_version is missing', () => {
      const result = schemaValidate(RoutingConstraintSchema, { trust_level: 'authenticated' });
      expect(result.valid).toBe(false);
    });
  });

  describe('type constraint violations', () => {
    it('rejects invalid trust_level', () => {
      const result = schemaValidate(RoutingConstraintSchema, { ...VALID_ROUTING_CONSTRAINT, trust_level: 'admin' });
      expect(result.valid).toBe(false);
    });

    it('rejects min_health above 1', () => {
      const result = schemaValidate(RoutingConstraintSchema, { ...VALID_ROUTING_CONSTRAINT, min_health: 1.1 });
      expect(result.valid).toBe(false);
    });

    it('rejects negative min_health', () => {
      const result = schemaValidate(RoutingConstraintSchema, { ...VALID_ROUTING_CONSTRAINT, min_health: -0.1 });
      expect(result.valid).toBe(false);
    });

    it('rejects min_reputation above 1', () => {
      const result = schemaValidate(RoutingConstraintSchema, { ...VALID_ROUTING_CONSTRAINT, min_reputation: 2 });
      expect(result.valid).toBe(false);
    });

    it('rejects numeric max_cost_micro', () => {
      const result = schemaValidate(RoutingConstraintSchema, { ...VALID_ROUTING_CONSTRAINT, max_cost_micro: 5000 });
      expect(result.valid).toBe(false);
    });

    it('rejects empty string in required_capabilities', () => {
      const result = schemaValidate(RoutingConstraintSchema, {
        ...VALID_ROUTING_CONSTRAINT,
        required_capabilities: [''],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects empty string in allowed_providers', () => {
      const result = schemaValidate(RoutingConstraintSchema, {
        ...VALID_ROUTING_CONSTRAINT,
        allowed_providers: ['anthropic', ''],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format violations', () => {
    it('rejects invalid contract_version pattern', () => {
      const result = schemaValidate(RoutingConstraintSchema, { contract_version: '4.0' });
      expect(result.valid).toBe(false);
    });

    it('rejects contract_version with prefix', () => {
      const result = schemaValidate(RoutingConstraintSchema, { contract_version: 'v4.0.0' });
      expect(result.valid).toBe(false);
    });
  });
});

// ===========================================================================
// Cross-field validators (v4.x) — BB-C7-I2-TEST-001
// ===========================================================================

describe('Cross-field validators (v4.x)', () => {
  // These tests use validate() with default crossField:true to exercise
  // the cross-field validators registered in src/validators/index.ts.

  // ---------------------------------------------------------------------------
  // EscrowEntry cross-field
  // ---------------------------------------------------------------------------
  describe('EscrowEntry cross-field', () => {
    const validHeldEscrow = { ...VALID_ESCROW_ENTRY };

    it('rejects self-escrow (payer === payee)', () => {
      const doc = { ...validHeldEscrow, payer_id: 'a1', payee_id: 'a1' };
      const result = validate(EscrowEntrySchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('self-escrow'))).toBe(true);
    });

    it('rejects released state without released_at', () => {
      const doc = { ...validHeldEscrow, state: 'released' };
      const result = validate(EscrowEntrySchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('released_at is required'))).toBe(true);
    });

    it('rejects held state with released_at', () => {
      const doc = { ...validHeldEscrow, state: 'held', released_at: '2026-01-15T00:00:00Z' };
      const result = validate(EscrowEntrySchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('released_at must not be present'))).toBe(true);
    });

    it('rejects disputed state without dispute_id', () => {
      const doc = { ...validHeldEscrow, state: 'disputed' };
      const result = validate(EscrowEntrySchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('dispute_id is required'))).toBe(true);
    });

    it('rejects released_at before held_at', () => {
      const doc = {
        ...validHeldEscrow,
        state: 'released',
        held_at: '2026-02-01T00:00:00Z',
        released_at: '2026-01-01T00:00:00Z',
      };
      const result = validate(EscrowEntrySchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('released_at must be >= held_at'))).toBe(true);
    });

    it('accepts valid released escrow', () => {
      const doc = {
        ...validHeldEscrow,
        state: 'released',
        released_at: '2026-01-15T00:00:00Z',
      };
      const result = validate(EscrowEntrySchema, doc);
      expect(result.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // StakePosition cross-field
  // ---------------------------------------------------------------------------
  describe('StakePosition cross-field', () => {
    it('rejects vesting conservation violation (vested+remaining !== total)', () => {
      const doc = {
        ...VALID_STAKE_POSITION,
        amount_micro: '500000',
        vesting: {
          schedule: 'performance_gated',
          vested_micro: '300000',
          remaining_micro: '100000', // 300000 + 100000 !== 500000
        },
      };
      const result = validate(StakePositionSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('vesting conservation violated'))).toBe(true);
    });

    it('rejects immediate schedule with non-zero remaining', () => {
      const doc = {
        ...VALID_STAKE_POSITION,
        amount_micro: '500000',
        vesting: {
          schedule: 'immediate',
          vested_micro: '300000',
          remaining_micro: '200000',
        },
      };
      const result = validate(StakePositionSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('remaining_micro must be "0"'))).toBe(true);
    });

    it('accepts valid conservation (500000 = 300000 + 200000)', () => {
      const doc = {
        ...VALID_STAKE_POSITION,
        amount_micro: '500000',
        vesting: {
          schedule: 'performance_gated',
          vested_micro: '300000',
          remaining_micro: '200000',
        },
      };
      const result = validate(StakePositionSchema, doc);
      expect(result.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // MutualCredit cross-field
  // ---------------------------------------------------------------------------
  describe('MutualCredit cross-field', () => {
    it('rejects self-credit (creditor === debtor)', () => {
      const doc = { ...VALID_MUTUAL_CREDIT, creditor_id: 'a1', debtor_id: 'a1' };
      const result = validate(MutualCreditSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('self-credit'))).toBe(true);
    });

    it('rejects settled:true without settled_at', () => {
      const doc = {
        ...VALID_MUTUAL_CREDIT,
        settled: true,
        settlement: { settlement_method: 'direct_payment' },
      };
      const result = validate(MutualCreditSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('settled_at is required'))).toBe(true);
    });

    it('rejects settled:true without settlement', () => {
      const doc = {
        ...VALID_MUTUAL_CREDIT,
        settled: true,
        settled_at: '2026-01-15T00:00:00Z',
      };
      const result = validate(MutualCreditSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('settlement is required'))).toBe(true);
    });

    it('rejects settled_at when settled:false', () => {
      const doc = {
        ...VALID_MUTUAL_CREDIT,
        settled: false,
        settled_at: '2026-01-15T00:00:00Z',
      };
      const result = validate(MutualCreditSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('settled_at must not be present'))).toBe(true);
    });

    it('rejects settled_at before issued_at', () => {
      const doc = {
        ...VALID_MUTUAL_CREDIT,
        settled: true,
        issued_at: '2026-02-01T00:00:00Z',
        settled_at: '2026-01-01T00:00:00Z',
        settlement: { settlement_method: 'direct_payment' },
      };
      const result = validate(MutualCreditSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('settled_at must be >= issued_at'))).toBe(true);
    });

    it('accepts valid settled credit', () => {
      const doc = {
        ...VALID_MUTUAL_CREDIT,
        settled: true,
        settled_at: '2026-01-15T00:00:00Z',
        settlement: { settlement_method: 'direct_payment' },
      };
      const result = validate(MutualCreditSchema, doc);
      expect(result.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // CommonsDividend cross-field
  // ---------------------------------------------------------------------------
  describe('CommonsDividend cross-field', () => {
    it('rejects period_end <= period_start', () => {
      const doc = {
        ...VALID_COMMONS_DIVIDEND,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-01-01T00:00:00Z',
      };
      const result = validate(CommonsDividendSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('period_end must be after period_start'))).toBe(true);
    });

    it('accepts valid period ordering', () => {
      const result = validate(CommonsDividendSchema, VALID_COMMONS_DIVIDEND);
      expect(result.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // DisputeRecord cross-field
  // ---------------------------------------------------------------------------
  describe('DisputeRecord cross-field', () => {
    it('rejects self-dispute (filed_by === filed_against)', () => {
      const doc = { ...VALID_DISPUTE_RECORD, filed_by: 'a1', filed_against: 'a1' };
      const result = validate(DisputeRecordSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('self-dispute'))).toBe(true);
    });

    it('accepts different parties', () => {
      const result = validate(DisputeRecordSchema, VALID_DISPUTE_RECORD);
      expect(result.valid).toBe(true);
    });

    it('rejects resolution.resolved_at before filed_at (BB-C8-I1-CON-009)', () => {
      const doc = {
        ...VALID_DISPUTE_RECORD,
        filed_at: '2026-06-01T00:00:00Z',
        resolution: {
          outcome: 'upheld',
          resolved_at: '2026-01-01T00:00:00Z', // before filed_at
        },
      };
      const result = validate(DisputeRecordSchema, doc);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.includes('resolved_at must be >= filed_at'))).toBe(true);
      }
    });

    it('accepts resolution.resolved_at equal to filed_at', () => {
      const doc = {
        ...VALID_DISPUTE_RECORD,
        filed_at: '2026-06-01T00:00:00Z',
        resolution: {
          outcome: 'dismissed',
          resolved_at: '2026-06-01T00:00:00Z', // equal — allowed (>=)
        },
      };
      const result = validate(DisputeRecordSchema, doc);
      expect(result.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Sanction cross-field
  // ---------------------------------------------------------------------------
  describe('Sanction cross-field', () => {
    it('rejects expires_at on terminated severity', () => {
      const doc = {
        ...VALID_SANCTION,
        severity: 'terminated',
        expires_at: '2026-06-01T00:00:00Z',
      };
      const result = validate(SanctionSchema, doc);
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.errors.some((e) => e.includes('terminated'))).toBe(true);
    });

    it('warns on missing expires_at for warning severity', () => {
      const doc = { ...VALID_SANCTION, severity: 'warning' };
      // No expires_at on VALID_SANCTION — should produce a warning but still be valid
      const result = validate(SanctionSchema, doc);
      expect(result.valid).toBe(true);
      expect(result.valid === true && result.warnings?.some((w) => w.includes('expires_at recommended'))).toBe(true);
    });

    it('accepts terminated without expires_at', () => {
      const doc = { ...VALID_SANCTION, severity: 'terminated' };
      const result = validate(SanctionSchema, doc);
      expect(result.valid).toBe(true);
    });
  });
});
