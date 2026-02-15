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
import { evaluateConstraint, MAX_EXPRESSION_DEPTH } from '../../src/constraints/evaluator.js';
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
import { CompletionRequestSchema } from '../../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../../src/schemas/model/completion-result.js';
import { ProviderWireMessageSchema } from '../../src/schemas/model/provider-wire-message.js';
import { EnsembleRequestSchema } from '../../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../../src/schemas/model/ensemble/ensemble-result.js';
import { BudgetScopeSchema } from '../../src/schemas/model/routing/budget-scope.js';
import type { ConstraintFile, Constraint } from '../../src/constraints/types.js';
import { expressionVersionSupported, EXPRESSION_VERSIONS_SUPPORTED } from '../../src/constraints/types.js';
import { EXPRESSION_VERSION, validateExpression } from '../../src/constraints/grammar.js';
import { ConstraintProposalSchema } from '../../src/schemas/model/constraint-proposal.js';

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
    contract_version: '5.0.0',
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
    contract_version: '5.0.0',
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
    contract_version: '5.0.0',
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
    contract_version: '5.0.0',
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
    contract_version: '5.0.0',
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
    contract_version: '5.0.0',
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
    contract_version: '5.0.0',
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
    contract_version: '5.0.0',
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

// ─── Expression depth limit (BB-C9-001) ────────────────────────────────────

describe('Expression depth limit', () => {
  it('exports MAX_EXPRESSION_DEPTH as 32', () => {
    expect(MAX_EXPRESSION_DEPTH).toBe(32);
  });

  it('rejects deeply nested parentheses exceeding MAX_EXPRESSION_DEPTH', () => {
    // Build an expression with 33+ levels of nesting: ((((... true ))))
    const depth = MAX_EXPRESSION_DEPTH + 1;
    const open = '('.repeat(depth);
    const close = ')'.repeat(depth);
    const expr = `${open}true${close}`;
    expect(() => evaluateConstraint({}, expr)).toThrow('Expression nesting exceeds maximum depth');
  });

  it('accepts nesting within MAX_EXPRESSION_DEPTH', () => {
    // The top-level evaluateConstraint call uses 1 depth level.
    // Each parenthesized sub-expression adds 1 more.
    // MAX_EXPRESSION_DEPTH - 1 levels of parens = MAX_EXPRESSION_DEPTH total calls, all within limit.
    const depth = MAX_EXPRESSION_DEPTH - 1;
    const open = '('.repeat(depth);
    const close = ')'.repeat(depth);
    const expr = `${open}true${close}`;
    expect(evaluateConstraint({}, expr)).toBe(true);
  });
});

// ─── BigInt graceful error handling (BB-C9-006) ────────────────────────────

describe('BigInt graceful error handling', () => {
  it('returns false (not an error) when bigint_sum encounters non-numeric string', () => {
    // bigint_sum([field_a, field_b]) == 100 where field_a is "not-a-number"
    const data = { field_a: 'not-a-number', field_b: '50' };
    const result = evaluateConstraint(data, "bigint_sum([field_a, field_b]) == 100");
    // BigInt("not-a-number") would throw, but we now catch and return 0n
    // So this should evaluate to false (0n != 100n) rather than throwing
    expect(result).toBe(false);
  });

  it('does not throw when bigint_sum array form encounters non-numeric value', () => {
    const data = { items: [{ amount: 'abc' }, { amount: '50' }] };
    expect(() => evaluateConstraint(data, "bigint_sum(items, 'amount') == 50")).not.toThrow();
  });
});

// ─── CompletionRequest ────────────────────────────────────────────────────

