/**
 * Release-integrity manifest predicates — extracted from
 * `scripts/generate-release-integrity.ts` so the truth table can be
 * pinned by unit tests (PR-B1.0 hygiene).
 *
 * The original predicate shipped with an inverted branch in
 * PR-A3.12 iter-1 (F-001-chain HIGH-consensus) and a redundant
 * sentinel in iter-2 (F-002). The fix landed in PR-A3.12 iter-3
 * but the absence of a unit test was the root cause — a 5-row
 * truth table would have caught the inversion before any reviewer
 * saw it. Encoding the lesson here (Meta release-engineering
 * principle: "every empirical fix becomes a regression test").
 *
 * @see scripts/generate-release-integrity.ts — sole consumer
 * @see tests/scripts/release-integrity-predicates.test.ts — truth table
 */
import { relative, sep } from 'node:path';

/**
 * `true` if `absPath` should be EXCLUDED from the vectors checksum
 * group in `RELEASE-INTEGRITY.json`. Operates on a forward-slash-
 * normalized path *relative to the repo root* so the predicate
 * stays semantically anchored to repo-relative structure rather
 * than absolute substring matches.
 *
 * Excludes (returns `true`):
 *   - `*.trace.json` — per-fixture diagnostic companions, not test inputs
 *   - `vectors/_meta/...` — top-level tooling registries
 *     (constraint-level-invalids.json, regex-subset.md). Framework-
 *     internal; not part of the fixture corpus consumers verify.
 *   - `vectors/<Schema>/_meta.json` (depth-2 only) — per-schema
 *     metadata files (e.g., `cycle-005-vector-budget`). Tooling,
 *     not fixtures.
 *   - `vectors/runners/rust/target/...` — cargo build cache. Always
 *     gitignored locally; the v8.6.0 published manifest leaked 146
 *     of these because the predicate didn't handle them at the
 *     manifest-generation layer (PR-A3.13 prepack hook fires only
 *     at `npm pack` time, AFTER the manifest is generated).
 *   - `vectors/runners/go/cross-runner` and `vectors/runners/go/
 *     cross-runner.exe` — compiled Go binaries. Gitignored.
 *   - `vectors/runners/python/__pycache__/...` — Python bytecode
 *     cache. Gitignored.
 *
 * Includes (returns `false`):
 *   - `vectors/<Schema>/v8.6.0/{valid,invalid,boundary,
 *     invalid-cross-field}/*.json` — the actual fixture corpus
 *   - `vectors/runners/<lang>/{src,cmd,...}/*.{rs,go,py}` — runner
 *     source contracts (consumers may reference these as reference
 *     implementations). NOTE: the predicate operates on `.json`
 *     filenames anyway (the generator filters by `.json` extension
 *     before calling the predicate); listed here for completeness.
 *   - Anything not matching the exclusion patterns above
 */
export const isVectorExcluded = (absPath: string, root: string): boolean => {
  const rel = relative(root, absPath).split(sep).join('/');
  if (rel.endsWith('.trace.json')) return true;
  if (rel.startsWith('vectors/_meta/')) return true;
  if (/^vectors\/[^/]+\/_meta\.json$/.test(rel)) return true;
  // Runner build artifacts. Mirrors `scripts/prepack-clean.mjs`'s
  // PATHS_TO_CLEAN list — both must agree on what is build-output
  // vs. fixture-corpus.
  if (rel.startsWith('vectors/runners/rust/target/')) return true;
  if (rel === 'vectors/runners/go/cross-runner') return true;
  if (rel === 'vectors/runners/go/cross-runner.exe') return true;
  if (/^vectors\/runners\/python\/(__pycache__|\.venv)\//.test(rel)) return true;
  if (rel.endsWith('.pyc')) return true;
  return false;
};
