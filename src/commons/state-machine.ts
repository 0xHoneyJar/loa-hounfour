/**
 * State, Transition, and StateMachineConfig schemas for governed resources.
 *
 * StateMachineConfig is a schema-level declaration that can be validated and
 * serialized. It complements the existing StateMachineDefinition interface
 * in vocabulary/state-machines.ts with constraint DSL guards.
 *
 * @see SDD §4.4 — StateMachine (FR-1.4)
 * @since v8.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * A single state in a governed resource's lifecycle.
 */
export const StateSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 100 }),
    description: Type.Optional(Type.String({ maxLength: 500 })),
    entry_conditions: Type.Optional(
      Type.Array(
        Type.String({
          description: 'Constraint DSL expressions evaluated on entering this state.',
        }),
      ),
    ),
    exit_conditions: Type.Optional(
      Type.Array(
        Type.String({
          description: 'Constraint DSL expressions evaluated on leaving this state.',
        }),
      ),
    ),
  },
  {
    $id: 'State',
    additionalProperties: false,
  },
);

export type State = Static<typeof StateSchema>;

/**
 * A transition between two states in a governed resource's lifecycle.
 */
export const TransitionSchema = Type.Object(
  {
    from: Type.String({ minLength: 1 }),
    to: Type.String({ minLength: 1 }),
    event: Type.Optional(
      Type.String({
        pattern: '^[a-z]+\\.[a-z_]+\\.[a-z_]+$',
        description: 'Event that triggers this transition.',
      }),
    ),
    guard: Type.Optional(
      Type.String({
        description: 'Constraint DSL expression that must be true for transition to fire.',
      }),
    ),
  },
  {
    $id: 'Transition',
    additionalProperties: false,
  },
);

export type Transition = Static<typeof TransitionSchema>;

/**
 * State machine configuration for a governed resource.
 *
 * Complements the existing StateMachineDefinition interface in
 * vocabulary/state-machines.ts with schema-level validation and
 * constraint DSL guards.
 *
 * Naming: StateMachineConfig (not StateMachine) to avoid collision
 * with the existing interface.
 */
export const StateMachineConfigSchema = Type.Object(
  {
    states: Type.Array(StateSchema, { minItems: 1 }),
    transitions: Type.Array(TransitionSchema),
    initial_state: Type.String({ minLength: 1 }),
    terminal_states: Type.Array(Type.String({ minLength: 1 }), {
      description: 'States from which no transitions are possible.',
    }),
  },
  {
    $id: 'StateMachineConfig',
    additionalProperties: false,
    description:
      'State machine configuration for a governed resource. '
      + 'Complements the existing StateMachineDefinition interface in vocabulary/state-machines.ts '
      + 'with schema-level validation and constraint DSL guards.',
  },
);

export type StateMachineConfig = Static<typeof StateMachineConfigSchema>;
