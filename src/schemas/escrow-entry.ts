import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';
import { UUID_V4_PATTERN } from '../vocabulary/patterns.js';
import { STATE_MACHINES, getValidTransitions, isValidTransition as _isValidTransition } from '../vocabulary/state-machines.js';

/**
 * Escrow entry — a bilateral financial holding with state machine lifecycle.
 *
 * Design: Escrow is a separate entity from BillingEntry because escrows can
 * outlive conversations and a single escrow can produce multiple billing entries.
 *
 * @see BB-V4-DEEP-002 — Escrow timeout mechanism (expires_at)
 */
export const EscrowEntrySchema = Type.Object(
  {
    escrow_id: Type.String({ pattern: UUID_V4_PATTERN }),
    payer_id: Type.String({ minLength: 1 }),
    payee_id: Type.String({ minLength: 1 }),
    amount_micro: MicroUSDUnsigned,
    state: Type.Union([
      Type.Literal('held'),
      Type.Literal('released'),
      Type.Literal('disputed'),
      Type.Literal('refunded'),
      Type.Literal('expired'),
    ]),
    held_at: Type.String({ format: 'date-time' }),
    released_at: Type.Optional(Type.String({ format: 'date-time' })),
    expires_at: Type.Optional(Type.String({ format: 'date-time' })),
    dispute_id: Type.Optional(Type.String({ minLength: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'EscrowEntry',
    $comment: 'Financial amounts (amount_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. See vocabulary/currency.ts for arithmetic utilities.',
    description: 'Escrow holding for bilateral agent transactions with state machine lifecycle',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type EscrowEntry = Static<typeof EscrowEntrySchema>;

export const ESCROW_TRANSITIONS: Record<string, readonly string[]> =
  Object.fromEntries(
    STATE_MACHINES.escrow.states.map(s => [s, getValidTransitions('escrow', s)])
  );

export function isValidEscrowTransition(from: string, to: string): boolean {
  return _isValidTransition('escrow', from, to);
}
