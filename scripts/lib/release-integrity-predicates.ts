/**
 * Release-integrity manifest predicates — extracted from
 * `scripts/generate-release-integrity.ts` so the truth tables can
 * be pinned by unit tests (PR-B1.0 hygiene).
 *
 * The original predicate shipped with an inverted branch in
 * PR-A3.12 iter-1 (F-001-chain HIGH-consensus) and a redundant
 * sentinel in iter-2 (F-002). The fix landed in PR-A3.12 iter-3
 * but the absence of a unit test was the root cause — a 5-row
 * truth table would have caught the inversion before any reviewer
 * saw it. Encoding the lesson here (Meta release-engineering
 * principle: "every empirical fix becomes a regression test").
 *
 * ## Two predicates, one shared core
 *
 * The manifest gate and the tarball gate encode *different* policies
 * over the same vectors/ tree:
 *
 *   - **`isBuildArtifact`** — paths that are build outputs and must
 *     never be part of the published surface. Used by BOTH the
 *     manifest gate (to exclude from RELEASE-INTEGRITY.json) AND the
 *     tarball gate (to assert they're not in the npm tarball).
 *
 *   - **`isVectorExcluded`** — superset that ALSO excludes tooling
 *     registries (`vectors/_meta/`, per-schema `_meta.json`) and
 *     diagnostic companions (`*.trace.json`). These DO ship in the
 *     tarball (consumers may reference them) but are NOT part of the
 *     fixture corpus the manifest checksums.
 *
 * The two share the build-artifact subset, so a build-output addition
 * lands in both gates by construction (single source of truth, PR-
 * B1.0 iter-3 F-001-fragment-match). The two diverge only on the
 * extra "tooling-not-fixture" rules that the manifest gate uniquely
 * applies.
 *
 * @see scripts/generate-release-integrity.ts — manifest gate caller
 * @see scripts/check-tarball-budget.ts — tarball gate caller
 * @see tests/scripts/release-integrity-predicates.test.ts — truth tables
 */
import { relative, sep } from 'node:path';

/** Normalize an absolute path to a forward-slash-relative path. */
function toRelPosix(absPath: string, root: string): string {
  return relative(root, absPath).split(sep).join('/');
}

/**
 * `true` if `absPath` is a build artifact that must never appear in
 * the published surface (npm tarball OR integrity manifest). Mirrors
 * `scripts/prepack-clean.mjs`'s PATHS_TO_CLEAN list — both must agree
 * on what counts as build-output vs. source contract.
 *
 * Excludes (returns `true`):
 *   - `vectors/runners/rust/target/...` — cargo build cache
 *   - `vectors/runners/go/cross-runner` and `cross-runner.exe` —
 *     compiled Go binary (POSIX + Windows)
 *   - `vectors/runners/python/__pycache__/...` and `.venv/...` —
 *     Python build cache
 *   - `*.pyc` — Python bytecode
 *
 * The predicate is self-sufficient — it does NOT rely on the caller
 * having pre-filtered to a particular file extension.
 */
export const isBuildArtifact = (absPath: string, root: string): boolean => {
  const rel = toRelPosix(absPath, root);
  if (rel.startsWith('vectors/runners/rust/target/')) return true;
  if (rel === 'vectors/runners/go/cross-runner') return true;
  if (rel === 'vectors/runners/go/cross-runner.exe') return true;
  if (/^vectors\/runners\/python\/(__pycache__|\.venv)\//.test(rel)) return true;
  if (rel.endsWith('.pyc')) return true;
  return false;
};

/**
 * `true` if `absPath` should be EXCLUDED from the vectors checksum
 * group in `RELEASE-INTEGRITY.json`. Operates on a forward-slash-
 * normalized path *relative to the repo root* so the predicate
 * stays semantically anchored to repo-relative structure rather
 * than absolute substring matches.
 *
 * Superset of `isBuildArtifact`: adds tooling-not-fixture rules
 * that the manifest gate applies but the tarball gate does NOT
 * (because tooling registries DO legitimately ship in the tarball
 * for consumer reference).
 *
 * Excludes (returns `true`):
 *   - `*.trace.json` — per-fixture diagnostic companions, not test inputs
 *   - `vectors/_meta/...` — top-level tooling registries
 *     (constraint-level-invalids.json, regex-subset.md). Framework-
 *     internal; not part of the fixture corpus consumers verify.
 *   - `vectors/<Schema>/_meta.json` (depth-2 only) — per-schema
 *     metadata files (e.g., `cycle-005-vector-budget`). Tooling,
 *     not fixtures.
 *   - Anything `isBuildArtifact` excludes (cargo target/, Go binary,
 *     Python cache, .pyc).
 *
 * Includes (returns `false`):
 *   - `vectors/<Schema>/v8.6.0/{valid,invalid,boundary,
 *     invalid-cross-field}/*.json` — the actual fixture corpus
 *   - Anything not matching the exclusion patterns above
 */
export const isVectorExcluded = (absPath: string, root: string): boolean => {
  const rel = toRelPosix(absPath, root);
  if (rel.endsWith('.trace.json')) return true;
  if (rel.startsWith('vectors/_meta/')) return true;
  // Depth-2 anchor: matches `vectors/<Schema>/_meta.json` exactly.
  // A deeper `_meta.json` (e.g., `vectors/<Schema>/v8.6.0/_meta.json`
  // or `vectors/<Schema>/v8.7.0/_meta.json` if a future cycle adds
  // per-version metadata) is INTENTIONALLY left as a fixture by
  // this predicate — we do not silently swallow content at deeper
  // paths. If a future cycle wants depth-3+ `_meta.json` excluded,
  // this regex needs to be broadened explicitly so the policy
  // change is reviewed.
  if (/^vectors\/[^/]+\/_meta\.json$/.test(rel)) return true;
  // Build artifacts are always excluded from the manifest (and
  // also never reach the tarball post-prepack-clean; the two gates
  // share this rule via the imported predicate).
  if (isBuildArtifact(absPath, root)) return true;
  return false;
};
