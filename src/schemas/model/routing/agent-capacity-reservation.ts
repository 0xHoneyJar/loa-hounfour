/**
 * AgentCapacityReservation schema — enshrined agent-owned inference capacity.
 *
 * Guarantees that an agent with earned trust (via conformance level) has a
 * minimum fraction of budget capacity reserved and protected from exhaustion.
 * The protocol enforces this as an inviolable floor on the agent's budget.
 *
 * @see SDD §3.8 — AgentCapacityReservation
 * @see Issue #9 — Enshrined agent-owned inference capacity
 */
import { Type, type Static } from '@sinclair/typebox';
import { ConformanceLevelSchema } from '../conformance-level.js';
import { ReservationStateSchema } from '../../../vocabulary/reservation-state.js';

export const AgentCapacityReservationSchema = Type.Object(
  {
    reservation_id: Type.String({ format: 'uuid' }),
    agent_id: Type.String({ minLength: 1 }),
    conformance_level: ConformanceLevelSchema,
    reserved_capacity_bps: Type.Integer({
      minimum: 0,
      maximum: 10000,
      description: 'Reserved capacity in basis points (0-10000). 10000 = 100%.',
    }),
    state: ReservationStateSchema,
    effective_from: Type.String({ format: 'date-time' }),
    effective_until: Type.Optional(Type.String({ format: 'date-time' })),
    budget_scope_id: Type.String({ minLength: 1 }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  {
    $id: 'AgentCapacityReservation',
    description: 'Capacity reservation that guarantees an agent a minimum fraction of budget.',
    additionalProperties: false,
    'x-cross-field-validated': true,
  },
);

export type AgentCapacityReservation = Static<typeof AgentCapacityReservationSchema>;
