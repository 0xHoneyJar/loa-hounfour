/**
 * `check:tarball-budget` — assert the published npm tarball stays
 * under a fixed size ceiling.
 *
 * Closes the regression class that surfaced during the v8.6.0 publish
 * dry-run: cargo `target/` and a compiled Go binary leaked into the
 * tarball, ballooning it from ~1.3 MB to 97.5 MB. The PR-A3.13
 * `prepack` hook fixes that case for the publish path; this gate is
 * the second layer — catches `package.json#files` drift across PRs
 * even when the prepack hook is in place. Defense in depth.
 *
 * Mechanism: invokes `npm pack --dry-run --json --ignore-scripts`,
 * parses the JSON output, and asserts:
 *   - Unpacked size strictly below UNPACKED_SIZE_CEILING_BYTES
 *   - No file path matches FORBIDDEN_PATH_FRAGMENTS
 *
 * **Why `--ignore-scripts`** (PR-B1.0 iter-2 F-002): without it,
 * `npm pack` fires the `prepack` hook, which in publish mode would
 * destructively `rm -rf` cargo target/ and the compiled Go binary
 * out of the contributor's working tree. Running `check:all` would
 * then silently nuke a developer's compiled cross-runner binary —
 * exactly the "toxic side effect" pattern we banned in PR-A3.13
 * iter-1. With `--ignore-scripts`, the gate measures the structural
 * tarball composition (what `package.json#files` resolves to) without
 * any lifecycle side effects. If artifacts ARE present in the working
 * tree, they will appear in the tarball and the FORBIDDEN_PATH_FRAGMENTS
 * + size-ceiling assertions catch the leak; if they're absent, the
 * gate passes the same way it would post-prepack-cleanup.
 *
 * Distinct from `tests/scripts/prepack-clean.test.ts` — that vitest
 * test covers the prepack-hook's own behavior (positive + negative
 * paths) under controlled conditions. This guard is structural: it
 * runs against the actual `package.json#files` whitelist + raw
 * filesystem state regardless of which fix-it-up mechanism is in
 * place. If a future PR removes the prepack hook AND adds something
 * to `files` that re-introduces the leak, this gate catches it; the
 * vitest test wouldn't.
 *
 * Wired into `check:all` so it runs on every PR alongside the other
 * structural-correctness gates.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBuildArtifact } from './lib/release-integrity-predicates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 15 MB unpacked. v8.6.0 ships at ~8 MB; 15 MB gives modest headroom
// for cycle-006+ growth while still catching a 100 MB-class regression.
// The ceiling is exclusive — tarball must be strictly less than this.
const UNPACKED_SIZE_CEILING_BYTES = 15 * 1024 * 1024;

interface PackEntry {
  readonly path: string;
  readonly size: number;
}

interface PackOutput {
  readonly name: string;
  readonly version: string;
  readonly size: number;
  readonly unpackedSize: number;
  readonly files: readonly PackEntry[];
}

const stdout = execSync('npm pack --dry-run --json --ignore-scripts', {
  cwd: root,
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

const parsed = JSON.parse(stdout) as readonly PackOutput[];
if (parsed.length !== 1) {
  console.error(`[check:tarball-budget] expected 1 pack entry, got ${parsed.length}`);
  process.exit(1);
}
const pack = parsed[0];

const errors: string[] = [];

// Size ceiling check (exclusive — must be strictly less than ceiling)
if (pack.unpackedSize >= UNPACKED_SIZE_CEILING_BYTES) {
  errors.push(
    `unpacked size ${pack.unpackedSize} bytes (~${(pack.unpackedSize / 1024 / 1024).toFixed(1)} MB) is at or above the ${UNPACKED_SIZE_CEILING_BYTES / 1024 / 1024} MB ceiling`,
  );
}

// Forbidden-path check via the shared `isBuildArtifact` predicate
// (PR-B1.0 iter-3 F-001-fragment-match): reuse the build-artifact
// subset from `scripts/lib/release-integrity-predicates.ts` so the
// tarball gate agrees with the prepack hook + the manifest gate on
// what counts as build-output. Defense-in-depth requires the layers
// to share the same definition — Knight Capital lost $440M because
// two layers of the same system disagreed on what they were
// filtering.
//
// Note: this gate uses `isBuildArtifact` (NOT `isVectorExcluded`)
// because the tarball legitimately ships `_meta.json` and
// `.trace.json` files — those are tooling references for consumers,
// just not part of the integrity-checksummed fixture corpus.
// `isVectorExcluded` is the manifest-side superset.
//
// `pack.files[].path` is repo-relative-with-forward-slashes already
// (npm normalizes). The predicate accepts an absolute path and the
// repo root, so we re-absolutize via `join(root, p)`.
const offenders = pack.files
  .map((f) => f.path)
  .filter((p) => isBuildArtifact(join(root, p), root));
if (offenders.length > 0) {
  errors.push(
    `forbidden build-artifact paths in tarball:\n${offenders.map((o) => `    - ${o}`).join('\n')}`,
  );
}

if (errors.length === 0) {
  const sizeMb = (pack.unpackedSize / 1024 / 1024).toFixed(1);
  console.log(
    `[check:tarball-budget] OK: ${pack.name}@${pack.version} — ${pack.files.length} files, ${sizeMb} MB unpacked (ceiling: ${UNPACKED_SIZE_CEILING_BYTES / 1024 / 1024} MB).`,
  );
  process.exit(0);
}

console.error('[check:tarball-budget] FAIL:');
for (const err of errors) console.error(`  ${err}`);
console.error('');
console.error('Likely causes:');
console.error('  - package.json#files added a directory that bulk-includes build artifacts');
console.error('  - scripts/prepack-clean.mjs PATHS_TO_CLEAN missed a new build-output path');
console.error('  - a new dependency added significantly to the published surface');
console.error('');
console.error('Fix: trim the leak, or revisit `UNPACKED_SIZE_CEILING_BYTES` if the growth is intentional.');
process.exit(1);
