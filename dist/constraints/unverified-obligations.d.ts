/**
 * Unverified-Obligations Manifest — declarative report of consumer-side
 * obligations the library cannot evaluate.
 *
 * Per SDD section 5.8, when a constraint file contains rules with
 * `evaluator: 'runtime-deferred'`, the library evaluator skips them during
 * validation but emits them as a manifest so the calling consumer can:
 *
 *   1. Discover that the rule exists.
 *   2. Read the `evaluation_note` describing what to enforce.
 *   3. Acknowledge the obligation in its conformance suite (per the
 *      consumer-side `obligations-acked.yaml` contract).
 *
 * The manifest is the right boundary primitive for the library/runtime split:
 * the library STILL doesn't execute Ed25519 verification, append-only ledger
 * checks, or any other consumer concern — it just *reports the obligation*
 * in machine-readable form so the consumer cannot silently miss it.
 *
 * @see SDD section 5.8 — Unverified-Obligations Manifest Emission Contract
 * @see PRD section 5 NF-1c — Library/runtime boundary
 * @since v8.4.0 (FR-C1)
 */
import type { ConstraintFile } from './types.js';
/**
 * One entry per runtime-deferred rule. The shape is normative across runners
 * — TS / Go / Python / Rust must all emit byte-identical entries for the
 * cross-runner conformance harness to pass.
 *
 * `consumer_acknowledgment_required` is pinned to `true` to keep the wire
 * shape uniform; the literal type prevents accidental opt-out by setting it
 * to `false` at the type level.
 */
export interface UnverifiedObligationEntry {
    /** Stable rule identifier (e.g., `"ORD-1"`, `"ORD-2"`). */
    rule_id: string;
    /** Verbatim rule text from the constraint file (narrative or DSL). */
    rule: string;
    /** Always the literal `'runtime-deferred'` for entries in this manifest. */
    evaluator: 'runtime-deferred';
    /** Human explanation of the consumer obligation. */
    evaluation_note: string;
    /** Always `true` — pinned to keep the wire shape uniform. */
    consumer_acknowledgment_required: true;
}
/**
 * Manifest emitted by the library at validation time when at least one
 * runtime-deferred rule applies to the schema being validated.
 *
 * When NO runtime-deferred rules apply, the manifest field is OMITTED from
 * the validation result entirely (not `null`, not `undefined` via key) — see
 * SDD section 5.8 pass-3-followup. Consumers derive "no obligations" from
 * absence (`'unverified_obligations' in result` or `if (result.unverified_obligations)`).
 */
export interface UnverifiedObligationsManifest {
    /** `$id` of the schema these obligations apply to. */
    schema_id: string;
    /** Protocol contract version the manifest was emitted under (e.g., `"8.4.0"`). */
    contract_version: string;
    /** One entry per runtime-deferred rule found in the schema's constraint file. */
    unverified_rules: UnverifiedObligationEntry[];
    /** ISO 8601 timestamp at which this manifest was emitted. */
    manifest_emitted_at: string;
}
/**
 * Build an `UnverifiedObligationsManifest` from a constraint file by selecting
 * rules tagged `evaluator: 'runtime-deferred'`. Returns `undefined` (NOT an
 * empty manifest, NOT `null`) when no runtime-deferred rules apply, so the
 * caller can omit the field from its result entirely.
 *
 * `evaluation_note` is required by the constraint-rule schema for any
 * runtime-deferred rule (per SDD section 3.6.0); when absent the helper
 * falls back to an empty string so the manifest shape stays well-formed,
 * but downstream linters SHOULD flag this case.
 *
 * @param file - Parsed constraint file (typically loaded from
 *               `constraints/<SchemaName>.constraints.json`).
 * @param emittedAt - Override the manifest timestamp; defaults to the current
 *                    wall-clock ISO 8601. Tests pass a frozen value.
 */
export declare function buildUnverifiedObligationsManifest(file: ConstraintFile, emittedAt?: string): UnverifiedObligationsManifest | undefined;
/**
 * Type guard — returns `true` when a `ValidationResult`-shaped object carries
 * a non-empty `unverified_obligations` manifest. Lets consumers branch on
 * obligation presence without repeating the `'in result'` check.
 */
export declare function hasUnverifiedObligations<T extends {
    unverified_obligations?: UnverifiedObligationsManifest;
}>(result: T): result is T & {
    unverified_obligations: UnverifiedObligationsManifest;
};
//# sourceMappingURL=unverified-obligations.d.ts.map