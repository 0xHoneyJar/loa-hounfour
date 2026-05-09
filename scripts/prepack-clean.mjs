/**
 * Prepack hook — remove cross-runner build artifacts before npm publish.
 *
 * Plain .mjs (not .ts) so the publish path has zero toolchain coupling
 * beyond Node itself — `tsx` lives in devDependencies and is not
 * guaranteed to resolve in production-only or constrained-CI install
 * contexts.
 *
 * Background: package.json#files whitelists `vectors/` (among others).
 * Once `files` is set, npm 9.x does NOT honor `.npmignore` for paths
 * inside the whitelist (verified empirically across 4 .npmignore-pattern
 * variants on npm 9.2.0). The cross-runner trees carry build artifacts
 * that are gitignored but would otherwise leak into the npm tarball:
 *
 *   - vectors/runners/rust/target/      (~260 MB cargo build cache)
 *   - vectors/runners/go/cross-runner   (~5 MB compiled Go binary)
 *
 * Without this hook, an operator publishing after running
 * `npm run vectors:cross-runners` would ship a ~100 MB tarball instead
 * of the expected ~1.3 MB.
 *
 * Source contracts (Cargo.toml, src/, *.go, *.py, README.md, _shared/)
 * DO remain in the tarball — consumers who want to run cross-runners
 * against their own implementations need them as reference.
 *
 * Hook ordering (npm lifecycle): `prepublishOnly` (tsc) → `prepack`
 * (this file). Future hooks adding build outputs into the cleaned
 * paths after this stage would re-introduce the leak — keep that
 * invariant in mind when extending.
 *
 * Inspection-vs-commitment guard: `npm pack` is commonly used for
 * tarball *inspection* without intent to publish. Silently nuking a
 * 260 MB cargo cache during a `pack` would surprise developers
 * (Google SRE "toxic side effect" pattern). The destructive branch
 * runs only when `npm_command === 'publish'`; on `pack` we emit a
 * dry-run report listing what *would* be removed and let the
 * artifacts stay.
 */
import { rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** @type {ReadonlyArray<{ rel: string; isDir: boolean }>} */
const PATHS_TO_CLEAN = [
  { rel: 'vectors/runners/rust/target', isDir: true },
  { rel: 'vectors/runners/go/cross-runner', isDir: false },
  { rel: 'vectors/runners/go/cross-runner.exe', isDir: false },
];

const isPublish = process.env.npm_command === 'publish';
const mode = isPublish ? 'publish (destructive)' : 'pack (dry-run only)';
console.log(`prepack-clean: mode=${mode}`);

let actedOn = 0;
for (const { rel, isDir } of PATHS_TO_CLEAN) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  if (isPublish) {
    try {
      rmSync(abs, { recursive: true, force: true });
      console.log(`prepack-clean: removed ${rel}${isDir ? '/' : ''}`);
    } catch (err) {
      console.warn(
        `prepack-clean: WARN failed to remove ${rel} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    console.log(`prepack-clean: would-remove ${rel}${isDir ? '/' : ''} (set npm_command=publish to act)`);
  }
  actedOn += 1;
}
if (actedOn === 0) {
  console.log('prepack-clean: no build artifacts present');
}
