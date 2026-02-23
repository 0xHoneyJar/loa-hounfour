/**
 * Reputation Routing Signal — reputation as resource allocation mechanism.
 *
 * Formalizes the connection between reputation scores and model/task routing
 * decisions. Higher reputation unlocks access to premium resources, creating
 * a meritocratic model economy.
 *
 * In the FAANG framing: Google's PageRank started as a ranking signal and
 * became an economic routing mechanism. Uber's driver rating gates access
 * to premium ride types. Reputation becomes the allocation mechanism for
 * scarce resources.
 *
 * @see DR-S7 — Reputation as routing signal
 * @since v7.6.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { ReputationStateSchema } from './reputation-aggregate.js';

// ---------------------------------------------------------------------------
// Routing Signal Type
// ---------------------------------------------------------------------------

export const RoutingSignalTypeSchema = Type.Union(
  [
    Type.Literal('model_preference'),
    Type.Literal('task_eligibility'),
    Type.Literal('delegation_priority'),
  ],
  {
    $id: 'RoutingSignalType',
    description: 'Type of reputation-based routing signal.',
  },
);

export type RoutingSignalType = Static<typeof RoutingSignalTypeSchema>;

// ---------------------------------------------------------------------------
// Model Preference Entry
// ---------------------------------------------------------------------------

const ModelPreferenceEntrySchema = Type.Object(
  {
    model_id: Type.String({ minLength: 1, description: 'Model alias (e.g., "gpt-4o", "claude-opus").' }),
    min_cohort_score: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Minimum per-model cohort score for this model preference.',
    }),
  },
  { additionalProperties: false },
);

// ---------------------------------------------------------------------------
// Reputation Routing Signal
// ---------------------------------------------------------------------------

/**
 * A reputation-based routing signal for resource allocation.
 *
 * Connects reputation scores to economic decisions:
 * - model_preference: route to specific models based on reputation
 * - task_eligibility: qualify for high-value tasks
 * - delegation_priority: prioritize in delegation decisions
 *
 * @since v7.6.0 — DR-S7
 */
export const ReputationRoutingSignalSchema = Type.Object(
  {
    signal_id: Type.String({ format: 'uuid' }),
    personality_id: Type.String({
      minLength: 1,
      description: 'The personality this routing signal applies to.',
    }),
    signal_type: RoutingSignalTypeSchema,
    qualifying_state: ReputationStateSchema,
    qualifying_score: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Minimum blended score for this routing signal to be active.',
    }),
    model_preferences: Type.Optional(Type.Array(ModelPreferenceEntrySchema, {
      description: 'Per-model minimum cohort scores. Only relevant for model_preference signals.',
    })),
    routing_weight: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Influence weight on allocation decisions (0 = no influence, 1 = full influence).',
    }),
    effective_at: Type.String({ format: 'date-time' }),
    expires_at: Type.Optional(Type.String({
      format: 'date-time',
      description: 'When this signal expires. Null/absent means indefinite.',
    })),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'ReputationRoutingSignal',
    additionalProperties: false,
    description: 'Reputation-based routing signal for meritocratic resource allocation.',
  },
);

export type ReputationRoutingSignal = Static<typeof ReputationRoutingSignalSchema>;
