/**
 * Tests for x402 payment schemas.
 *
 * @see SDD §6.1 — x402 Payment Schemas
 * @see PRD FR-1 — x402 Payment Schemas
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (uuid, date-time)
import {
  X402QuoteSchema,
  X402PaymentProofSchema,
  X402SettlementSchema,
  X402SettlementStatusSchema,
  X402ErrorCodeSchema,
} from '../../src/economy/x402-payment.js';

const VALID_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('X402QuoteSchema', () => {
  const validQuote = {
    quote_id: VALID_UUID,
    model: 'claude-sonnet-4',
    max_cost_micro: '1000000',
    payment_address: VALID_ADDRESS,
    chain_id: 1,
    token_address: VALID_ADDRESS,
    valid_until: '2026-03-01T00:00:00Z',
  };

  it('has correct $id', () => {
    expect(X402QuoteSchema.$id).toBe('X402Quote');
  });

  it('validates a correct quote', () => {
    expect(Value.Check(X402QuoteSchema, validQuote)).toBe(true);
  });

  it('accepts optional per-token costs', () => {
    expect(Value.Check(X402QuoteSchema, {
      ...validQuote,
      cost_per_input_token_micro: '100',
      cost_per_output_token_micro: '200',
    })).toBe(true);
  });

  it('rejects MicroUSD with decimals', () => {
    expect(Value.Check(X402QuoteSchema, {
      ...validQuote,
      max_cost_micro: '100.50',
    })).toBe(false);
  });

  it('rejects negative MicroUSD', () => {
    expect(Value.Check(X402QuoteSchema, {
      ...validQuote,
      max_cost_micro: '-100',
    })).toBe(false);
  });

  it('rejects MicroUSD exceeding maxLength', () => {
    expect(Value.Check(X402QuoteSchema, {
      ...validQuote,
      max_cost_micro: '1'.repeat(21),
    })).toBe(false);
  });

  it('rejects invalid address pattern', () => {
    expect(Value.Check(X402QuoteSchema, {
      ...validQuote,
      payment_address: '0x123',
    })).toBe(false);
  });

  it('rejects chain_id < 1', () => {
    expect(Value.Check(X402QuoteSchema, {
      ...validQuote,
      chain_id: 0,
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(X402QuoteSchema, {
      ...validQuote,
      extra: true,
    })).toBe(false);
  });
});

describe('X402PaymentProofSchema', () => {
  it('has correct $id', () => {
    expect(X402PaymentProofSchema.$id).toBe('X402PaymentProof');
  });

  it('validates minimal proof', () => {
    expect(Value.Check(X402PaymentProofSchema, {
      payment_header: 'x402-v1 token=abc',
      quote_id: VALID_UUID,
    })).toBe(true);
  });

  it('accepts optional tx_hash', () => {
    expect(Value.Check(X402PaymentProofSchema, {
      payment_header: 'x402-v1 token=abc',
      quote_id: VALID_UUID,
      tx_hash: '0x' + 'a'.repeat(64),
    })).toBe(true);
  });

  it('rejects empty payment_header', () => {
    expect(Value.Check(X402PaymentProofSchema, {
      payment_header: '',
      quote_id: VALID_UUID,
    })).toBe(false);
  });
});

describe('X402SettlementSchema', () => {
  it('has correct $id', () => {
    expect(X402SettlementSchema.$id).toBe('X402Settlement');
  });

  it('validates a correct settlement', () => {
    expect(Value.Check(X402SettlementSchema, {
      payment_id: VALID_UUID,
      quote_id: VALID_UUID,
      actual_cost_micro: '500000',
      settlement_status: 'confirmed',
      settled_at: '2026-02-28T12:00:00Z',
      chain_id: 137,
      token_address: VALID_ADDRESS,
    })).toBe(true);
  });
});

describe('X402SettlementStatusSchema', () => {
  it('accepts valid statuses', () => {
    for (const status of ['pending', 'confirmed', 'failed', 'refunded']) {
      expect(Value.Check(X402SettlementStatusSchema, status)).toBe(true);
    }
  });

  it('rejects unknown status', () => {
    expect(Value.Check(X402SettlementStatusSchema, 'unknown')).toBe(false);
  });
});

describe('X402ErrorCodeSchema', () => {
  it('accepts valid error codes', () => {
    const validCodes = [
      'PAYMENT_REQUIRED', 'NOT_ALLOWLISTED', 'INFERENCE_FAILED',
      'FEATURE_DISABLED', 'QUOTE_EXPIRED', 'INSUFFICIENT_FUNDS',
    ];
    for (const code of validCodes) {
      expect(Value.Check(X402ErrorCodeSchema, code)).toBe(true);
    }
  });

  it('rejects unknown error code', () => {
    expect(Value.Check(X402ErrorCodeSchema, 'UNKNOWN_ERROR')).toBe(false);
  });
});
