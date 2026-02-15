import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

export const ContributionRecordSchema = Type.Object(
  {
    contribution_id: Type.String({ minLength: 1 }),
    agent_id: Type.String({ minLength: 1 }),
    contribution_type: Type.Union([
      Type.Literal('curation'),
      Type.Literal('training'),
      Type.Literal('validation'),
      Type.Literal('moderation'),
      Type.Literal('infrastructure'),
      Type.Literal('capital'),
    ]),
    value_micro: MicroUSD,
    assessed_by: Type.Union([
      Type.Literal('self'),
      Type.Literal('peer'),
      Type.Literal('algorithmic'),
      Type.Literal('governance_vote'),
    ]),
    assessed_at: Type.String({ format: 'date-time' }),
    evidence_event_ids: Type.Optional(
      Type.Array(Type.String({ minLength: 1 })),
    ),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'ContributionRecord',
    description: 'Record of an agent contribution to the commons or ecosystem',
    additionalProperties: false,
  },
);

export type ContributionRecord = Static<typeof ContributionRecordSchema>;
