/**
 * Constraints sub-package barrel.
 *
 * Re-exports cross-language constraint types, evaluator,
 * and DDD vocabulary (state machines, aggregate boundaries, temporal properties).
 *
 * Constraint files serve as the protocol's institutional rules — in the sense
 * of Elinor Ostrom's Institutional Analysis and Development (IAD) framework.
 * Each constraint defines a rule that governs how protocol participants may
 * interact with a schema. The `expression_version` field enables rule evolution
 * without breaking existing participants — Ostrom's "minimal recognition of
 * rights to organize" principle.
 *
 * @see Ostrom, E. (1990). Governing the Commons.
 * @see constraints/GovernanceConfig.constraints.json — governance parameters as institutional rules (v5.3.0)
 */

// Constraint types and evaluator
export { type ConstraintFile, type Constraint, type NativeEnforcement, type ConstraintOrigin, expressionVersionSupported, EXPRESSION_VERSIONS_SUPPORTED } from './types.js';
export { evaluateConstraint, MAX_EXPRESSION_DEPTH, EVALUATOR_BUILTINS, RESERVED_EVALUATOR_NAMES, type EvaluatorBuiltin, type EvaluationContext } from './evaluator.js';
export { EXPRESSION_VERSION, validateExpression } from './grammar.js';
export { evaluateConstraintDetailed, type EvaluationResult } from './detailed-evaluator.js';
export { tokenize, TokenizerError, type Token, type TokenType } from './tokenizer.js';

// Evaluator Builtin Specification Registry (v5.5.0, FR-5)
export {
  EVALUATOR_BUILTIN_SPECS,
  type EvaluatorBuiltinSpec,
  type ArgumentSpec,
  type EvaluatorExample,
} from './evaluator-spec.js';

// Constraint Type System (v6.0.0, FR-3)
export {
  ConstraintTypeSchema,
  ConstraintTypeSignatureSchema,
  CONSTRAINT_TYPES,
  type ConstraintType,
  type ConstraintTypeSignature,
  type ConstraintASTNode,
} from './constraint-types.js';

// Static Type Checker (v6.0.0, FR-3)
export {
  typeCheckConstraintFile,
  type TypeCheckError,
  type TypeCheckWarning,
  type TypeCheckResult,
  type SchemaRegistryEntry,
} from './type-checker.js';

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
