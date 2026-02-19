/**
 * Tests for InterAgentTransactionAudit schema (S1-T5).
 *
 * Validates schema structure, TypeBox validation, conservation fields,
 * and backward compatibility for optional fields.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  InterAgentTransactionAuditSchema,
  type InterAgentTransactionAudit,
} from '../../src/schemas/inter-agent-transaction-audit.js';

const validTransaction: InterAgentTransactionAudit = {
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
  idempotency_key: 'tx-alice-20260217-001',
  timestamp: '2026-02-17T10:00:00Z',
  contract_version: '5.4.0',
};

describe('InterAgentTransactionAuditSchema', () => {
  it('validates a valid peer transfer', () => {
    expect(Value.Check(InterAgentTransactionAuditSchema, validTransaction)).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { audit_id: _, ...noId } = validTransaction;
    expect(Value.Check(InterAgentTransactionAuditSchema, noId)).toBe(false);
  });

  it('accepts all valid transaction types', () => {
    for (const type of ['peer_transfer', 'delegation_budget', 'service_payment', 'governance_proposal_deposit'] as const) {
      const tx = { ...validTransaction, transaction_type: type };
      expect(Value.Check(InterAgentTransactionAuditSchema, tx)).toBe(true);
    }
  });

  it('rejects invalid transaction type', () => {
    const invalid = { ...validTransaction, transaction_type: 'refund' };
    expect(Value.Check(InterAgentTransactionAuditSchema, invalid)).toBe(false);
  });

  it('accepts all conservation_check values', () => {
    for (const status of ['conserved', 'violated', 'unverifiable'] as const) {
      const tx = { ...validTransaction, conservation_check: status };
      expect(Value.Check(InterAgentTransactionAuditSchema, tx)).toBe(true);
    }
  });

  it('rejects empty idempotency_key', () => {
    const invalid = { ...validTransaction, idempotency_key: '' };
    expect(Value.Check(InterAgentTransactionAuditSchema, invalid)).toBe(false);
  });

  it('accepts optional delegation_chain_id', () => {
    const withChain = { ...validTransaction, delegation_chain_id: '550e8400-e29b-41d4-a716-446655440001' };
    expect(Value.Check(InterAgentTransactionAuditSchema, withChain)).toBe(true);
  });

  it('accepts optional governance_context', () => {
    const withGov = {
      ...validTransaction,
      governance_context: {
        proposal_id: 'prop-001',
        governance_version: '1.0.0',
      },
    };
    expect(Value.Check(InterAgentTransactionAuditSchema, withGov)).toBe(true);
  });

  it('accepts optional sequence_number', () => {
    const withSeq = { ...validTransaction, sequence_number: 42 };
    expect(Value.Check(InterAgentTransactionAuditSchema, withSeq)).toBe(true);
  });

  it('rejects negative sequence_number', () => {
    const invalid = { ...validTransaction, sequence_number: -1 };
    expect(Value.Check(InterAgentTransactionAuditSchema, invalid)).toBe(false);
  });

  it('accepts optional metadata', () => {
    const withMeta = { ...validTransaction, metadata: { source: 'test' } };
    expect(Value.Check(InterAgentTransactionAuditSchema, withMeta)).toBe(true);
  });

  it('validates without optional fields (backward compat)', () => {
    // Only required fields
    const minimal: InterAgentTransactionAudit = {
      audit_id: '660e8400-e29b-41d4-a716-446655440001',
      transaction_type: 'peer_transfer',
      sender: { agent_id: 'a', pre_balance_micro: '0', post_balance_micro: '0' },
      receiver: { agent_id: 'b', pre_balance_micro: '0', post_balance_micro: '0' },
      amount_micro: '0',
      conservation_check: 'unverifiable',
      idempotency_key: 'key-1',
      timestamp: '2026-02-17T10:00:00Z',
      contract_version: '5.4.0',
    };
    expect(Value.Check(InterAgentTransactionAuditSchema, minimal)).toBe(true);
  });

  it('rejects additional properties', () => {
    const withExtra = { ...validTransaction, extra_field: 'not allowed' };
    expect(Value.Check(InterAgentTransactionAuditSchema, withExtra)).toBe(false);
  });

  it('rejects additional properties in sender', () => {
    const invalid = {
      ...validTransaction,
      sender: { ...validTransaction.sender, extra: true },
    };
    expect(Value.Check(InterAgentTransactionAuditSchema, invalid)).toBe(false);
  });

  it('has correct $id', () => {
    expect(InterAgentTransactionAuditSchema.$id).toBe('InterAgentTransactionAudit');
  });

  it('has x-cross-field-validated marker', () => {
    expect((InterAgentTransactionAuditSchema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
  });

  it('rejects invalid contract_version format', () => {
    const invalid = { ...validTransaction, contract_version: 'bad' };
    expect(Value.Check(InterAgentTransactionAuditSchema, invalid)).toBe(false);
  });
});
