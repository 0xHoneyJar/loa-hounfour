/**
 * `check:release-integrity-parity` — assert that the committed
 * `RELEASE-INTEGRITY.json` matches the output of regenerating it from
 * a clean tree.
 *
 * Closes the regression class that contaminated the v8.6.0 published
 * manifest with 146 cargo `target/` ghost paths: the predicate was
 * incomplete AND there was no CI guard verifying the manifest could
 * be reproduced from sources alone.
 *
 * Mechanism (hermetic — does NOT mutate the working tree):
 *   1. Read the committed `RELEASE-INTEGRITY.json` (drop the
 *      `generated_at` timestamp — wall-clock entropy).
 *   2. Run `tsx scripts/generate-release-integrity.ts --out <tmp>`
 *      to write the regenerated manifest to a tmp file.
 *   3. Read the regenerated manifest (same drop).
 *   4. Compare: byte-equal except `generated_at`. Any mismatch fails
 *      the gate with a path-level diff so the reviewer sees exactly
 *      what changed.
 *   5. Always remove the tmp file in `finally`.
 *
 * The PR-B1.0 iter-1 design wrote the regenerated manifest to the
 * tracked path, leaving the working tree dirty on failure. Bridge
 * iter-1 F-001 flagged this as a hermeticity violation (Bazel/Buck2
 * sandbox precedent: verification gates must be referentially
 * transparent w.r.t. the working tree). This iter-2 implementation
 * uses the generator's new `--out` flag to write to a tmp path.
 *
 * @see scripts/check-dist-parity.ts — sibling pattern (still mutates
 *      `dist/`; that's tracked under its own design rationale and
 *      not part of this PR's scope)
 * @see scripts/lib/release-integrity-predicates.ts — pinned predicate
 */
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const committedManifestPath = join(root, 'RELEASE-INTEGRITY.json');

interface NormalizedManifest {
  readonly release_version: string;
  readonly generator: string;
  readonly totals: Record<string, number>;
  readonly checksums: Record<string, ReadonlyArray<{ path: string; sha256: string; size_bytes: number }>>;
}

function loadAndNormalize(path: string): NormalizedManifest {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  // Drop wall-clock entropy. Everything else is a pure function of
  // inputs (CONTRACT_VERSION + filesystem state).
  delete raw.generated_at;
  // Drop the human-readable verification example since it embeds
  // the same instructions on every regen but isn't load-bearing.
  delete raw.verification;
  return raw as NormalizedManifest;
}

/**
 * Canonical JSON serialization with sorted object keys at every
 * depth. Required for parity comparison because `JSON.stringify`
 * preserves insertion order — if the generator's internals reorder
 * how `totals` or `checksums` are constructed without semantic
 * drift, naive stringify equality would fail spuriously and look
 * like contamination (PR-B1.0 iter-4 F-001).
 *
 * Same lesson as Bazel's remote-cache action keys: two semantically
 * identical inputs with different map iteration orders MUST produce
 * the same cache key. We canonicalize at the comparison boundary,
 * not at write time, because the generator's own JSON output is
 * already deterministic in practice — this guards against future
 * generator refactors that change construction order without intent.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = canonicalize(obj[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Build a human-readable diff between the committed manifest and
 * the regenerated manifest. Surfaces three drift classes per the
 * PR-B1.0 iter-3 F-001-parity-drift mitigation:
 *
 *   - `totals.<category>`: count mismatches
 *   - `+<category>: <path>` / `-<category>: <path>`: path-set diffs
 *     (added or removed entries between committed and regenerated)
 *   - `~<category>: <path> sha256 a→b size N→M`: same path, drifted
 *     content (changed sha256 OR changed size). The original
 *     diffSummary missed this class entirely — a hand-edit that
 *     changed an existing file's content but left the path alone
 *     would surface as a generic "totals and path sets match"
 *     failure with no triage breadcrumbs.
 *
 * Output is capped at 10 entries per drift class with a "... and K
 * more" tail to keep CI logs readable. The intent is enough signal
 * for a 3am triage; the full diff is always reproducible by
 * regenerating both manifests and `diff`-ing the JSON directly.
 */
