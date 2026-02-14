import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';

const UUID_V4_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

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
    dispute_id: Type.Optional(Type.String({ minLength: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'EscrowEntry', description: 'Escrow holding for bilateral agent transactions with state machine lifecycle', additionalProperties: false },
);

export type EscrowEntry = Static<typeof EscrowEntrySchema>;

export const ESCROW_TRANSITIONS: Record<string, readonly string[]> = {
  held: ['released', 'disputed', 'expired'],
  released: [],  // terminal
  disputed: ['released', 'refunded'],
  refunded: [],  // terminal
  expired: [],   // terminal
};

export function isValidEscrowTransition(from: string, to: string): boolean {
  const valid = ESCROW_TRANSITIONS[from];
  return valid != null && valid.includes(to);
}
