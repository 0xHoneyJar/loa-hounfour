/**
 * Tests for InterAgentTransactionAudit constraint file (S1-T6).
 *
 * Validates all 5 constraints against valid and invalid inputs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'InterAgentTransactionAudit.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function findConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

const validTransaction = {
  audit_id: '660e8400-e29b-41d4-a716-446655440001',
  transaction_type: 'peer_transfer',
  sender: {
    agent_id: 'agent-alice',
    pre_balance_micro: '2000000',
    post_balance_micro: '1500000',
  },
  receiver: {
    agent_id: 'agent-bob',
    pre_balance_micro: '1000000',
    post_balance_micro: '1500000',
  },
  amount_micro: '500000',
  conservation_check: 'conserved',
  idempotency_key: 'tx-alice-001',
  timestamp: '2026-02-17T10:00:00Z',
  contract_version: '5.4.0',
};

describe('InterAgentTransactionAudit constraint file', () => {
  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('InterAgentTransactionAudit');
  });

  it('has contract_version 5.4.0', () => {
    expect(constraintFile.contract_version).toBe('5.4.0');
  });

  it('has 5 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(5);
  });

  describe('sender-conservation', () => {
    const c = findConstraint('transaction-audit-sender-conservation');

    it('passes for correct sender balance', () => {
      expect(evaluateConstraint(validTransaction, c.expression)).toBe(true);
    });

    it('fails for incorrect sender post_balance', () => {
      const invalid = {
        ...validTransaction,
        sender: { ...validTransaction.sender, post_balance_micro: '1000000' },
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('receiver-conservation', () => {
    const c = findConstraint('transaction-audit-receiver-conservation');

    it('passes for correct receiver balance', () => {
      expect(evaluateConstraint(validTransaction, c.expression)).toBe(true);
    });

    it('fails for incorrect receiver post_balance', () => {
      const invalid = {
        ...validTransaction,
        receiver: { ...validTransaction.receiver, post_balance_micro: '1200000' },
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('no-self-transfer', () => {
    const c = findConstraint('transaction-audit-no-self-transfer');

    it('passes for different sender and receiver', () => {
      expect(evaluateConstraint(validTransaction, c.expression)).toBe(true);
    });

    it('fails for self-transfer', () => {
      const invalid = {
        ...validTransaction,
        receiver: { ...validTransaction.receiver, agent_id: 'agent-alice' },
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('positive-amount', () => {
    const c = findConstraint('transaction-audit-positive-amount');

    it('passes for positive amount', () => {
      expect(evaluateConstraint(validTransaction, c.expression)).toBe(true);
    });

    it('fails for zero amount', () => {
      const invalid = { ...validTransaction, amount_micro: '0' };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('conservation-consistency', () => {
    const c = findConstraint('transaction-audit-conservation-consistency');

    it('passes for conserved transaction with correct balances', () => {
      expect(evaluateConstraint(validTransaction, c.expression)).toBe(true);
    });

    it('fails for conserved flag with non-conserving balances', () => {
      const invalid = {
        ...validTransaction,
        conservation_check: 'conserved',
        sender: { ...validTransaction.sender, post_balance_micro: '1000000' },
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('passes for violated flag even with non-conserving balances', () => {
      const violated = {
        ...validTransaction,
        conservation_check: 'violated',
        sender: { ...validTransaction.sender, post_balance_micro: '1000000' },
      };
      expect(evaluateConstraint(violated, c.expression)).toBe(true);
    });

    it('passes for unverifiable flag', () => {
      const unverifiable = {
        ...validTransaction,
        conservation_check: 'unverifiable',
        sender: { ...validTransaction.sender, post_balance_micro: '1000000' },
      };
      expect(evaluateConstraint(unverifiable, c.expression)).toBe(true);
    });
  });
});
