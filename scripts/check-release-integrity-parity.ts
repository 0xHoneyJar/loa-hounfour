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
 * Mechanism:
 *   1. Snapshot the committed `RELEASE-INTEGRITY.json` (drop the
 *      `generated_at` timestamp — that's wall-clock entropy).
 *   2. Run `tsx scripts/generate-release-integrity.ts`.
 *   3. Snapshot the regenerated `RELEASE-INTEGRITY.json` (same drop).
 *   4. Compare: byte-equal except `generated_at`. Any mismatch fails
 *      the gate with a path-level diff so the reviewer sees exactly
 *      what changed.
 *
 * Mirrors `check:dist-parity` for `dist/`. Same Bazel/Buck2 hermetic-
 * build precedent: artifacts must be a pure function of inputs.
 *
 * State-mutation note: this script writes to the committed
 * `RELEASE-INTEGRITY.json` as part of step 2. On failure the working
 * tree is left dirty for triage; on success the tree is byte-
 * identical to its pre-run state. Running outside CI in a dirty repo
 * is fine — re-run `npx tsx scripts/generate-release-integrity.ts`
 * to restore parity.
 *
 * @see scripts/check-dist-parity.ts — sibling pattern
 * @see scripts/lib/release-integrity-predicates.ts — pinned predicate
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const manifestPath = join(root, 'RELEASE-INTEGRITY.json');

interface NormalizedManifest {
  readonly release_version: string;
  readonly generator: string;
  readonly totals: Record<string, number>;
  readonly checksums: Record<string, ReadonlyArray<{ path: string; sha256: string; size_bytes: number }>>;
}

function loadAndNormalize(): NormalizedManifest {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  // Drop wall-clock entropy. Everything else is a pure function of
  // inputs (CONTRACT_VERSION + filesystem state).
  delete raw.generated_at;
  // Drop the human-readable verification example since it embeds
  // the same instructions on every regen but isn't load-bearing.
  delete raw.verification;
  return raw as NormalizedManifest;
}

function diffSummary(before: NormalizedManifest, after: NormalizedManifest): string[] {
  const lines: string[] = [];
  // Totals diff
  const allCategories = new Set([...Object.keys(before.totals), ...Object.keys(after.totals)]);
  for (const cat of [...allCategories].sort()) {
    const a = before.totals[cat] ?? 0;
    const b = after.totals[cat] ?? 0;
    if (a !== b) lines.push(`  totals.${cat}: ${a} → ${b}`);
  }
  // Per-category checksum-set diff (path-only, not sha — easier to read)
  for (const cat of Object.keys(after.checksums).sort()) {
    const beforePaths = new Set((before.checksums[cat] ?? []).map((e) => e.path));
    const afterPaths = new Set(after.checksums[cat].map((e) => e.path));
    const added = [...afterPaths].filter((p) => !beforePaths.has(p)).sort();
    const removed = [...beforePaths].filter((p) => !afterPaths.has(p)).sort();
    for (const p of added.slice(0, 10)) lines.push(`  +${cat}: ${p}`);
    if (added.length > 10) lines.push(`  +${cat}: ... and ${added.length - 10} more`);
    for (const p of removed.slice(0, 10)) lines.push(`  -${cat}: ${p}`);
    if (removed.length > 10) lines.push(`  -${cat}: ... and ${removed.length - 10} more`);
  }
  return lines;
}

const before = loadAndNormalize();

execSync('npx tsx scripts/generate-release-integrity.ts', {
  cwd: root,
  stdio: ['ignore', 'ignore', 'inherit'],
});

const after = loadAndNormalize();

const beforeJson = JSON.stringify(before);
const afterJson = JSON.stringify(after);

if (beforeJson === afterJson) {
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
