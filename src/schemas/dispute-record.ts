import { Type, type Static } from '@sinclair/typebox';

export const DisputeRecordSchema = Type.Object(
  {
    dispute_id: Type.String({ minLength: 1 }),
    filed_by: Type.String({ minLength: 1 }),
    filed_against: Type.String({ minLength: 1 }),
    dispute_type: Type.Union([
      Type.Literal('quality'),
      Type.Literal('safety'),
      Type.Literal('billing'),
      Type.Literal('ownership'),
      Type.Literal('personality'),
    ]),
    evidence: Type.Array(
      Type.Object({
        event_id: Type.String({ minLength: 1 }),
        description: Type.String({ minLength: 1 }),
      }, { additionalProperties: false }),
      { minItems: 1 },
    ),
    filed_at: Type.String({ format: 'date-time' }),
    resolution: Type.Optional(
      Type.Object({
        outcome: Type.Union([
          Type.Literal('upheld'),
          Type.Literal('dismissed'),
          Type.Literal('compromised'),
        ]),
        resolved_at: Type.String({ format: 'date-time' }),
        sanction_id: Type.Optional(Type.String({ minLength: 1 })),
        credit_note_id: Type.Optional(Type.String({ minLength: 1 })),
      }, { additionalProperties: false }),
    ),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'DisputeRecord',
    description: 'Dispute filed against an agent or outcome with evidence and resolution tracking',
    additionalProperties: false,
  },
);

export type DisputeRecord = Static<typeof DisputeRecordSchema>;
