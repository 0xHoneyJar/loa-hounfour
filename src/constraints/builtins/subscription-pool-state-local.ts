/**
 * LOCAL helper functions for `SubscriptionPoolStateSchema`
 * (FR-G3, v8.7.0).
 *
 * **LOCAL** = inline implementation called from a single schema's
 * cross-field validator path. NOT registered as a DSL evaluator
 * builtin in `EVALUATOR_BUILTINS`. NOT re-exported from any package
 * barrel. Consumers cannot reference these by name from constraint
 * expressions; the DSL surface remains v8.6.0.
 *
 * **Why LOCAL not DSL** (per SDD §4.6 + run-1 SKP-004 mitigation):
 * the cycle-005 cycle pattern reserves `evaluator: 'library'` for
 * generic primitives that cover ≥2 schemas. Promoting a helper to
 * the DSL adds public-API surface (Hyrum's-Law footprint). Inline-
 * only keeps the surface tight; promotion gates on consumer-corpus
 * signal warranting the generic primitive.
 *
 * **Promotion gate** (when these become DSL builtins): a second
 * schema-level use site lands AND consumer corpus signals contract
 * stability. SDD §4.6 notes `iso8601_ge_field` is also planned for
 * RL-7 / RL-9 / RL-10 in PR-A4.4 (FR-G4); promotion gate may be hit
 * sooner than `string_micro_usd_le` (currently a single use site).
 *
 * **Test discipline**: dedicated coverage in
 * `tests/constraints/subscription-pool-state.constraints.test.ts`
 * with positive + adversarial cases (≥10 cases per helper).
 *
 * **Cross-schema reuse**: `arrayFieldDistinct` is imported from
 * `cluster-run-series-local.ts` (PR-A4.1) for SPS-2. Third use site
 * after CRS-4 and ISSA-2; the SDD §4.6 promotion threshold (fifth
 * site) is hit when RL-1 + RL-12 land in PR-A4.4.
 *
 * @internal Not part of the public DSL surface.
 * @see SDD §4.6 — LOCAL Helper Functions.
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */

import { ISO8601_UTC_PATTERN } from '../../utilities/iso8601-utc-pattern.js';

const ISO8601_UTC_REGEX = new RegExp(ISO8601_UTC_PATTERN);
const MICRO_USD_REGEX = /^[0-9]+$/;

/**
 * `stringMicroUsdLe` — bigint-safe ≤ comparison between two
 * `^[0-9]+$` string-encoded micro-USD values.
 *
 * Used by SPS-1 (`accounts[*].consumed_units ≤
 * accounts[*].allocated_units`). The `^[0-9]+$` structural-tier
 * pattern is the precondition; the helper uses `BigInt` to avoid
 * floating-point rounding on values that exceed
 * `Number.MAX_SAFE_INTEGER` (2^53 − 1 ≈ 9.007e15). A 10^50-digit
 * fixture exercises this directly.
 *
 * **Defensive contract**: non-string inputs OR strings that do not
 * match the `^[0-9]+$` pattern return a tagged precondition
 * violation rather than throwing. Under the standard `validate(...)`
 * pipeline this defensive path is unreachable — Value.Check rejects
 * non-conforming `allocated_units` / `consumed_units` first.
 *
 * **Bigint construction**: `BigInt('<digits>')` is the documented
 * safe path. The regex check before construction guards against
 * `BigInt('')` (throws) and `BigInt('0x..')` (succeeds-but-wrong).
 * The `^[0-9]+$` pattern admits leading zeros (e.g. `"007"`) which
 * `BigInt` accepts as `7n` — that matches the CLAUDE.md financial-
 * value convention's permissive accept / strict emit discipline.
 *
 * @param consumed — `^[0-9]+$` string; the smaller side per SPS-1.
 * @param allocated — `^[0-9]+$` string; the larger-or-equal side.
 * @returns `{ valid, reason }`; `reason` is set only when valid is
 *   false, naming the offending values for actionability.
 *
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */
export function stringMicroUsdLe(
  consumed: unknown,
  allocated: unknown,
): { valid: boolean; reason?: string } {
  if (typeof consumed !== 'string') {
    return {
      valid: false,
      reason: `consumed_units precondition failed — value is ${consumed === null ? 'null' : typeof consumed}, not a string. Structural tier admits only ^[0-9]+$ strings.`,
    };
  }
  if (typeof allocated !== 'string') {
    return {
      valid: false,
      reason: `allocated_units precondition failed — value is ${allocated === null ? 'null' : typeof allocated}, not a string. Structural tier admits only ^[0-9]+$ strings.`,
    };
  }
  if (!MICRO_USD_REGEX.test(consumed)) {
    return {
      valid: false,
      reason: `consumed_units "${consumed}" does not match the ^[0-9]+$ micro-USD pattern; bigint-safe comparison requires the structural tier to have admitted this value first.`,
    };
  }
  if (!MICRO_USD_REGEX.test(allocated)) {
    return {
      valid: false,
      reason: `allocated_units "${allocated}" does not match the ^[0-9]+$ micro-USD pattern; bigint-safe comparison requires the structural tier to have admitted this value first.`,
    };
  }
  const consumedBig = BigInt(consumed);
  const allocatedBig = BigInt(allocated);
  if (consumedBig > allocatedBig) {
    return {
      valid: false,
      reason: `consumed_units "${consumed}" exceeds allocated_units "${allocated}" — per-account pool capacity is overdrawn.`,
    };
  }
  return { valid: true };
}