function diffSummary(before: NormalizedManifest, after: NormalizedManifest): string[] {
  const lines: string[] = [];
  // Totals diff — show every category that exists in either side.
  const allCategories = new Set([
    ...Object.keys(before.totals),
    ...Object.keys(after.totals),
  ]);
  for (const cat of [...allCategories].sort()) {
    const a = before.totals[cat] ?? 0;
    const b = after.totals[cat] ?? 0;
    if (a !== b) lines.push(`  totals.${cat}: ${a} → ${b}`);
  }
  // Per-category checksum diff: union of categories so a category
  // present in only one side still gets reported.
  const allChecksumCats = new Set([
    ...Object.keys(before.checksums),
    ...Object.keys(after.checksums),
  ]);
  for (const cat of [...allChecksumCats].sort()) {
    const beforeByPath = new Map(
      (before.checksums[cat] ?? []).map((e) => [e.path, e]),
    );
    const afterByPath = new Map(
      (after.checksums[cat] ?? []).map((e) => [e.path, e]),
    );
    const added = [...afterByPath.keys()].filter((p) => !beforeByPath.has(p)).sort();
    const removed = [...beforeByPath.keys()].filter((p) => !afterByPath.has(p)).sort();
    // Same path, drifted content — the diagnostic class the iter-2
    // implementation entirely missed.
    const changed: string[] = [];
    for (const path of [...beforeByPath.keys()].sort()) {
      const a = beforeByPath.get(path);
      const b = afterByPath.get(path);
      if (!a || !b) continue;
      if (a.sha256 !== b.sha256 || a.size_bytes !== b.size_bytes) {
        changed.push(
          `  ~${cat}: ${path} sha256 ${a.sha256.slice(0, 8)}…→${b.sha256.slice(0, 8)}… size ${a.size_bytes}→${b.size_bytes}`,
        );
      }
    }
    for (const p of added.slice(0, 10)) lines.push(`  +${cat}: ${p}`);
    if (added.length > 10) lines.push(`  +${cat}: ... and ${added.length - 10} more`);
    for (const p of removed.slice(0, 10)) lines.push(`  -${cat}: ${p}`);
    if (removed.length > 10) lines.push(`  -${cat}: ... and ${removed.length - 10} more`);
    for (const line of changed.slice(0, 10)) lines.push(line);
    if (changed.length > 10) lines.push(`  ~${cat}: ... and ${changed.length - 10} more changed entries`);
  }
  return lines;
}

const tmpDir = mkdtempSync(join(tmpdir(), 'release-integrity-parity-'));
const regeneratedPath = join(tmpDir, 'RELEASE-INTEGRITY.json');

try {
  const before = loadAndNormalize(committedManifestPath);

  execSync(`npx tsx scripts/generate-release-integrity.ts --out "${regeneratedPath}"`, {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  const after = loadAndNormalize(regeneratedPath);

  if (JSON.stringify(canonicalize(before)) === JSON.stringify(canonicalize(after))) {
    console.log('[check:release-integrity-parity] OK: RELEASE-INTEGRITY.json matches generator output (modulo generated_at).');
    process.exit(0);
  }

  console.error('[check:release-integrity-parity] FAIL: RELEASE-INTEGRITY.json drifts from generator output.');
  console.error('');
  console.error('Either:');
  console.error('  - the generator changed and the committed manifest is stale, or');
  console.error('  - the manifest was hand-edited (which the generator-as-source-of-truth contract forbids).');
  console.error('');
  console.error('Diff summary (paths only):');
  const diff = diffSummary(before, after);
  if (diff.length === 0) {
    console.error('  (totals and path sets match; sha256 or size_bytes drift — re-run generator and inspect)');
  } else {
    for (const line of diff) console.error(line);
  }
  console.error('');
  console.error('Fix: run `npx tsx scripts/generate-release-integrity.ts` and commit the result.');
  process.exit(1);
} finally {
  // Always clean the tmp dir, even on SIGINT / unexpected throw.
  rmSync(tmpDir, { recursive: true, force: true });
}