describe('CompletionRequest round-trip', () => {
  const file = loadConstraints('CompletionRequest');

  const VALID_MESSAGE = { role: 'user', content: 'Hello' };

  const VALID_COMPLETION_REQ = {
    request_id: '12345678-1234-4123-8123-123456789abc',
    agent_id: 'agent-a',
    tenant_id: 'tenant-1',
    model: 'gpt-4',
    messages: [VALID_MESSAGE],
    contract_version: '5.0.0',
  };

  it('tools present without tool_choice: both fail', () => {
    const bad = {
      ...VALID_COMPLETION_REQ,
      tools: [{ type: 'function', function: { name: 'my_tool', description: 'A tool' } }],
    };
    const constraintResult = evalById(file, 'completion-request-tools-require-tool_choice', bad);
    const tsResult = validate(CompletionRequestSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('tools present with tool_choice: both pass', () => {
    const good = {
      ...VALID_COMPLETION_REQ,
      tools: [{ type: 'function', function: { name: 'my_tool', description: 'A tool' } }],
      tool_choice: 'auto',
    };
    const constraintResult = evalById(file, 'completion-request-tools-require-tool_choice', good);
    const tsResult = validate(CompletionRequestSchema, good);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('no tools: implication vacuously true', () => {
    const constraintResult = evalById(file, 'completion-request-tools-require-tool_choice', VALID_COMPLETION_REQ);
    const tsResult = validate(CompletionRequestSchema, VALID_COMPLETION_REQ);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });
});

// ─── CompletionResult ─────────────────────────────────────────────────────

describe('CompletionResult round-trip', () => {
  const file = loadConstraints('CompletionResult');

  const VALID_COMPLETION_RES = {
    request_id: '12345678-1234-4123-8123-123456789abc',
    model: 'gpt-4',
    provider: 'openai',
    content: 'Hello world',
    finish_reason: 'stop',
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost_micro: '500' },
    latency_ms: 100,
    contract_version: '5.0.0',
  };

  it('finish_reason=tool_calls without tool_calls: both fail', () => {
    const bad = { ...VALID_COMPLETION_RES, finish_reason: 'tool_calls', content: undefined };
    const constraintResult = evalById(file, 'completion-result-tool_calls-required', bad);
    const tsResult = validate(CompletionResultSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('finish_reason=tool_calls with tool_calls: both pass', () => {
    const good = {
      ...VALID_COMPLETION_RES,
      finish_reason: 'tool_calls',
      tool_calls: [{ id: 'tc-1', type: 'function', function: { name: 'my_tool', arguments: '{}' } }],
    };
    const constraintResult = evalById(file, 'completion-result-tool_calls-required', good);
    const tsResult = validate(CompletionResultSchema, good);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('usage conservation violation: both fail', () => {
    const bad = {
      ...VALID_COMPLETION_RES,
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 50, cost_micro: '500' },
    };
    const constraintResult = evalById(file, 'completion-result-usage-conservation', bad);
    const tsResult = validate(CompletionResultSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('valid usage: both pass', () => {
    const constraintResult = evalById(file, 'completion-result-usage-conservation', VALID_COMPLETION_RES);
    const tsResult = validate(CompletionResultSchema, VALID_COMPLETION_RES);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });
});

// ─── EnsembleRequest ──────────────────────────────────────────────────────

describe('EnsembleRequest round-trip', () => {
  const file = loadConstraints('EnsembleRequest');

  const VALID_MESSAGE = { role: 'user', content: 'Hello' };
  const VALID_INNER_REQ = {
    request_id: '12345678-1234-4123-8123-123456789abc',
    agent_id: 'agent-a',
    tenant_id: 'tenant-1',
    model: 'gpt-4',
    messages: [VALID_MESSAGE],
    contract_version: '5.0.0',
  };

  const VALID_ENSEMBLE_REQ = {
    ensemble_id: '12345678-1234-4123-8123-123456789abc',
    strategy: 'consensus',
    models: ['gpt-4', 'claude-3'],
    request: VALID_INNER_REQ,
    consensus_threshold: 0.8,
    contract_version: '5.0.0',
  };

  it('strategy=consensus without threshold: both fail', () => {
    const { consensus_threshold: _, ...bad } = VALID_ENSEMBLE_REQ;
    const constraintResult = evalById(file, 'ensemble-request-consensus-threshold', bad);
    const tsResult = validate(EnsembleRequestSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('strategy=consensus with threshold: both pass', () => {
    const constraintResult = evalById(file, 'ensemble-request-consensus-threshold', VALID_ENSEMBLE_REQ);
    const tsResult = validate(EnsembleRequestSchema, VALID_ENSEMBLE_REQ);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('strategy=first_complete: implication vacuously true', () => {
    const good = { ...VALID_ENSEMBLE_REQ, strategy: 'first_complete' };
    delete (good as Record<string, unknown>).consensus_threshold;
    const constraintResult = evalById(file, 'ensemble-request-consensus-threshold', good);
    const tsResult = validate(EnsembleRequestSchema, good);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('strategy=dialogue without session_id: constraint warns', () => {
    const data = {
      strategy: 'dialogue',
      request: { session_id: null },
    };
    const constraintResult = evalById(file, 'ensemble-request-dialogue-session-id', data);
    expect(constraintResult).toBe(false);
  });

  it('strategy=dialogue with session_id: constraint passes', () => {
    const data = {
      strategy: 'dialogue',
      request: { session_id: 'sess-123' },
    };
    const constraintResult = evalById(file, 'ensemble-request-dialogue-session-id', data);
    expect(constraintResult).toBe(true);
  });

  it('strategy=consensus: session_id warning vacuously true', () => {
    const data = {
      strategy: 'consensus',
      request: {},
    };
    const constraintResult = evalById(file, 'ensemble-request-dialogue-session-id', data);
    expect(constraintResult).toBe(true);
  });
});

// ─── EnsembleResult ───────────────────────────────────────────────────────

describe('EnsembleResult round-trip', () => {
  const file = loadConstraints('EnsembleResult');

  const VALID_COMPLETION_RES = {
    request_id: '12345678-1234-4123-8123-123456789abc',
    model: 'gpt-4',
    provider: 'openai',
    content: 'Hello world',
    finish_reason: 'stop',
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost_micro: '500' },
    latency_ms: 100,
    contract_version: '5.0.0',
  };

  const VALID_ENSEMBLE_RES = {
    ensemble_id: '12345678-1234-4123-8123-123456789abc',
    strategy: 'consensus',
    selected: VALID_COMPLETION_RES,
    candidates: [VALID_COMPLETION_RES],
    consensus_score: 0.9,
    total_cost_micro: '500',
    total_latency_ms: 200,
    contract_version: '5.0.0',
  };

  it('strategy=consensus without score: both fail', () => {
    const { consensus_score: _, ...bad } = VALID_ENSEMBLE_RES;
    const constraintResult = evalById(file, 'ensemble-result-consensus-score', bad);
    const tsResult = validate(EnsembleResultSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('total_cost < selected cost: both fail', () => {
    const bad = { ...VALID_ENSEMBLE_RES, total_cost_micro: '100' };
    const constraintResult = evalById(file, 'ensemble-result-cost-conservation', bad);
    const tsResult = validate(EnsembleResultSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('valid ensemble result: both pass', () => {
    const constraintResult = evalById(file, 'ensemble-result-consensus-score', VALID_ENSEMBLE_RES);
    const costResult = evalById(file, 'ensemble-result-cost-conservation', VALID_ENSEMBLE_RES);
    const tsResult = validate(EnsembleResultSchema, VALID_ENSEMBLE_RES);
    expect(constraintResult).toBe(true);
    expect(costResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('rounds_completed matches rounds.length: passes', () => {
    const good = {
      rounds: [{ round: 1 }, { round: 2 }],
      rounds_completed: 2,
    };
    const constraintResult = evalById(file, 'ensemble-result-rounds-completed-consistency', good);
    expect(constraintResult).toBe(true);
  });

  it('rounds_completed mismatches rounds.length: fails', () => {
    const bad = {
      rounds: [{ round: 1 }, { round: 2 }],
      rounds_completed: 5,
    };
    const constraintResult = evalById(file, 'ensemble-result-rounds-completed-consistency', bad);
    expect(constraintResult).toBe(false);
  });

  it('no rounds: rounds_completed consistency vacuously true', () => {
    const good = { rounds_completed: 3 };
    const constraintResult = evalById(file, 'ensemble-result-rounds-completed-consistency', good);
    expect(constraintResult).toBe(true);
  });

  it('rounds_completed <= rounds_requested: passes', () => {
    const good = { rounds_completed: 2, rounds_requested: 5 };
    const constraintResult = evalById(file, 'ensemble-result-rounds-completed-within-requested', good);
    expect(constraintResult).toBe(true);
  });

  it('rounds_completed > rounds_requested: fails', () => {
    const bad = { rounds_completed: 6, rounds_requested: 3 };
    const constraintResult = evalById(file, 'ensemble-result-rounds-completed-within-requested', bad);
    expect(constraintResult).toBe(false);
  });

  it('no rounds_requested: constraint vacuously true', () => {
    const good = { rounds_completed: 10 };
    const constraintResult = evalById(file, 'ensemble-result-rounds-completed-within-requested', good);
    expect(constraintResult).toBe(true);
  });
});

// ─── BudgetScope ──────────────────────────────────────────────────────────

describe('BudgetScope round-trip', () => {
  const file = loadConstraints('BudgetScope');

  const VALID_BUDGET = {
    scope: 'project',
    scope_id: 'proj-1',
    limit_micro: '10000000',
    spent_micro: '5000000',
    action_on_exceed: 'warn',
    contract_version: '5.0.0',
  };

  it('spent exceeds limit: constraint fails (warning), TS returns valid with warning', () => {
    const bad = { ...VALID_BUDGET, spent_micro: '15000000' };
    const constraintResult = evalById(file, 'budget-scope-overspend', bad);
    // Constraint says violation (warning-level)
    expect(constraintResult).toBe(false);
    // TS validator returns valid with warning
    const tsResult = validate(BudgetScopeSchema, bad);
    expect(tsResult.valid).toBe(true);
    expect(tsResult.warnings).toBeDefined();
  });

  it('spent within limit: both pass', () => {
    const constraintResult = evalById(file, 'budget-scope-overspend', VALID_BUDGET);
    const tsResult = validate(BudgetScopeSchema, VALID_BUDGET);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });
});

// ─── CompletionRequest session_id (Sprint 6) ──────────────────────────────

describe('CompletionRequest session_id round-trip', () => {
  const file = loadConstraints('CompletionRequest');

  const VALID_REQUEST = {
    request_id: '550e8400-e29b-41d4-a716-446655440000',
    agent_id: 'agent-1',
    tenant_id: 'tenant-1',
    model: 'claude-opus-4-6',
    messages: [{ role: 'user', content: 'hello' }],
    contract_version: '5.0.0',
  };

  it('native_runtime without session_id: constraint fails, TS fails', () => {
    const bad = { ...VALID_REQUEST, execution_mode: 'native_runtime', provider: 'claude-code' };
    const constraintResult = evalById(file, 'completion-request-native-runtime-session', bad);
    expect(constraintResult).toBe(false);
    const tsResult = validate(CompletionRequestSchema, bad);
    expect(tsResult.valid).toBe(false);
  });

  it('native_runtime with session_id: both pass', () => {
    const good = { ...VALID_REQUEST, execution_mode: 'native_runtime', provider: 'claude-code', session_id: 'sess-001' };
    const constraintResult = evalById(file, 'completion-request-native-runtime-session', good);
    expect(constraintResult).toBe(true);
    const tsResult = validate(CompletionRequestSchema, good);
    expect(tsResult.valid).toBe(true);
  });

  it('remote_model without session_id: both pass', () => {
    const good = { ...VALID_REQUEST, execution_mode: 'remote_model' };
    const constraintResult = evalById(file, 'completion-request-native-runtime-session', good);
    expect(constraintResult).toBe(true);
    const tsResult = validate(CompletionRequestSchema, good);
    expect(tsResult.valid).toBe(true);
  });

  it('no execution_mode without session_id: both pass', () => {
    const constraintResult = evalById(file, 'completion-request-native-runtime-session', VALID_REQUEST);
    expect(constraintResult).toBe(true);
    const tsResult = validate(CompletionRequestSchema, VALID_REQUEST);
    expect(tsResult.valid).toBe(true);
  });
});

// ─── EnsembleResult cost conservation completeness (Sprint 6) ─────────────

describe('EnsembleResult cost sum round-trip', () => {
  const file = loadConstraints('EnsembleResult');

  const VALID_RESULT = {
    ensemble_id: '550e8400-e29b-41d4-a716-446655440010',
    strategy: 'best_of_n',
    selected: {
      request_id: '550e8400-e29b-41d4-a716-446655440011',
      model: 'claude-opus-4-6',
      provider: 'anthropic',
      content: 'result',
      finish_reason: 'stop',
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, cost_micro: '3000000' },
      latency_ms: 500,
      contract_version: '5.0.0',
    },
    candidates: [
      {
        request_id: '550e8400-e29b-41d4-a716-446655440011',
        model: 'claude-opus-4-6',
        provider: 'anthropic',
        content: 'result',
        finish_reason: 'stop',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, cost_micro: '3000000' },
        latency_ms: 500,
        contract_version: '5.0.0',
      },
      {
        request_id: '550e8400-e29b-41d4-a716-446655440012',
        model: 'gpt-5.2',
        provider: 'openai',
        content: 'other result',
        finish_reason: 'stop',
        usage: { prompt_tokens: 100, completion_tokens: 60, total_tokens: 160, cost_micro: '2000000' },
        latency_ms: 600,
        contract_version: '5.0.0',
      },
    ],
    total_cost_micro: '5000000',
    total_latency_ms: 600,
    contract_version: '5.0.0',
  };

  it('cost sum matches total: constraint passes, TS passes', () => {
    const constraintResult = evalById(file, 'ensemble-result-total-cost-equals-sum', VALID_RESULT);
    expect(constraintResult).toBe(true);
    const tsResult = validate(EnsembleResultSchema, VALID_RESULT);
    expect(tsResult.valid).toBe(true);
  });

  it('cost sum mismatch: constraint fails, TS fails', () => {
    const bad = { ...VALID_RESULT, total_cost_micro: '9999999' };
    const constraintResult = evalById(file, 'ensemble-result-total-cost-equals-sum', bad);
    expect(constraintResult).toBe(false);
    const tsResult = validate(EnsembleResultSchema, bad);
    expect(tsResult.valid).toBe(false);
  });

  it('no candidates: constraint passes (null guard)', () => {
    const noCandidates = { ...VALID_RESULT, candidates: undefined };
    const constraintResult = evalById(file, 'ensemble-result-total-cost-equals-sum', noCandidates as Record<string, unknown>);
    expect(constraintResult).toBe(true);
  });
});

// ─── EnsembleRequest dialogue config (Sprint 7) ───────────────────────────

describe('EnsembleRequest dialogue config round-trip', () => {
  const file = loadConstraints('EnsembleRequest');

  const VALID_MESSAGE = { role: 'user', content: 'Hello' };
  const VALID_INNER_REQ = {
    request_id: '12345678-1234-4123-8123-123456789abc',
    agent_id: 'agent-a',
    tenant_id: 'tenant-1',
    model: 'gpt-4',
    messages: [VALID_MESSAGE],
    contract_version: '5.0.0',
  };

  it('strategy=dialogue without dialogue_config: both fail', () => {
    const bad = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      models: ['gpt-4', 'claude-3'],
      request: VALID_INNER_REQ,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-request-dialogue-config', bad);
    const tsResult = validate(EnsembleRequestSchema, bad);
    expect(constraintResult).toBe(false);
    expect(tsResult.valid).toBe(false);
  });

  it('strategy=dialogue with dialogue_config: both pass', () => {
    const good = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      models: ['gpt-4', 'claude-3'],
      request: VALID_INNER_REQ,
      dialogue_config: {
        max_rounds: 3,
        pass_thinking_traces: true,
        termination: 'fixed_rounds',
      },
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-request-dialogue-config', good);
    const tsResult = validate(EnsembleRequestSchema, good);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });

  it('strategy=sequential without dialogue_config: both pass', () => {
    const good = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'sequential',
      models: ['gpt-4', 'claude-3'],
      request: VALID_INNER_REQ,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-request-dialogue-config', good);
    const tsResult = validate(EnsembleRequestSchema, good);
    expect(constraintResult).toBe(true);
    expect(tsResult.valid).toBe(true);
  });
});

// ─── EnsembleResult dialogue rounds (Sprint 7) ────────────────────────────

describe('EnsembleResult dialogue rounds round-trip', () => {
  const file = loadConstraints('EnsembleResult');

  const VALID_COMPLETION_RES = {
    request_id: '12345678-1234-4123-8123-123456789abc',
    model: 'claude-3-opus',
    provider: 'anthropic',
    content: 'Response content',
    finish_reason: 'stop',
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, cost_micro: '5000' },
    latency_ms: 500,
    contract_version: '5.0.0',
  };

  it('strategy=dialogue without rounds: constraint fails, TS fails', () => {
    const bad = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      selected: VALID_COMPLETION_RES,
      candidates: [VALID_COMPLETION_RES],
      total_cost_micro: '5000',
      total_latency_ms: 500,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-result-dialogue-rounds', bad);
    expect(constraintResult).toBe(false);
    const tsResult = validate(EnsembleResultSchema, bad);
    expect(tsResult.valid).toBe(false);
  });

  it('strategy=dialogue without termination_reason: constraint fails, TS fails', () => {
    const bad = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      selected: VALID_COMPLETION_RES,
      candidates: [VALID_COMPLETION_RES],
      rounds: [{ round: 1, model: 'claude-3-opus', response: VALID_COMPLETION_RES }],
      total_cost_micro: '5000',
      total_latency_ms: 500,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-result-dialogue-termination', bad);
    expect(constraintResult).toBe(false);
    const tsResult = validate(EnsembleResultSchema, bad);
    expect(tsResult.valid).toBe(false);
  });

  it('strategy=dialogue with rounds and termination_reason: both pass', () => {
    const good = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      selected: VALID_COMPLETION_RES,
      candidates: [VALID_COMPLETION_RES],
      rounds: [{ round: 1, model: 'claude-3-opus', response: VALID_COMPLETION_RES }],
      termination_reason: 'fixed_rounds',
      total_cost_micro: '5000',
      total_latency_ms: 500,
      contract_version: '5.0.0',
    };
    const roundsResult = evalById(file, 'ensemble-result-dialogue-rounds', good);
    const terminationResult = evalById(file, 'ensemble-result-dialogue-termination', good);
    expect(roundsResult).toBe(true);
    expect(terminationResult).toBe(true);
    const tsResult = validate(EnsembleResultSchema, good);
    expect(tsResult.valid).toBe(true);
  });

  it('strategy=best_of_n without rounds: both pass (non-dialogue strategy)', () => {
    const good = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'best_of_n',
      selected: VALID_COMPLETION_RES,
      candidates: [VALID_COMPLETION_RES],
      total_cost_micro: '5000',
      total_latency_ms: 500,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-result-dialogue-rounds', good);
    const terminationResult = evalById(file, 'ensemble-result-dialogue-termination', good);
    expect(constraintResult).toBe(true);
    expect(terminationResult).toBe(true);
    const tsResult = validate(EnsembleResultSchema, good);
    expect(tsResult.valid).toBe(true);
  });

  it('strategy=dialogue with empty rounds: constraint fails', () => {
    const bad = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      selected: VALID_COMPLETION_RES,
      candidates: [VALID_COMPLETION_RES],
      rounds: [],
      termination_reason: 'timeout',
      total_cost_micro: '5000',
      total_latency_ms: 500,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-result-dialogue-rounds', bad);
    expect(constraintResult).toBe(false);
    const tsResult = validate(EnsembleResultSchema, bad);
    expect(tsResult.valid).toBe(false);
  });
});

// ─── EnsembleResult dialogue cost conservation (Sprint 9 / Bridge Iteration 2) ───

describe('EnsembleResult dialogue cost conservation round-trip', () => {
  const file = loadConstraints('EnsembleResult');

  const makeCompletionResult = (costMicro: string) => ({
    request_id: '12345678-1234-4123-8123-123456789abc',
    model: 'claude-3-opus',
    provider: 'anthropic',
    content: 'Response content',
    finish_reason: 'stop',
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, cost_micro: costMicro },
    latency_ms: 500,
    contract_version: '5.0.0',
  });

  it('dialogue total_cost_micro >= sum of round costs: both pass', () => {
    const round1 = makeCompletionResult('3000');
    const round2 = makeCompletionResult('4000');
    const good = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      selected: round2,
      candidates: [round1, round2],
      rounds: [
        { round: 1, model: 'claude-3-opus', response: round1 },
        { round: 2, model: 'gpt-5.2', response: round2 },
      ],
      termination_reason: 'fixed_rounds',
      total_cost_micro: '7000',
      total_latency_ms: 1000,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-result-dialogue-cost-conservation', good);
    expect(constraintResult).toBe(true);
    const tsResult = validate(EnsembleResultSchema, good);
    expect(tsResult.valid).toBe(true);
  });

  it('dialogue total_cost_micro < sum of round costs: constraint fails, TS fails', () => {
    const round1 = makeCompletionResult('3000');
    const round2 = makeCompletionResult('4000');
    const bad = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'dialogue',
      selected: round2,
      candidates: [round1, round2],
      rounds: [
        { round: 1, model: 'claude-3-opus', response: round1 },
        { round: 2, model: 'gpt-5.2', response: round2 },
      ],
      termination_reason: 'fixed_rounds',
      total_cost_micro: '5000', // Less than 3000 + 4000 = 7000
      total_latency_ms: 1000,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-result-dialogue-cost-conservation', bad);
    expect(constraintResult).toBe(false);
    const tsResult = validate(EnsembleResultSchema, bad);
    expect(tsResult.valid).toBe(false);
  });

  it('non-dialogue strategy: constraint passes (skipped)', () => {
    const result = makeCompletionResult('5000');
    const good = {
      ensemble_id: '12345678-1234-4123-8123-123456789abc',
      strategy: 'best_of_n',
      selected: result,
      candidates: [result],
      total_cost_micro: '5000',
      total_latency_ms: 500,
      contract_version: '5.0.0',
    };
    const constraintResult = evalById(file, 'ensemble-result-dialogue-cost-conservation', good);
    expect(constraintResult).toBe(true);
  });
});

// ─── SagaContext temporal constraints (Sprint 8) ──────────────────────────

describe('SagaContext temporal round-trip', () => {
  const file = loadConstraints('SagaContext');

  it('no _previous: step-monotonic passes (vacuously true)', () => {
    const data = { step: 3, direction: 'forward' };
    const result = evalById(file, 'saga-step-monotonic', data);
    expect(result).toBe(true);
  });

  it('step increases with _previous: passes', () => {
    const data = { step: 3, direction: 'forward', _previous: { step: 2, direction: 'forward' } };
    const result = evalById(file, 'saga-step-monotonic', data);
    expect(result).toBe(true);
  });

  it('step decreases with forward direction: fails', () => {
    const data = { step: 1, direction: 'forward', _previous: { step: 3, direction: 'forward' } };
    const result = evalById(file, 'saga-step-monotonic', data);
    expect(result).toBe(false);
  });

  it('step decreases with compensation direction: passes', () => {
    const data = { step: 1, direction: 'compensation', _previous: { step: 3, direction: 'forward' } };
    const result = evalById(file, 'saga-step-monotonic', data);
    expect(result).toBe(true);
  });

  it('step unchanged: passes (no change detected)', () => {
    const data = { step: 3, direction: 'forward', _previous: { step: 3, direction: 'forward' } };
    const result = evalById(file, 'saga-step-monotonic', data);
    expect(result).toBe(true);
  });

  it('direction forward→compensation: valid transition', () => {
    const data = { direction: 'compensation', _previous: { direction: 'forward' } };
    const result = evalById(file, 'saga-direction-valid-transition', data);
    expect(result).toBe(true);
  });

  it('direction compensation→forward: invalid transition', () => {
    const data = { direction: 'forward', _previous: { direction: 'compensation' } };
    const result = evalById(file, 'saga-direction-valid-transition', data);
    expect(result).toBe(false);
  });

  it('direction unchanged: passes', () => {
    const data = { direction: 'forward', _previous: { direction: 'forward' } };
    const result = evalById(file, 'saga-direction-valid-transition', data);
    expect(result).toBe(true);
  });
});

// ─── Temporal operator unit tests (Sprint 8) ──────────────────────────────

describe('Temporal operator evaluation', () => {
  it('changed() returns false when _previous is null', () => {
    const result = evaluateConstraint({ value: 10 }, 'changed(value)');
    expect(result).toBe(false);
  });

  it('changed() returns true when field differs', () => {
    const result = evaluateConstraint(
      { value: 10, _previous: { value: 5 } },
      'changed(value)',
    );
    expect(result).toBe(true);
  });

  it('changed() returns false when field is same', () => {
    const result = evaluateConstraint(
      { value: 10, _previous: { value: 10 } },
      'changed(value)',
    );
    expect(result).toBe(false);
  });

  it('previous() returns value from _previous', () => {
    const result = evaluateConstraint(
      { value: 'new', _previous: { value: 'old' } },
      "previous(value) == 'old'",
    );
    expect(result).toBe(true);
  });

  it('delta() returns numeric difference', () => {
    const result = evaluateConstraint(
      { step: 5, _previous: { step: 3 } },
      'delta(step) > 0',
    );
    expect(result).toBe(true);
  });

  it('delta() returns 0 when _previous is null', () => {
    const result = evaluateConstraint(
      { step: 5 },
      'delta(step) == 0',
    );
    expect(result).toBe(true);
  });

  it('changed() works with dot-path fields', () => {
    const result = evaluateConstraint(
      { usage: { cost: 100 }, _previous: { usage: { cost: 50 } } },
      'changed(usage.cost)',
    );
    expect(result).toBe(true);
  });
});

// ─── ConstraintProposal round-trip (Sprint 8) ────────────────────────────

describe('ConstraintProposal round-trip', () => {
  const file = loadConstraints('ConstraintProposal');

  it('accepted with HIGH_CONSENSUS: both pass', () => {
    const good = {
      review_status: 'accepted',
      consensus_category: 'HIGH_CONSENSUS',
    };
    const constraintResult = evalById(file, 'constraint-proposal-accepted-consensus', good);
    expect(constraintResult).toBe(true);
  });

  it('accepted with DISPUTED: both fail', () => {
    const bad = {
      review_status: 'accepted',
      consensus_category: 'DISPUTED',
    };
    const constraintResult = evalById(file, 'constraint-proposal-accepted-consensus', bad);
    expect(constraintResult).toBe(false);
  });

  it('under_review with any category: passes (not accepted)', () => {
    const good = {
      review_status: 'under_review',
      consensus_category: 'DISPUTED',
    };
    const constraintResult = evalById(file, 'constraint-proposal-accepted-consensus', good);
    expect(constraintResult).toBe(true);
  });

  it('no review_status: passes', () => {
    const good = {};
    const constraintResult = evalById(file, 'constraint-proposal-accepted-consensus', good);
    expect(constraintResult).toBe(true);
  });

  it('sunset_version >= expression_version: passes', () => {
    const good = { expression_version: '1.0', sunset_version: '3.0' };
    const constraintResult = evalById(file, 'constraint-proposal-sunset-after-expression', good);
    expect(constraintResult).toBe(true);
  });

  it('sunset_version < expression_version: fails', () => {
    const bad = { expression_version: '2.0', sunset_version: '1.0' };
    const constraintResult = evalById(file, 'constraint-proposal-sunset-after-expression', bad);
    expect(constraintResult).toBe(false);
  });

  it('sunset_version == expression_version: passes', () => {
    const good = { expression_version: '2.0', sunset_version: '2.0' };
    const constraintResult = evalById(file, 'constraint-proposal-sunset-after-expression', good);
    expect(constraintResult).toBe(true);
  });

  it('no sunset_version: passes (null antecedent)', () => {
    const good = { expression_version: '2.0' };
    const constraintResult = evalById(file, 'constraint-proposal-sunset-after-expression', good);
    expect(constraintResult).toBe(true);
  });
});

// ─── Expression version compatibility (Sprint 8) ─────────────────────────

describe('Expression version compatibility', () => {
  it('version 1.0 is supported', () => {
    expect(expressionVersionSupported('1.0')).toBe(true);
  });

  it('version 2.0 is supported', () => {
    expect(expressionVersionSupported('2.0')).toBe(true);
  });

  it('version 3.0 is not supported', () => {
    expect(expressionVersionSupported('3.0')).toBe(false);
  });

  it('version 0.5 is not supported', () => {
    expect(expressionVersionSupported('0.5')).toBe(false);
  });

  it('EXPRESSION_VERSIONS_SUPPORTED includes 1.0 and 2.0', () => {
    expect(EXPRESSION_VERSIONS_SUPPORTED).toContain('1.0');
    expect(EXPRESSION_VERSIONS_SUPPORTED).toContain('2.0');
    expect(EXPRESSION_VERSIONS_SUPPORTED).toHaveLength(2);
  });
});

// ─── Grammar v2.0 validates temporal expressions (Sprint 8) ──────────────

describe('Grammar v2.0 temporal syntax validation', () => {
  it('EXPRESSION_VERSION is 2.0', () => {
    expect(EXPRESSION_VERSION).toBe('2.0');
  });

  it('validates changed(field)', () => {
    const result = validateExpression('changed(step)');
    expect(result.valid).toBe(true);
  });

  it('validates previous(field)', () => {
    const result = validateExpression("previous(direction) == 'forward'");
    expect(result.valid).toBe(true);
  });

  it('validates delta(field) in comparison', () => {
    const result = validateExpression('delta(step) > 0');
    expect(result.valid).toBe(true);
  });

  it('validates temporal expression with dot-path', () => {
    const result = validateExpression('changed(usage.cost)');
    expect(result.valid).toBe(true);
  });

  it('validates full SagaContext constraint expression', () => {
    const result = validateExpression("_previous == null || !changed(step) || delta(step) > 0 || direction == 'compensation'");
    expect(result.valid).toBe(true);
  });
});

// ─── Constraint file structure ─────────────────────────────────────────────

describe('Constraint file structure', () => {
  const v4SchemaIds = [
    'EscrowEntry', 'StakePosition', 'MutualCredit', 'CommonsDividend',
    'DisputeRecord', 'Sanction', 'ReputationScore', 'BillingEntry',
    'PerformanceRecord', 'ConversationSealingPolicy', 'AccessPolicy',
  ];

  const v5SchemaIds = [
    'CompletionRequest', 'CompletionResult', 'ProviderWireMessage',
    'EnsembleRequest', 'EnsembleResult', 'BudgetScope',
  ];

  for (const schemaId of v4SchemaIds) {
    it(`${schemaId} constraint file has valid structure`, () => {
      const file = loadConstraints(schemaId);
      expect(file.$schema).toBe('https://loa-hounfour.dev/schemas/constraint-file.json');
      expect(file.schema_id).toBe(schemaId);
      expect(file.contract_version).toBe('5.0.0');
      expect(file.expression_version).toBe('1.0');
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

  for (const schemaId of v5SchemaIds) {
    it(`${schemaId} constraint file has valid structure`, () => {
      const file = loadConstraints(schemaId);
      expect(file.$schema).toBe('https://loa-hounfour.dev/schemas/constraint-file.json');
      expect(file.schema_id).toBe(schemaId);
      expect(file.contract_version).toBe('5.0.0');
      expect(file.expression_version).toBe('1.0');
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
