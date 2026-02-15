/**
 * Constraints sub-package barrel.
 *
 * Re-exports cross-language constraint types, evaluator,
 * and DDD vocabulary (state machines, aggregate boundaries, temporal properties).
 */

// Constraint types and evaluator
export { type ConstraintFile, type Constraint, expressionVersionSupported, EXPRESSION_VERSIONS_SUPPORTED } from './types.js';
export { evaluateConstraint, MAX_EXPRESSION_DEPTH } from './evaluator.js';
export { EXPRESSION_VERSION, validateExpression } from './grammar.js';
export { evaluateConstraintDetailed, type EvaluationResult } from './detailed-evaluator.js';
export { tokenize, TokenizerError, type Token, type TokenType } from './tokenizer.js';

// Vocabulary — State Machines
export {
  STATE_MACHINES,
  getValidTransitions,
  isTerminalState,
  isValidTransition as isValidStateMachineTransition,
  type StateMachineDefinition,
  type StateMachineTransition,
} from '../vocabulary/state-machines.js';

// Vocabulary — Aggregate Boundaries
export {
  AGGREGATE_BOUNDARIES,
  type AggregateBoundary,
  type ConsistencyModel,
} from '../vocabulary/aggregate-boundaries.js';

// Vocabulary — Temporal Properties
export {
  TEMPORAL_PROPERTIES,
  type TemporalProperty,
  type PropertyType,
} from '../vocabulary/temporal-properties.js';
