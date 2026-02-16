import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../../../vocabulary/currency.js';

/**
 * Budget scope schema for cost control in routing decisions.
 * Tracks spending limits and actions when limits are exceeded.
 *
 * Note: Marked with x-cross-field-validated for spent vs limit checks.
 */
export const BudgetScopeSchema = Type.Object(
  {
    scope: Type.Union([
      Type.Literal('project'),
      Type.Literal('sprint'),
      Type.Literal('phase'),
      Type.Literal('conversation'),
    ]),
    scope_id: Type.String({ minLength: 1 }),
    limit_micro: MicroUSDUnsigned,
    spent_micro: MicroUSDUnsigned,
    action_on_exceed: Type.Union([
      Type.Literal('block'),
      Type.Literal('warn'),
      Type.Literal('downgrade'),
    ]),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    /** Reserved capacity in basis points (0-10000). Optional — absent means no reservation. */
    reserved_capacity_bps: Type.Optional(Type.Integer({ minimum: 0, maximum: 10000 })),
    /** Linked reservation ID. Present when budget scope has an active reservation. */
    reservation_id: Type.Optional(Type.String({ format: 'uuid' })),
  },
  {
    $id: 'BudgetScope',
    $comment: 'Financial amounts (limit_micro, spent_micro) use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. See vocabulary/currency.ts for arithmetic utilities.',
    additionalProperties: false,
    'x-cross-field-validated': true,
  }
);

export type BudgetScope = Static<typeof BudgetScopeSchema>;