/**
 * `iso8601GeField` — at-or-after comparison between two ISO 8601 UTC
 * timestamp string fields via lexicographic ordering.
 *
 * Used by SPS-4 (`accounts[*].stable_until ≥ envelope.ts`).
 *
 * **JCS-canonical-form precondition** (per SDD §2.0.1): lexicographic
 * comparison on ISO 8601 strings is monotonic ONLY when both
 * operands are in JCS-canonical form — UTC, Z-suffix, fixed-precision,
 * NFC-normalized. The helper re-checks the TypeBox `ISO8601_UTC_PATTERN`
 * on both operands before comparison; if either fails, the helper
 * returns a tagged precondition violation rather than a silent
 * miscompare. This closes the run-2 IMP-006 lexicographic-monotonicity
 * gap.
 *
 * **Defensive contract**: non-string inputs OR strings that do not
 * match the pattern return a tagged precondition violation rather
 * than throwing. Under the standard `validate(...)` pipeline this
 * defensive path is unreachable — Value.Check rejects non-conforming
 * timestamps first.
 *
 * **Why lexicographic vs Date parsing**: cross-runner byte-identity
 * concerns dominate at the FR-A2 cross-language harness. Lexicographic
 * comparison on JCS-canonicalized strings is deterministic across
 * Python / Go / Rust / TS without any per-runtime calendar library
 * disagreement. The precondition is the load-bearing invariant.
 *
 * @param laterField — value of the "at-or-after" operand (e.g.
 *   `accounts[*].stable_until`).
 * @param earlierField — value of the reference operand (e.g.
 *   envelope `ts`).
 * @returns `{ valid, reason }`; `reason` is set only when valid is
 *   false, naming the offending values for actionability.
 *
 * @since v8.7.0 — FR-G3 (PR-A4.3).
 */
export function iso8601GeField(
  laterField: unknown,
  earlierField: unknown,
): { valid: boolean; reason?: string } {
  if (typeof laterField !== 'string') {
    return {
      valid: false,
      reason: `stable_until precondition failed — value is ${laterField === null ? 'null' : typeof laterField}, not a string. Structural tier admits only ISO 8601 UTC strings.`,
    };
  }
  if (typeof earlierField !== 'string') {
    return {
      valid: false,
      reason: `ts precondition failed — value is ${earlierField === null ? 'null' : typeof earlierField}, not a string. Structural tier admits only ISO 8601 UTC strings.`,
    };
  }
  if (!ISO8601_UTC_REGEX.test(laterField)) {
    return {
      valid: false,
      reason: `stable_until "${laterField}" is not JCS-canonical ISO 8601 UTC — lexicographic at-or-after comparison requires both operands to match ISO8601_UTC_PATTERN for monotonicity per SDD §2.0.1.`,
    };
  }
  if (!ISO8601_UTC_REGEX.test(earlierField)) {
    return {
      valid: false,
      reason: `ts "${earlierField}" is not JCS-canonical ISO 8601 UTC — lexicographic at-or-after comparison requires both operands to match ISO8601_UTC_PATTERN for monotonicity per SDD §2.0.1.`,
    };
  }
  if (laterField < earlierField) {
    return {
      valid: false,
      reason: `stable_until "${laterField}" is before ts "${earlierField}" — per-account stability window precedes the snapshot timestamp, which violates the SPS-4 ordering invariant.`,
    };
  }
  return { valid: true };
}
