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
export { expressionVersionSupported, EXPRESSION_VERSIONS_SUPPORTED } from './types.js';
export { evaluateConstraint, MAX_EXPRESSION_DEPTH, EVALUATOR_BUILTINS, RESERVED_EVALUATOR_NAMES } from './evaluator.js';
export { EXPRESSION_VERSION, validateExpression } from './grammar.js';
export { evaluateConstraintDetailed } from './detailed-evaluator.js';
export { tokenize, TokenizerError } from './tokenizer.js';
// Evaluator Builtin Specification Registry (v5.5.0, FR-5)
export { EVALUATOR_BUILTIN_SPECS, } from './evaluator-spec.js';
// Constraint Type System (v6.0.0, FR-3)
export { ConstraintTypeSchema, ConstraintTypeSignatureSchema, CONSTRAINT_TYPES, } from './constraint-types.js';
// Static Type Checker (v6.0.0, FR-3)
export { typeCheckConstraintFile, } from './type-checker.js';
// Vocabulary — State Machines
export { STATE_MACHINES, getValidTransitions, isTerminalState, isValidTransition as isValidStateMachineTransition, } from '../vocabulary/state-machines.js';
// Vocabulary — Aggregate Boundaries
export { AGGREGATE_BOUNDARIES, } from '../vocabulary/aggregate-boundaries.js';
// Vocabulary — Temporal Properties
export { TEMPORAL_PROPERTIES, } from '../vocabulary/temporal-properties.js';
//# sourceMappingURL=index.js.map