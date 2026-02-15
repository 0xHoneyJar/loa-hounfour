/**
 * Round-trip tests: constraint evaluator ↔ TypeScript validator equivalence.
 *
 * For each schema with cross-field validators, verifies that the constraint
 * file expressions (evaluated by the minimal evaluator) agree with the
 * TypeScript validators in src/validators/index.ts.
 *
 * @see FR-4 v4.6.0 — Cross-Language Constraints
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import { validate } from '../../src/validators/index.js';
import { EscrowEntrySchema } from '../../src/schemas/escrow-entry.js';
import { StakePositionSchema } from '../../src/schemas/stake-position.js';
import { MutualCreditSchema } from '../../src/schemas/mutual-credit.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';
import { DisputeRecordSchema } from '../../src/schemas/dispute-record.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';
import { PerformanceRecordSchema } from '../../src/schemas/performance-record.js';
import { ConversationSealingPolicySchema } from '../../src/schemas/conversation.js';
import { AccessPolicySchema } from '../../src/schemas/conversation.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';
import type { ConstraintFile, Constraint } from '../../src/constraints/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const constraintsDir = join(__dirname, '..', '..', 'constraints');

function loadConstraints(schemaId: string): ConstraintFile {
  const filePath = join(constraintsDir, `${schemaId}.constraints.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as ConstraintFile;
}

function findConstraint(file: ConstraintFile, id: string): Constraint {
  const c = file.constraints.find((c) => c.id === id);
  if (!c) throw new Error(`Constraint ${id} not found in ${file.schema_id}`);
  return c;
}

/**
 * Helper: evaluate a single constraint by id against data.
 */
function evalById(file: ConstraintFile, id: string, data: Record<string, unknown>): boolean {
  const c = findConstraint(file, id);
  return evaluateConstraint(data, c.expression);
}

// ─── EscrowEntry ───────────────────────────────────────────────────────────

