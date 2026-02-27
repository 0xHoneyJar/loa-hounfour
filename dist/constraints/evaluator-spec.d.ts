/**
 * Evaluator Builtin Specification Registry.
 *
 * Canonical specifications for all 40 evaluator builtins. Each spec includes
 * signature, description, argument types, return type, and executable examples
 * that serve as the cross-language test harness.
 *
 * @see SDD §2.5 — Evaluator Specification (FR-5)
 * @since v5.5.0 (18 builtins), v6.0.0 (23 builtins), v7.0.0 (31 builtins — coordination + governance + bridge iteration 2), v7.4.0 (34 builtins — timestamp comparison), v7.5.0 (36 builtins — temporal governance), v7.6.0 (37 builtins — constraint lifecycle), v7.7.0 (40 builtins — proposal execution + now + model routing)
 */
import { type EvaluatorBuiltin } from './evaluator.js';
/**
 * Argument specification for a builtin function.
 */
export interface ArgumentSpec {
    readonly name: string;
    readonly type: string;
    readonly description: string;
}
/**
 * Executable example for a builtin function.
 * The expression is evaluated against context and must produce expected.
 */
export interface EvaluatorExample {
    readonly description: string;
    readonly context: Record<string, unknown>;
    readonly expression: string;
    readonly expected: unknown;
}
/**
 * Full specification of a single evaluator builtin.
 */
export interface EvaluatorBuiltinSpec {
    readonly name: EvaluatorBuiltin;
    readonly signature: string;
    readonly description: string;
    readonly arguments: readonly ArgumentSpec[];
    readonly return_type: string;
    readonly short_circuit: boolean;
    readonly examples: readonly EvaluatorExample[];
    readonly edge_cases: readonly string[];
}
/**
 * Canonical registry of all 39 evaluator builtin specifications.
 */
export declare const EVALUATOR_BUILTIN_SPECS: ReadonlyMap<EvaluatorBuiltin, EvaluatorBuiltinSpec>;
//# sourceMappingURL=evaluator-spec.d.ts.map