import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';

const UUID_V4_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

export const StakePositionSchema = Type.Object(
  {
    stake_id: Type.String({ pattern: UUID_V4_PATTERN }),
    staker_id: Type.String({ minLength: 1 }),
    target_id: Type.String({ minLength: 1 }),
    amount_micro: MicroUSDUnsigned,
    stake_type: Type.Union([
      Type.Literal('conviction'),
      Type.Literal('delegation'),
      Type.Literal('validation'),
    ]),
    vesting: Type.Object({
      schedule: Type.Union([
        Type.Literal('immediate'),
        Type.Literal('performance_gated'),
        Type.Literal('time_gated'),
      ]),
      vested_micro: MicroUSDUnsigned,
      remaining_micro: MicroUSDUnsigned,
    }),
    staked_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'StakePosition', additionalProperties: false, 'x-experimental': true },
);

export type StakePosition = Static<typeof StakePositionSchema>;