describe('EscrowEntry round-trip', () => {
  const file = loadConstraints('EscrowEntry');

  const VALID_ESCROW = {
    escrow_id: '12345678-1234-4123-8123-123456789abc',
    payer_id: 'agent-a',
    payee_id: 'agent-b',
    amount_micro: '1000000',
    state: 'held',
    held_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-02-01T00:00:00Z',
    contract_version: '4.6.0',
  };

  it('self-escrow: both agree on violation', () => {
    const bad = { ...VALID_ESCROW, payee_id: 'agent-a' };
    const constraintResult = evalById(file, 'escrow-no-self-escrow', bad);
    const tsResult = validate(EscrowEntrySchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('self-escrow: both agree on valid', () => {
    const constraintResult = evalById(file, 'escrow-no-self-escrow', VALID_ESCROW);
    const tsResult = validate(EscrowEntrySchema, VALID_ESCROW);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('released state requires released_at: violation', () => {
    const bad = { ...VALID_ESCROW, state: 'released' };
    const constraintResult = evalById(file, 'escrow-released-requires-released_at', bad);
    const tsResult = validate(EscrowEntrySchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('released state with released_at: valid', () => {
    const good = { ...VALID_ESCROW, state: 'released', released_at: '2026-01-15T00:00:00Z' };
    const constraintResult = evalById(file, 'escrow-released-requires-released_at', good);
    expect(constraintResult).toBe(true);
  });

  it('held state with released_at: violation', () => {
    const bad = { ...VALID_ESCROW, state: 'held', released_at: '2026-01-15T00:00:00Z' };
    const constraintResult = evalById(file, 'escrow-held-no-released_at', bad);
    const tsResult = validate(EscrowEntrySchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('disputed without dispute_id: violation', () => {
    const bad = { ...VALID_ESCROW, state: 'disputed' };
    const constraintResult = evalById(file, 'escrow-disputed-requires-dispute_id', bad);
    const tsResult = validate(EscrowEntrySchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('held without expires_at: warning', () => {
    const { expires_at: _, ...noExpiry } = VALID_ESCROW;
    const constraintResult = evalById(file, 'escrow-held-ttl', noExpiry);
    // Constraint evaluator says violation (warning)
    expect(constraintResult).toBe(false);
    // TS validator returns valid with warning
    const tsResult = validate(EscrowEntrySchema, noExpiry);
    expect(tsResult.valid).toBe(true);
    expect(tsResult.warnings).toBeDefined();
  });

  it('expires_at after held_at: valid', () => {
    const constraintResult = evalById(file, 'escrow-expires-after-held', VALID_ESCROW);
    expect(constraintResult).toBe(true);
  });

  it('released_at before held_at: violation', () => {
    const bad = {
      ...VALID_ESCROW,
      state: 'released',
      released_at: '2025-12-01T00:00:00Z', // before held_at
    };
    const constraintResult = evalById(file, 'escrow-released-after-held', bad);
    const tsResult = validate(EscrowEntrySchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });
});

// ─── StakePosition ─────────────────────────────────────────────────────────

describe('StakePosition round-trip', () => {
  const file = loadConstraints('StakePosition');

  const VALID_STAKE = {
    stake_id: '12345678-1234-4123-8123-123456789abc',
    staker_id: 'agent-a',
    target_id: 'agent-b',
    amount_micro: '1000000',
    stake_type: 'conviction',
    vesting: {
      schedule: 'immediate',
      vested_micro: '1000000',
      remaining_micro: '0',
    },
    staked_at: '2026-01-01T00:00:00Z',
    contract_version: '4.6.0',
  };

  it('immediate schedule with zero remaining: valid', () => {
    const constraintResult = evalById(file, 'stake-immediate-zero-remaining', VALID_STAKE);
    const tsResult = validate(StakePositionSchema, VALID_STAKE);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('immediate schedule with non-zero remaining: violation', () => {
    const bad = {
      ...VALID_STAKE,
      vesting: { ...VALID_STAKE.vesting, remaining_micro: '500000' },
      amount_micro: '1500000',
    };
    const constraintResult = evalById(file, 'stake-immediate-zero-remaining', bad);
    const tsResult = validate(StakePositionSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('vesting conservation: valid', () => {
    const constraintResult = evalById(file, 'stake-vesting-conservation', VALID_STAKE);
    expect(constraintResult).toBe(true);
  });

  it('vesting conservation: violation', () => {
    const bad = {
      ...VALID_STAKE,
      vesting: { ...VALID_STAKE.vesting, vested_micro: '500000' },
      // amount is 1000000, but vested (500000) + remaining (0) = 500000 != 1000000
    };
    const constraintResult = evalById(file, 'stake-vesting-conservation', bad);
    const tsResult = validate(StakePositionSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });
});

// ─── MutualCredit ──────────────────────────────────────────────────────────

describe('MutualCredit round-trip', () => {
  const file = loadConstraints('MutualCredit');

  const VALID_CREDIT = {
    credit_id: 'credit-1',
    creditor_id: 'agent-a',
    debtor_id: 'agent-b',
    amount_micro: '500000',
    credit_type: 'refund',
    issued_at: '2026-01-01T00:00:00Z',
    settled: false,
    contract_version: '4.6.0',
  };

  it('self-credit: violation', () => {
    const bad = { ...VALID_CREDIT, debtor_id: 'agent-a' };
    const constraintResult = evalById(file, 'credit-no-self-credit', bad);
    const tsResult = validate(MutualCreditSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('self-credit: valid', () => {
    const constraintResult = evalById(file, 'credit-no-self-credit', VALID_CREDIT);
    expect(constraintResult).toBe(true);
  });

  it('settled without settled_at: violation', () => {
    const bad = {
      ...VALID_CREDIT,
      settled: true,
      settlement: { settlement_method: 'direct_payment' },
    };
    const constraintResult = evalById(file, 'credit-settled-requires-settled_at', bad);
    const tsResult = validate(MutualCreditSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('settled with settled_at: valid', () => {
    const good = {
      ...VALID_CREDIT,
      settled: true,
      settled_at: '2026-02-01T00:00:00Z',
      settlement: { settlement_method: 'direct_payment' },
    };
    const constraintResult = evalById(file, 'credit-settled-requires-settled_at', good);
    expect(constraintResult).toBe(true);
  });

  it('settled without settlement: violation', () => {
    const bad = {
      ...VALID_CREDIT,
      settled: true,
      settled_at: '2026-02-01T00:00:00Z',
    };
    const constraintResult = evalById(file, 'credit-settled-requires-settlement', bad);
    const tsResult = validate(MutualCreditSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('unsettled with settled_at: violation', () => {
    const bad = {
      ...VALID_CREDIT,
      settled: false,
      settled_at: '2026-02-01T00:00:00Z',
    };
    const constraintResult = evalById(file, 'credit-unsettled-no-settled_at', bad);
    const tsResult = validate(MutualCreditSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('temporal ordering: settled_at before issued_at: violation', () => {
    const bad = {
      ...VALID_CREDIT,
      settled: true,
      settled_at: '2025-12-01T00:00:00Z', // before issued_at
      settlement: { settlement_method: 'direct_payment' },
    };
    const constraintResult = evalById(file, 'credit-settled-after-issued', bad);
    const tsResult = validate(MutualCreditSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });
});

// ─── DisputeRecord ─────────────────────────────────────────────────────────

describe('DisputeRecord round-trip', () => {
  const file = loadConstraints('DisputeRecord');

  const VALID_DISPUTE = {
    dispute_id: 'dispute-1',
    filed_by: 'agent-a',
    filed_against: 'agent-b',
    dispute_type: 'quality',
    evidence: [{ event_id: 'ev-1', description: 'Poor output quality' }],
    filed_at: '2026-01-01T00:00:00Z',
    contract_version: '4.6.0',
  };

  it('self-dispute: violation', () => {
    const bad = { ...VALID_DISPUTE, filed_against: 'agent-a' };
    const constraintResult = evalById(file, 'dispute-no-self-dispute', bad);
    const tsResult = validate(DisputeRecordSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('self-dispute: valid', () => {
    const constraintResult = evalById(file, 'dispute-no-self-dispute', VALID_DISPUTE);
    const tsResult = validate(DisputeRecordSchema, VALID_DISPUTE);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('resolution before filing: violation', () => {
    const bad = {
      ...VALID_DISPUTE,
      resolution: {
        outcome: 'upheld',
        resolved_at: '2025-12-01T00:00:00Z', // before filed_at
      },
    };
    const constraintResult = evalById(file, 'dispute-resolution-temporal', bad);
    const tsResult = validate(DisputeRecordSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('resolution after filing: valid', () => {
    const good = {
      ...VALID_DISPUTE,
      resolution: {
        outcome: 'upheld',
        resolved_at: '2026-02-01T00:00:00Z',
      },
    };
    const constraintResult = evalById(file, 'dispute-resolution-temporal', good);
    expect(constraintResult).toBe(true);
  });

  it('no resolution: implication vacuously true', () => {
    const constraintResult = evalById(file, 'dispute-resolution-temporal', VALID_DISPUTE);
    expect(constraintResult).toBe(true);
  });
});

// ─── Sanction ──────────────────────────────────────────────────────────────

describe('Sanction round-trip', () => {
  const file = loadConstraints('Sanction');

  const VALID_SANCTION = {
    sanction_id: 'sanc-1',
    agent_id: 'agent-a',
    severity: 'warning',
    trigger: {
      violation_type: 'safety_violation',
      occurrence_count: 1,
      evidence_event_ids: ['ev-1'],
    },
    imposed_by: 'automatic',
    imposed_at: '2026-01-01T00:00:00Z',
    appeal_available: true,
    expires_at: '2026-02-01T00:00:00Z',
    contract_version: '4.6.0',
  };

  it('terminated with expiry: violation', () => {
    const bad = { ...VALID_SANCTION, severity: 'terminated', expires_at: '2026-02-01T00:00:00Z' };
    const constraintResult = evalById(file, 'sanction-terminated-no-expiry', bad);
    const tsResult = validate(SanctionSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('terminated without expiry: valid', () => {
    const good = { ...VALID_SANCTION, severity: 'terminated' };
    delete (good as Record<string, unknown>).expires_at;
    const constraintResult = evalById(file, 'sanction-terminated-no-expiry', good);
    expect(constraintResult).toBe(true);
  });

  it('expiry before imposed: violation', () => {
    const bad = { ...VALID_SANCTION, expires_at: '2025-12-01T00:00:00Z' };
    const constraintResult = evalById(file, 'sanction-expiry-after-imposed', bad);
    const tsResult = validate(SanctionSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('expiry after imposed: valid', () => {
    const constraintResult = evalById(file, 'sanction-expiry-after-imposed', VALID_SANCTION);
    expect(constraintResult).toBe(true);
  });

  it('warning without expiry: warning constraint fails', () => {
    const noExpiry = { ...VALID_SANCTION };
    delete (noExpiry as Record<string, unknown>).expires_at;
    const constraintResult = evalById(file, 'sanction-expiry-recommended', noExpiry);
    // Constraint says violation (warning)
    expect(constraintResult).toBe(false);
    // TS validator returns valid with warning
    const tsResult = validate(SanctionSchema, noExpiry);
    expect(tsResult.valid).toBe(true);
    expect(tsResult.warnings).toBeDefined();
  });

  it('escalation check: valid trigger', () => {
    const constraintResult = evalById(file, 'sanction-escalation-check', VALID_SANCTION);
    expect(constraintResult).toBe(true);
  });
});

// ─── ReputationScore ───────────────────────────────────────────────────────

describe('ReputationScore round-trip', () => {
  const file = loadConstraints('ReputationScore');

  const VALID_REPUTATION = {
    agent_id: 'agent-a',
    score: 0.85,
    components: {
      outcome_quality: 0.9,
      performance_consistency: 0.8,
      dispute_ratio: 0.7,
      community_standing: 0.95,
    },
    sample_size: 50,
    last_updated: '2026-01-01T00:00:00Z',
    decay_applied: false,
    contract_version: '4.6.0',
  };

  it('sufficient sample size: valid', () => {
    const constraintResult = evalById(file, 'reputation-min-sample', VALID_REPUTATION);
    const tsResult = validate(ReputationScoreSchema, VALID_REPUTATION);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('low sample size: warning', () => {
    const low = { ...VALID_REPUTATION, sample_size: 2 };
    const constraintResult = evalById(file, 'reputation-min-sample', low);
    // Constraint says violation (warning)
    expect(constraintResult).toBe(false);
    // TS validator returns valid with warning
    const tsResult = validate(ReputationScoreSchema, low);
    expect(tsResult.valid).toBe(true);
    expect(tsResult.warnings).toBeDefined();
  });

  it('perfect score with low sample: warning', () => {
    const suspicious = { ...VALID_REPUTATION, score: 1.0, sample_size: 5 };
    const constraintResult = evalById(file, 'reputation-perfect-suspicious', suspicious);
    // !(score == 1.0 && sample_size < 10) -> !(true && true) -> false
    expect(constraintResult).toBe(false);
    // TS validator returns valid with warnings
    const tsResult = validate(ReputationScoreSchema, suspicious);
    expect(tsResult.valid).toBe(true);
    expect(tsResult.warnings).toBeDefined();
    expect(tsResult.warnings!.some((w) => w.includes('perfect score'))).toBe(true);
  });

  it('perfect score with high sample: not suspicious', () => {
    const fine = { ...VALID_REPUTATION, score: 1.0, sample_size: 50 };
    const constraintResult = evalById(file, 'reputation-perfect-suspicious', fine);
    // !(score == 1.0 && sample_size < 10) -> !(true && false) -> true
    expect(constraintResult).toBe(true);
  });

  it('non-perfect score with low sample: not suspicious', () => {
    const fine = { ...VALID_REPUTATION, score: 0.5, sample_size: 2 };
    const constraintResult = evalById(file, 'reputation-perfect-suspicious', fine);
    // !(score == 1.0 && sample_size < 10) -> !(false && true) -> true
    expect(constraintResult).toBe(true);
  });
});

// ─── PerformanceRecord ─────────────────────────────────────────────────────

describe('PerformanceRecord round-trip', () => {
  const file = loadConstraints('PerformanceRecord');

  const VALID_PERF = {
    record_id: 'rec-1',
    agent_id: 'agent-a',
    billing_entry_id: 'bill-1',
    occurred_at: '2026-01-01T00:00:00Z',
    output: { tokens_consumed: 1000, model_used: 'gpt-4' },
    contract_version: '4.6.0',
  };

  it('mixed dividend without split_bps: violation', () => {
    const bad = { ...VALID_PERF, dividend_target: 'mixed' };
    const constraintResult = evalById(file, 'performance-dividend-split', bad);
    const tsResult = validate(PerformanceRecordSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('mixed dividend with split_bps: valid', () => {
    const good = { ...VALID_PERF, dividend_target: 'mixed', dividend_split_bps: 5000 };
    const constraintResult = evalById(file, 'performance-dividend-split', good);
    expect(constraintResult).toBe(true);
  });

  it('non-mixed dividend: implication vacuously true', () => {
    const good = { ...VALID_PERF, dividend_target: 'private' };
    const constraintResult = evalById(file, 'performance-dividend-split', good);
    expect(constraintResult).toBe(true);
  });

  it('validated with empty validated_by: warning', () => {
    const bad = {
      ...VALID_PERF,
      outcome: { outcome_validated: true, validated_by: [] },
    };
    const constraintResult = evalById(file, 'performance-validated-by', bad);
    // Constraint says violation (warning)
    expect(constraintResult).toBe(false);
    // TS validator returns valid with warning
    const tsResult = validate(PerformanceRecordSchema, bad);
    expect(tsResult.valid).toBe(true);
    expect(tsResult.warnings).toBeDefined();
  });

  it('validated with non-empty validated_by: valid', () => {
    const good = {
      ...VALID_PERF,
      outcome: { outcome_validated: true, validated_by: ['user-1'] },
    };
    const constraintResult = evalById(file, 'performance-validated-by', good);
    expect(constraintResult).toBe(true);
  });

  it('no outcome: implication vacuously true', () => {
    const constraintResult = evalById(file, 'performance-validated-by', VALID_PERF);
    expect(constraintResult).toBe(true);
  });
});

// ─── CommonsDividend ───────────────────────────────────────────────────────

describe('CommonsDividend round-trip', () => {
  const file = loadConstraints('CommonsDividend');

  const VALID_DIVIDEND = {
    dividend_id: 'div-1',
    pool_id: 'pool-1',
    total_micro: '10000000',
    governance: 'algorithmic',
    period_start: '2026-01-01T00:00:00Z',
    period_end: '2026-02-01T00:00:00Z',
    source_performance_ids: ['perf-1'],
    contract_version: '4.6.0',
  };

  it('temporal: period_end after period_start: valid', () => {
    const constraintResult = evalById(file, 'dividend-temporal', VALID_DIVIDEND);
    const tsResult = validate(CommonsDividendSchema, VALID_DIVIDEND);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('temporal: period_end before period_start: violation', () => {
    const bad = { ...VALID_DIVIDEND, period_end: '2025-12-01T00:00:00Z' };
    const constraintResult = evalById(file, 'dividend-temporal', bad);
    const tsResult = validate(CommonsDividendSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('provenance present: valid', () => {
    const constraintResult = evalById(file, 'dividend-provenance', VALID_DIVIDEND);
    expect(constraintResult).toBe(true);
  });

  it('provenance missing: warning', () => {
    const { source_performance_ids: _, ...noProvenance } = VALID_DIVIDEND;
    const constraintResult = evalById(file, 'dividend-provenance', noProvenance);
    expect(constraintResult).toBe(false);
    // TS validator returns valid with warning
    const tsResult = validate(CommonsDividendSchema, noProvenance);
    expect(tsResult.valid).toBe(true);
    expect(tsResult.warnings).toBeDefined();
  });

  it('share sum correct: valid', () => {
    const withDist = {
      ...VALID_DIVIDEND,
      distribution: {
        recipients: [
          { address: 'addr-1', role: 'provider', share_bps: 6000, amount_micro: '6000000' },
          { address: 'addr-2', role: 'commons', share_bps: 4000, amount_micro: '4000000' },
        ],
      },
    };
    const constraintResult = evalById(file, 'dividend-share-sum', withDist);
    expect(constraintResult).toBe(true);
  });

  it('amount conservation: valid', () => {
    const withDist = {
      ...VALID_DIVIDEND,
      distribution: {
        recipients: [
          { address: 'addr-1', role: 'provider', share_bps: 6000, amount_micro: '6000000' },
          { address: 'addr-2', role: 'commons', share_bps: 4000, amount_micro: '4000000' },
        ],
      },
    };
    const constraintResult = evalById(file, 'dividend-amount-conservation', withDist);
    expect(constraintResult).toBe(true);
  });

  it('amount conservation: violation', () => {
    const bad = {
      ...VALID_DIVIDEND,
      distribution: {
        recipients: [
          { address: 'addr-1', role: 'provider', share_bps: 6000, amount_micro: '7000000' },
          { address: 'addr-2', role: 'commons', share_bps: 4000, amount_micro: '4000000' },
        ],
      },
    };
    const constraintResult = evalById(file, 'dividend-amount-conservation', bad);
    const tsResult = validate(CommonsDividendSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });
});

// ─── BillingEntry ──────────────────────────────────────────────────────────

describe('BillingEntry round-trip', () => {
  const file = loadConstraints('BillingEntry');

  it('has required fields: valid', () => {
    const data = { id: 'bill-1', trace_id: 'trace-1', tenant_id: 'tenant-1' };
    const constraintResult = evalById(file, 'billing-valid', data);
    expect(constraintResult).toBe(true);
  });

  it('missing id: violation', () => {
    const data = { trace_id: 'trace-1', tenant_id: 'tenant-1' };
    const constraintResult = evalById(file, 'billing-valid', data);
    expect(constraintResult).toBe(false);
  });
});

// ─── ConversationSealingPolicy ─────────────────────────────────────────────

describe('ConversationSealingPolicy round-trip', () => {
  const file = loadConstraints('ConversationSealingPolicy');

  it('has seal_algorithm: valid', () => {
    const data = { seal_algorithm: 'sha256' };
    const constraintResult = evalById(file, 'sealing-policy-valid', data);
    expect(constraintResult).toBe(true);
  });

  it('missing seal_algorithm: violation', () => {
    const data = {};
    const constraintResult = evalById(file, 'sealing-policy-valid', data);
    expect(constraintResult).toBe(false);
  });
});

// ─── AccessPolicy ──────────────────────────────────────────────────────────

describe('AccessPolicy round-trip', () => {
  const file = loadConstraints('AccessPolicy');

  it('has visibility: valid', () => {
    const data = { visibility: 'public' };
    const constraintResult = evalById(file, 'access-policy-valid', data);
    expect(constraintResult).toBe(true);
  });

  it('missing visibility: violation', () => {
    const data = {};
    const constraintResult = evalById(file, 'access-policy-valid', data);
    expect(constraintResult).toBe(false);
  });
});

// ─── Constraint file structure ─────────────────────────────────────────────

describe('Constraint file structure', () => {
  const schemaIds = [
    'EscrowEntry', 'StakePosition', 'MutualCredit', 'CommonsDividend',
    'DisputeRecord', 'Sanction', 'ReputationScore', 'BillingEntry',
    'PerformanceRecord', 'ConversationSealingPolicy', 'AccessPolicy',
  ];

  for (const schemaId of schemaIds) {
    it(`${schemaId} constraint file has valid structure`, () => {
      const file = loadConstraints(schemaId);
      expect(file.$schema).toBe('https://loa-hounfour.dev/schemas/constraint-file.json');
      expect(file.schema_id).toBe(schemaId);
      expect(file.contract_version).toBe('4.6.0');
      expect(file.constraints.length).toBeGreaterThan(0);

      for (const constraint of file.constraints) {
        expect(constraint.id).toBeTruthy();
        expect(constraint.expression).toBeTruthy();
        expect(['error', 'warning']).toContain(constraint.severity);
        expect(constraint.message).toBeTruthy();
        expect(constraint.fields.length).toBeGreaterThan(0);
      }
    });
  }
});
