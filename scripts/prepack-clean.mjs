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
 * ## Pack-vs-publish gate
 *
 * `npm pack` is commonly used for tarball *inspection* without intent
 * to publish. Silently nuking a 260 MB cargo cache during a `pack`
 * would surprise developers (Google SRE "toxic side effect" pattern).
 * Detection signals (in priority order):
 *
 *   1. `PREPACK_MODE=publish` explicit env override (CI / cross-runtime)
 *   2. `npm_command === 'publish'` (set by npm itself)
 *   3. `npm_lifecycle_event === 'publish'` (alt npm signal)
 *
 * For local verification of publish-equivalent tarballs, run
 * `PREPACK_MODE=publish npm pack` — this is the canonical command for
 * inspecting what `npm publish` would actually ship.
 *
 * ## Package manager support
 *
 * Currently supported: npm 9+. pnpm / yarn / bun do NOT set
 * `npm_command`, so we additionally inspect `npm_config_user_agent`:
 *
 *   - npm UA → trust the npm_command/lifecycle signals above
 *   - non-npm UA (pnpm/yarn/bun) → REQUIRE `PREPACK_MODE` explicitly;
 *     unknown publisher state is fail-closed (Apollo deployment
 *     "ambiguity defaults to denial" lesson). pnpm/yarn/bun publish
 *     flows MUST set `PREPACK_MODE=publish` before invoking, otherwise
 *     this script aborts to avoid silently shipping bad bytes.
 *
 * ## Failure semantics
 *
 * Lifecycle hooks have asymmetric failure costs (Apollo / Amazon
 * deployment-pipeline lesson): a false negative (failing to clean)
 * ships bad bytes to every consumer; a false positive (aborting
 * publish) costs one developer five minutes. We fail-closed: any
 * residual artifact in publish mode aborts the publish via a non-zero
 * exit. Post-removal `existsSync` verification anchors this — even if
 * an `rmSync` lies about success, a residual path on disk fails the
 * publish.
 */
import { rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** @type {ReadonlyArray<{ rel: string; isDir: boolean }>} */
const PATHS_TO_CLEAN = [
  { rel: 'vectors/runners/rust/target', isDir: true },
  { rel: 'vectors/runners/go/cross-runner', isDir: false },
  { rel: 'vectors/runners/go/cross-runner.exe', isDir: false },
];

// Detection matrix (npm/non-npm × pack/publish × local/CI):
//
//   | UA      | signal | env    | mode    | exit-on-ambiguity |
//   |---------|--------|--------|---------|-------------------|
//   | npm     | yes    | any    | publish | -                 |
//   | npm     | no     | any    | pack    | -                 |
//   | non-npm | yes    | any    | publish | -                 |
//   | non-npm | no     | local  | pack    | warn              |
//   | non-npm | no     | CI     | -       | EXIT 1            |
//
// "Signal" = `PREPACK_MODE=publish` OR `npm_command=publish` OR
// `npm_lifecycle_event=publish`. "CI" = `process.env.CI` truthy
// (GitHub Actions, GitLab CI, Travis, CircleCI all set this).
//
// Rationale for the local-vs-CI split (resolves the iter-3 "non-npm
// pack DX" vs iter-5 "non-npm publish silent leak" tension):
//
//   - Local `pnpm pack` (engineer inspecting a tarball at their
//     desk): pack mode + WARN. The cost of a clobbered cargo cache
//     dwarfs the cost of one extra warning line; benign workflows
//     proceed.
//   - CI non-npm publish without explicit PREPACK_MODE: fail-closed
//     with EXIT 1. Ambiguous intent at a release boundary in CI is
//     where actual bad bytes get shipped to the registry. The
//     blast-radius asymmetry reverses: every consumer who pulls the
//     bad version pays the cost.
//
// Operators running `pnpm publish` from a CI runner MUST set
// `PREPACK_MODE=publish` explicitly. The error message names the
// override.
const userAgent = process.env.npm_config_user_agent ?? '';
const isNonNpmPublisher = /\b(pnpm|yarn|bun)\//i.test(userAgent);
const explicitMode = process.env.PREPACK_MODE; // 'publish' | 'pack' | undefined
const inCI = Boolean(process.env.CI);

const isPublish =
  explicitMode === 'publish' ||
  process.env.npm_command === 'publish' ||
  process.env.npm_lifecycle_event === 'publish';

if (isNonNpmPublisher && !isPublish && !explicitMode && inCI) {
  console.error(
    `prepack-clean: ABORTING — non-npm package manager (${userAgent.split(' ')[0]}) in CI without explicit PREPACK_MODE.`,
  );
  console.error(
    'prepack-clean: ambiguous publish-vs-pack intent at a release boundary; refusing to silently skip artifact cleanup.',
  );
  console.error(
    'prepack-clean: set `PREPACK_MODE=publish` (release flows) or `PREPACK_MODE=pack` (CI inspection) explicitly.',
  );
  process.exit(1);
}

const mode = isPublish ? 'publish (destructive)' : 'pack (dry-run only)';
console.log(`prepack-clean: mode=${mode}${userAgent ? ` (ua=${userAgent.split(' ')[0]})` : ''}`);

if (isNonNpmPublisher && !isPublish && !explicitMode) {
  console.warn(
    `prepack-clean: WARNING — non-npm package manager (${userAgent.split(' ')[0]}) without explicit PREPACK_MODE.`,
  );
  console.warn(
    'prepack-clean: defaulting to pack mode (non-destructive). If this is a publish flow, set PREPACK_MODE=publish to enable artifact cleanup.',
  );
}

const failures = [];

// Defense in depth: ensure each entry stays under repo root. Hardcoded
// today so not exploitable, but cheap insurance if PATHS_TO_CLEAN ever
// becomes config/env-driven.
const rootResolved = resolve(root);
const isWithinRoot = (abs) => {
  const r = resolve(abs);
  return r === rootResolved || r.startsWith(rootResolved + sep);
};

for (const { rel, isDir } of PATHS_TO_CLEAN) {
  const abs = join(root, rel);
  if (!isWithinRoot(abs)) {
    failures.push({ rel, reason: 'path resolves outside repo root' });
    continue;
  }

  if (isPublish) {
    // Capture existence once for honest logging. We don't *gate*
    // rmSync on it (force:true swallows ENOENT natively), but we do
    // want the log line to reflect whether work actually happened.
    const wasPresent = existsSync(abs);
    try {
      rmSync(abs, { recursive: true, force: true });
    } catch (err) {
      failures.push({
        rel,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    // Anchor: post-removal verification. Even if rmSync returned
    // success, a residual path on disk is a publish-blocker.
    if (existsSync(abs)) {
      failures.push({ rel, reason: 'still present after rmSync' });
      continue;
    }
    if (wasPresent) {
      console.log(`prepack-clean: removed ${rel}${isDir ? '/' : ''}`);
    }
  } else {
    if (!existsSync(abs)) continue;
    console.log(
      `prepack-clean: would-remove ${rel}${isDir ? '/' : ''} (set PREPACK_MODE=publish to act)`,
    );
  }
}

if (isPublish && failures.length > 0) {
  console.error('prepack-clean: ABORTING publish — residual build artifacts:');
  for (const { rel, reason } of failures) {
    console.error(`  - ${rel}: ${reason}`);
  }
  console.error(
    'prepack-clean: shipping the tarball with these paths would inflate it from ~1 MB to ~100 MB.',
  );
  process.exit(1);
}
