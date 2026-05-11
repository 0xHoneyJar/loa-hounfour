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
 * timestamp string fields via lexicographic ordering on JCS-canonical-
 * form strings.
 *
 * Used by SPS-4 (`accounts[*].stable_until ≥ envelope.ts`).
 *
 * **JCS-canonical-form precondition** (per SDD §2.0.1, two-part):
 * lexicographic comparison on ISO 8601 strings is monotonic ONLY when
 * both operands are in JCS-canonical form — UTC, Z-suffix, **fixed
 * fractional-precision**, NFC-normalized. The helper enforces both
 * parts in order:
 *
 *   1. **Pattern conformance**: both operands MUST match
 *      `ISO8601_UTC_PATTERN`. The shared pattern admits optional 1-9
 *      digit fractional seconds; pattern conformance alone is NOT
 *      sufficient for lexicographic monotonicity.
 *   2. **Fixed fractional-precision**: both operands MUST share the
 *      same fractional-second precision representation. Concretely,
 *      either both omit the fractional part OR both include the same
 *      digit count. Mixing precisions inverts lexicographic ordering
 *      because `'Z'` (0x5A) sorts after `'.'` (0x2E) — the bug class
 *      caught by iter-1 bridge review (PR-A4.3 iter-1 MEDIUM, three-
 *      model consensus).
 *
 * If either precondition fails, the helper returns a tagged
 * precondition violation rather than a silent miscompare. This closes
 * the run-2 IMP-006 lexicographic-monotonicity gap.
 *
 * **Why this matters in adversarial scenarios**: a payload with
 * `ts = "2026-05-09T00:00:00Z"` and
 * `stable_until = "2026-05-09T00:00:00.5Z"` represents stable_until
 * one half-second AFTER ts. Naive lexicographic comparison would
 * report stable_until < ts (because `.` < `Z`), inverting the
 * semantic ordering and producing a silent SPS-4 false-positive
 * rejection. The fixed-fractional-precision precondition rejects
 * the pair as a precondition violation, surfacing the issue
 * rather than silently miscomparing.
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
 * @param laterFieldName — optional label for the later operand in
 *   error messages; defaults to 'stable_until' (the SPS-4 use site).
 *   PR-A4.4 callers (RL-7 / RL-9 / RL-10) pass 'revoked_at' /
 *   'valid_from' / 'valid_until' / 'issued_at' as appropriate so
 *   the error reason names the actual fields rather than the SPS-4
 *   defaults.
 * @param earlierFieldName — optional label for the earlier operand;
 *   defaults to 'ts'.
 * @returns `{ valid, reason }`; `reason` is set only when valid is
 *   false, naming the offending values for actionability.
 *
 * @since v8.7.0 — FR-G3 (PR-A4.3); field-name params added PR-A4.4
 *   iter-1 LOW mitigation.
 */
export function iso8601GeField(
  laterField: unknown,
  earlierField: unknown,
  laterFieldName: string = 'stable_until',
  earlierFieldName: string = 'ts',
): { valid: boolean; reason?: string } {
  if (typeof laterField !== 'string') {
    return {
      valid: false,
      reason: `${laterFieldName} precondition failed — value is ${laterField === null ? 'null' : typeof laterField}, not a string. Structural tier admits only ISO 8601 UTC strings.`,
    };
  }
  if (typeof earlierField !== 'string') {
    return {
      valid: false,
      reason: `${earlierFieldName} precondition failed — value is ${earlierField === null ? 'null' : typeof earlierField}, not a string. Structural tier admits only ISO 8601 UTC strings.`,
    };
  }
  if (!ISO8601_UTC_REGEX.test(laterField)) {
    return {
      valid: false,
      reason: `${laterFieldName} "${laterField}" is not JCS-canonical ISO 8601 UTC — lexicographic at-or-after comparison requires both operands to match ISO8601_UTC_PATTERN for monotonicity per SDD §2.0.1.`,
    };
  }
  if (!ISO8601_UTC_REGEX.test(earlierField)) {
    return {
      valid: false,
      reason: `${earlierFieldName} "${earlierField}" is not JCS-canonical ISO 8601 UTC — lexicographic at-or-after comparison requires both operands to match ISO8601_UTC_PATTERN for monotonicity per SDD §2.0.1.`,
    };
  }
  // Fixed-fractional-precision precondition (iter-1 MEDIUM mitigation):
  // pattern conformance is necessary but NOT sufficient. The shared
  // ISO8601_UTC_PATTERN admits optional fractional seconds with 1-9
  // digits; "2026-05-09T00:00:00Z" and "2026-05-09T00:00:00.5Z" both
  // match. Lexicographic ordering on these strings is non-monotonic
  // because '.' (0x2E) < 'Z' (0x5A) — the bare-second form sorts AFTER
  // the fractional-second form for the same instant. Reject mixed
  // precisions as a precondition violation.
  const laterHasFrac = laterField.includes('.');
  const earlierHasFrac = earlierField.includes('.');
  if (laterHasFrac !== earlierHasFrac) {
    return {
      valid: false,
      reason: `JCS-canonical-form precondition failed — fractional-precision mismatch. ${laterFieldName} "${laterField}" ${laterHasFrac ? 'includes' : 'omits'} fractional seconds; ${earlierFieldName} "${earlierField}" ${earlierHasFrac ? 'includes' : 'omits'} fractional seconds. Lexicographic at-or-after comparison requires identical fractional-precision representation per SDD §2.0.1 (fixed precision); producers MUST emit consistent precision across both fields.`,
    };
  }
  if (laterHasFrac && earlierHasFrac) {
    // Both have a fractional component; compare digit-count
    // representations. iter-3 LOW mitigation: previously the length
    // arithmetic ran unconditionally and computed length+1 on
    // no-fractional inputs because lastIndexOf returns -1, which was
    // dead-code-path defensively but bad form. Guarding the
    // computation inside the both-have-frac branch removes the
    // ambiguity.
    const laterFracLen = laterField.length - laterField.lastIndexOf('.');
    const earlierFracLen = earlierField.length - earlierField.lastIndexOf('.');
    if (laterFracLen !== earlierFracLen) {
      return {
        valid: false,
        reason: `JCS-canonical-form precondition failed — fractional-digit-count mismatch. ${laterFieldName} "${laterField}" has a different fractional-digit count than ${earlierFieldName} "${earlierField}". Lexicographic at-or-after comparison requires identical digit-count representation per SDD §2.0.1 (fixed precision); producers MUST emit consistent digit-count across both fields.`,
      };
    }
  }
  if (laterField < earlierField) {
    return {
      valid: false,
      reason: `${laterFieldName} "${laterField}" is before ${earlierFieldName} "${earlierField}" — the later operand precedes the earlier, violating the at-or-after ordering invariant.`,
    };
  }
  return { valid: true };
}
