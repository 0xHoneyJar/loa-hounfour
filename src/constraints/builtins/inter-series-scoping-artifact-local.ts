/**
 * LOCAL helper functions for `InterSeriesScopingArtifactSchema`
 * (FR-G2, v8.7.0).
 *
 * **LOCAL** = inline implementation called from a single schema's
 * cross-field validator path. NOT registered as a DSL evaluator
 * builtin in `EVALUATOR_BUILTINS`. NOT re-exported from any package
 * barrel. Consumers cannot reference these by name from constraint
 * expressions; the DSL surface remains v8.6.0.
 *
 * **Why LOCAL not DSL** (per SDD §4.6 + run-1 SKP-004 mitigation):
 * the cycle-005 cycle pattern reserves `evaluator: 'library'` for
 * generic primitives that cover ≥2 schemas (cf. `chain_validator_prev_hash`,
 * `signer_key_id_matches_derivation`). Promoting a helper to the DSL
 * adds public-API surface (Hyrum's-Law footprint) and bumps the
 * widening discipline of cycle-007. Inline-only keeps the surface
 * tight; promotion gates on consumer-corpus signal warranting the
 * generic primitive.
 *
 * **Promotion gate** (when these become DSL builtins): a second
 * schema-level use site lands AND consumer corpus signals that the
 * primitive's contract is stable (no per-schema parameter
 * proliferation). At that point: (a) move the helper into a generic
 * `<helper-name>.ts` file in this directory; (b) export from the
 * builtins barrel; (c) register in `EVALUATOR_BUILTINS`; (d) update
 * the constraint-file entries to `evaluator: 'library'`. Until then,
 * each LOCAL helper is per-schema with its own unit-test suite.
 *
 * **Test discipline**: each LOCAL helper has dedicated coverage in
 * `tests/constraints/builtins/inter-series-scoping-artifact-local.test.ts`
 * with positive + adversarial cases (≥10 cases per helper).
 *
 * **Cross-schema reuse note**: `arrayFieldDistinct` is imported from
 * `cluster-run-series-local.ts` (PR-A4.1) — its first use site —
 * rather than reimplemented here. Per SDD §4.6, `array_field_distinct`
 * is anticipated to be reused by ISSA-2, SPS-2, RL-1, and RL-12.
 * Promotion to a generic file is gated on consumer-corpus signal;
 * cross-schema imports within the LOCAL helper layer are admissible
 * for shared inline-only primitives.
 *
 * @internal Not part of the public DSL surface.
 * @see SDD §4.6 — LOCAL Helper Functions.
 * @since v8.7.0 — FR-G2 (PR-A4.2).
 */

import { SHA256_HEX_PATTERN } from '../../integrity/sha256-pattern.js';

const SHA256_HEX_REGEX = new RegExp(SHA256_HEX_PATTERN);

/**
 * `merkleProofCompositionWellFormed` — STRUCTURAL well-formedness
 * check on a Merkle proof path. Validates per-step shape only;
 * semantic root verification is consumer-state per ADR-010.
 *
 * Used by ISSA-3. Per-step: each entry MUST be a non-null object
 * with a `position` field equal to `'left'` or `'right'`, and a
 * `sibling_hash` field matching `SHA256_HEX_PATTERN`. The well-
 * formedness check does NOT compose the proof or compare against a
 * root — that is consumer-state per the OQ-1 lock.
 *
 * **Defensive contract**: malformed steps emit per-step issues
 * naming the offending index/field. Non-array input returns
 * `valid: true` with empty issues — the caller's structural tier
 * handles non-array shape rejection. Direct callers bypassing
 * Value.Check thus receive a meaningful well-formedness signal even
 * when the structural shape is wrong, without the helper throwing.
 *
 * **Why STRUCTURAL not SEMANTIC**: composition requires hex-to-byte
 * decoding plus a SHA-256 implementation, both consumer-side
 * concerns per ADR-010. Hounfour ships shape; consumers verify
 * roots. Manifest emission of
 * `INTER_SERIES_MERKLE_ROOT_VERIFICATION_CONTEXT_DEFERRED` is the
 * consumer's signal that root verification has not yet been wired
 * into the validator pipeline.
 *
 * @param proofPath — input value at the `proof_path` field path;
 *   non-array input returns valid:true with empty issues (the
 *   caller's structural tier handles non-array shape rejection).
 * @returns `{ valid, issues }` where issues is a list of per-step
 *   well-formedness violation strings naming the offending index
 *   and field for actionability.
 *
 * @since v8.7.0 — FR-G2 (PR-A4.2).
 */
export function merkleProofCompositionWellFormed(proofPath: unknown): {
  valid: boolean;
  issues: string[];
} {
  if (!Array.isArray(proofPath)) {
    return { valid: true, issues: [] };
  }
  const issues: string[] = [];
  for (let i = 0; i < proofPath.length; i += 1) {
    const step = proofPath[i];
    if (step === null || typeof step !== 'object' || Array.isArray(step)) {
      issues.push(
        `proof_path[${i}] is ${step === null ? 'null' : Array.isArray(step) ? 'array' : typeof step}, not an object — Merkle proof step well-formedness requires a non-null object with position and sibling_hash fields.`,
      );
      continue;
    }
    const stepObj = step as Record<string, unknown>;
    const position = stepObj.position;
    if (position !== 'left' && position !== 'right') {
      issues.push(
        `proof_path[${i}].position is ${typeof position === 'string' ? `"${position}"` : String(position)} — position MUST be exactly "left" or "right" to disambiguate the matching-twins composition trace.`,
      );
    }
    const siblingHash = stepObj.sibling_hash;
    if (typeof siblingHash !== 'string') {
      issues.push(
        `proof_path[${i}].sibling_hash is ${siblingHash === null ? 'null' : typeof siblingHash}, not a string — sibling_hash MUST match the canonical sha256:<64-hex> form.`,
      );
    } else if (!SHA256_HEX_REGEX.test(siblingHash)) {
      issues.push(
        `proof_path[${i}].sibling_hash "${siblingHash}" does not match the canonical sha256:<64-hex> form — Merkle composition operates on the raw 32-byte digest decoded from the hex form.`,
      );
    }
  }
  return { valid: issues.length === 0, issues };
}
