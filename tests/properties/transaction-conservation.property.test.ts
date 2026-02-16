/**
 * Property-based tests for InterAgentTransactionAudit conservation (S1-T7).
 *
 * Uses fast-check to verify:
 * - For any valid transaction where conservation_check == 'conserved',
 *   sender.pre - amount == sender.post AND receiver.pre + amount == receiver.post
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import { InterAgentTransactionAuditSchema } from '../../src/schemas/inter-agent-transaction-audit.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// FL-SPRINT-003: MicroUSD generator — non-negative BigInt as string, no leading zeros (except "0")
const microUSDArb = fc
  .bigInt({ min: 0n, max: (1n << 53n) - 1n })
  .map((n) => String(n));

/** Generate a positive micro-USD amount (non-zero). */
const positiveMicroArb = fc
  .bigInt({ min: 1n, max: (1n << 53n) - 1n })
  .map((n) => String(n));

/**
 * Generate a conserved transaction: sender.pre - amount = sender.post,
 * receiver.pre + amount = receiver.post.
 */
const conservedTransactionArb = fc.tuple(
  fc.uuid(),
  positiveMicroArb,
  microUSDArb,
  microUSDArb,
  fc.string({ minLength: 1, maxLength: 10 }),
  fc.string({ minLength: 1, maxLength: 10 }),
).filter(([, amount, senderPre]) => {
  // Ensure sender has enough balance
  try {
    return BigInt(senderPre) >= BigInt(amount);
  } catch {
    return false;
  }
}).map(([auditId, amount, senderPre, receiverPre, senderId, receiverId]) => {
  const senderPost = String(BigInt(senderPre) - BigInt(amount));
  const receiverPost = String(BigInt(receiverPre) + BigInt(amount));
  return {
    audit_id: auditId,
    transaction_type: 'peer_transfer' as const,
    sender: {
      agent_id: `sender-${senderId}`,
      pre_balance_micro: senderPre,
      post_balance_micro: senderPost,
    },
    receiver: {
      agent_id: `receiver-${receiverId}`,
      pre_balance_micro: receiverPre,
      post_balance_micro: receiverPost,
    },
    amount_micro: amount,
    conservation_check: 'conserved' as const,
    idempotency_key: `tx-${senderId}-${auditId}`,
    timestamp: '2026-02-17T10:00:00Z',
    contract_version: '5.4.0',
  };
});

describe('InterAgentTransactionAudit property tests', () => {
  it('conserved transactions always pass schema validation', () => {
    fc.assert(
      fc.property(conservedTransactionArb, (tx) => {
        return Value.Check(InterAgentTransactionAuditSchema, tx);
      }),
      { numRuns: 100 },
    );
  });

  it('conserved transactions always satisfy sender conservation constraint', () => {
    fc.assert(
      fc.property(conservedTransactionArb, (tx) => {
        return evaluateConstraint(
          tx as unknown as Record<string, unknown>,
          "bigint_eq(bigint_sub(sender.pre_balance_micro, amount_micro), sender.post_balance_micro)",
        );
      }),
      { numRuns: 100 },
    );
  });

  it('conserved transactions always satisfy receiver conservation constraint', () => {
    fc.assert(
      fc.property(conservedTransactionArb, (tx) => {
        return evaluateConstraint(
          tx as unknown as Record<string, unknown>,
          "bigint_eq(bigint_add(receiver.pre_balance_micro, amount_micro), receiver.post_balance_micro)",
        );
      }),
      { numRuns: 100 },
    );
  });

  it('conservation holds: sender.pre - amount == sender.post for all conserved tx', () => {
    fc.assert(
      fc.property(conservedTransactionArb, (tx) => {
        const senderPre = BigInt(tx.sender.pre_balance_micro);
        const senderPost = BigInt(tx.sender.post_balance_micro);
        const amount = BigInt(tx.amount_micro);
        return senderPre - amount === senderPost;
      }),
      { numRuns: 100 },
    );
  });
});
