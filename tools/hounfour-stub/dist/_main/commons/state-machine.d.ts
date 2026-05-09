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
import { type Static } from '@sinclair/typebox';
/**
 * A single state in a governed resource's lifecycle.
 */
export declare const StateSchema: import("@sinclair/typebox").TObject<{
    name: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    entry_conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    exit_conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type State = Static<typeof StateSchema>;
/**
 * A transition between two states in a governed resource's lifecycle.
 */
export declare const TransitionSchema: import("@sinclair/typebox").TObject<{
    from: import("@sinclair/typebox").TString;
    to: import("@sinclair/typebox").TString;
    event: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    guard: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
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
export declare const StateMachineConfigSchema: import("@sinclair/typebox").TObject<{
    states: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        entry_conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        exit_conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    transitions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        from: import("@sinclair/typebox").TString;
        to: import("@sinclair/typebox").TString;
        event: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        guard: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    initial_state: import("@sinclair/typebox").TString;
    terminal_states: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type StateMachineConfig = Static<typeof StateMachineConfigSchema>;
//# sourceMappingURL=state-machine.d.ts.map