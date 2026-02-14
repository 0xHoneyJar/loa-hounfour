import { Type, type Static } from '@sinclair/typebox';
import { SANCTION_SEVERITY_LEVELS } from '../vocabulary/sanctions.js';
import { VIOLATION_TYPES } from '../vocabulary/sanctions.js';

export const SanctionSchema = Type.Object(
  {
    sanction_id: Type.String({ minLength: 1 }),
    agent_id: Type.String({ minLength: 1 }),
    severity: Type.Union(
      SANCTION_SEVERITY_LEVELS.map((s) => Type.Literal(s)),
    ),
    trigger: Type.Object({
      violation_type: Type.Union(
        VIOLATION_TYPES.map((v) => Type.Literal(v)),
      ),
      occurrence_count: Type.Integer({ minimum: 1 }),
      evidence_event_ids: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    }),
    imposed_by: Type.Union([
      Type.Literal('automatic'),
      Type.Literal('moderator'),
      Type.Literal('governance_vote'),
    ]),
    imposed_at: Type.String({ format: 'date-time' }),
    appeal_available: Type.Boolean(),
    expires_at: Type.Optional(Type.String({ format: 'date-time' })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'Sanction',
    additionalProperties: false,
  },
);

export type Sanction = Static<typeof SanctionSchema>;
