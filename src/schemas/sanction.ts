import { Type, type Static } from '@sinclair/typebox';
import { SANCTION_SEVERITY_LEVELS } from '../vocabulary/sanctions.js';
import { VIOLATION_TYPES } from '../vocabulary/sanctions.js';
import { SanctionSeveritySchema } from '../vocabulary/sanction-severity.js';

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
    escalation_rule_applied: Type.Optional(Type.String({ minLength: 1 })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    // v5.1.0 — Graduated sanction fields
    severity_level: Type.Optional(SanctionSeveritySchema),
    duration_seconds: Type.Optional(Type.Integer({ minimum: 0, description: 'Duration in seconds (0 = indefinite until review)' })),
    appeal_dispute_id: Type.Optional(Type.String({ format: 'uuid', description: 'UUID of the linked dispute record if appeal was filed' })),
    escalated_from: Type.Optional(Type.String({ minLength: 1, description: 'sanction_id of the predecessor sanction this was escalated from' })),
  },
  {
    $id: 'Sanction',
    description: 'Sanction imposed on an agent for policy violations',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type Sanction = Static<typeof SanctionSchema>;
