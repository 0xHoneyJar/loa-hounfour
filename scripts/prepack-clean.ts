/**
 * Prepack hook — remove cross-runner build artifacts before npm pack/publish.
 *
 * Background: package.json#files whitelists `vectors/` (among others). Once
 * `files` is set, npm 9.x does NOT honor `.npmignore` for paths inside the
 * whitelist (verified empirically on npm 9.2.0). The cross-runner trees
 * carry build artifacts that are gitignored but would otherwise leak into
 * the npm tarball:
 *
 *   - vectors/runners/rust/target/      (~260 MB cargo build cache)
 *   - vectors/runners/go/cross-runner   (~5 MB compiled Go binary)
 *
 * Without this hook, an operator publishing after running
 * `npm run vectors:cross-runners` would ship a ~100 MB tarball instead of
 * the expected ~4 MB.
 *
 * Source contracts (Cargo.toml, src/, *.go, *.py, README.md, _shared/) DO
 * remain in the tarball — consumers who want to run cross-runners against
 * their own implementations need them as reference.
 *
 * Wired via `package.json#scripts.prepack` so it runs automatically on
 * `npm pack` and `npm publish` without operator memory.
 */
import { rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const PATHS_TO_CLEAN = [
  'vectors/runners/rust/target',
  'vectors/runners/go/cross-runner',
  'vectors/runners/go/cross-runner.exe',
] as const;

let removedAny = false;
for (const rel of PATHS_TO_CLEAN) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  const isDir = statSync(abs).isDirectory();
  rmSync(abs, { recursive: true, force: true });
  console.log(`prepack-clean: removed ${rel}${isDir ? '/' : ''}`);
  removedAny = true;
}
if (!removedAny) {
  console.log('prepack-clean: no build artifacts to remove');
}
