import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';
import { UUID_V4_PATTERN } from '../vocabulary/patterns.js';

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
    }, { additionalProperties: false }),
    staked_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  { $id: 'StakePosition', description: 'Staked position representing conviction, delegation, or validation commitment', additionalProperties: false, 'x-experimental': true, 'x-cross-field-validated': true },
);

export type StakePosition = Static<typeof StakePositionSchema>;
