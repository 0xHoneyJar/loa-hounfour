/**
 * Regression guard for PR-A3.13: ensures the published npm tarball does
 * not carry cross-runner build artifacts.
 *
 * The leak that motivated `scripts/prepack-clean.mjs` was a 100× tarball
 * inflation (97.5 MB packed / 283 MB unpacked) when `vectors/runners/rust/target/`
 * or `vectors/runners/go/cross-runner` happened to be present at publish
 * time. Encoding the empirical fix as a test (Meta release-engineering
 * principle: "every empirical fix becomes a regression test") prevents
 * future changes to `package.json#files`, hook ordering, or path layout
 * from silently re-introducing the leak.
 *
 * ## Load-bearing test design
 *
 * The test plants markers at the same paths the developer's real
 * cross-runner outputs would live, then runs `npm pack --json` in BOTH
 * pack mode (no cleanup) and publish mode (cleanup), proving:
 *
 *   1. Without the hook, the markers leak into the tarball
 *      (negative-path assertion — the hook is necessary).
 *   2. With the hook, the markers are filtered (positive-path assertion
 *      — the hook is sufficient).
 *
 * A test that only verifies the positive path is decoration if the
 * filter could be a no-op and the test would still pass (Netflix chaos-
 * engineering "kill the canary" lesson).
 *
 * ## Test-fixture invariants
 *
 * - Idempotent and restorative: working tree is byte-identical before
 *   and after the test, even when the developer has compiled real
 *   cross-runner artifacts on disk (Meta buck-test invariant). Snapshot
 *   pre-existing file content; track which directories the test
 *   explicitly created and only remove those.
 * - No mtime preservation: snapshot captures content only; restored
 *   files get a new mtime. Acceptable because the cross-runner build
 *   tools (cargo, go) regenerate freshness metadata via their own
 *   stamps (`.fingerprint/` for cargo, target staleness for go), not
 *   filesystem mtime alone.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// Paths that MUST NOT appear in the published tarball.
const FORBIDDEN_PATH_FRAGMENTS = [
  'vectors/runners/rust/target/',
  'vectors/runners/go/cross-runner',
] as const;

// Tarball-size ceiling. v8.6.0 ships at ~1.3 MB packed / ~14 MB unpacked.
// 15 MB gives modest headroom for cycle-006+ growth while still catching
// a ~100 MB regression of the magnitude this PR exists to prevent.
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

const RUST_TARGET_MARKER = join(ROOT, 'vectors/runners/rust/target/release/test-marker');
const GO_BINARY_MARKER = join(ROOT, 'vectors/runners/go/cross-runner');
// Directories the test may need to create. Only those NOT pre-existing
// will be removed during teardown.
const POTENTIAL_DIRS = [
  join(ROOT, 'vectors/runners/rust/target/release'),
  join(ROOT, 'vectors/runners/rust/target'),
];

function snapshot(path: string): Buffer | null {
  return existsSync(path) ? readFileSync(path) : null;
}

/**
 * Plant marker artifacts and snapshot any pre-existing state, restore
 * byte-identical content + remove only directories the test created.
 */
function withMarkers<T>(fn: () => T): T {
  const rustSnap = snapshot(RUST_TARGET_MARKER);
  const goSnap = snapshot(GO_BINARY_MARKER);
  const dirsCreatedByTest: string[] = [];
  for (const d of POTENTIAL_DIRS) {
    if (!existsSync(d)) {
      mkdirSync(d, { recursive: true });
      dirsCreatedByTest.push(d);
    }
  }

  writeFileSync(RUST_TARGET_MARKER, 'test\n');
  writeFileSync(GO_BINARY_MARKER, 'test\n');
  try {
    return fn();
  } finally {
    if (rustSnap) {
      writeFileSync(RUST_TARGET_MARKER, rustSnap);
    } else if (existsSync(RUST_TARGET_MARKER)) {
      rmSync(RUST_TARGET_MARKER, { force: true });
    }
    if (goSnap) {
      writeFileSync(GO_BINARY_MARKER, goSnap);
    } else if (existsSync(GO_BINARY_MARKER)) {
      rmSync(GO_BINARY_MARKER, { force: true });
    }
    // Only remove dirs the test itself created. Outermost-first removal
    // would fail (parent before child); reverse so we drop release/
    // before target/.
    for (const d of [...dirsCreatedByTest].reverse()) {
      try {
        rmSync(d, { recursive: false });
      } catch {
        // Ignore — directory non-empty (someone else's content) or
        // already removed.
      }
    }
  }
}

function pack(envOverrides: Record<string, string>): PackOutput {
  const stdout = execSync('npm pack --dry-run --json', {
    cwd: ROOT,
    env: { ...process.env, ...envOverrides },
    encoding: 'utf-8',
    // stderr suppressed — npm chatter (warnings, hook output) would
    // pollute the test output. The script's exit code + JSON stdout
    // are what we assert on.
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const parsed = JSON.parse(stdout) as readonly PackOutput[];
  expect(parsed).toHaveLength(1);
  return parsed[0];
}

describe('prepack-clean: tarball regression guard', () => {
  let publishPack: PackOutput | undefined;
  let packPack: PackOutput | undefined;

  beforeAll(() => {
    // Pack mode FIRST: markers stay; observe the leak. Then publish
    // mode: markers get cleaned; observe the fix. Order matters
    // because publish mode deletes the markers, so a publish-then-pack
    // ordering would observe an empty pack tarball even with the hook
    // off, defeating the negative-path assertion.
    packPack = withMarkers(() => pack({ PREPACK_MODE: 'pack' }));
    publishPack = withMarkers(() => pack({ PREPACK_MODE: 'publish' }));
  }, 120_000);

  afterAll(() => {
    publishPack = undefined;
    packPack = undefined;
  });

  describe('positive path (PREPACK_MODE=publish)', () => {
    it('packs successfully and reports a non-empty file list', () => {
      expect(publishPack).toBeDefined();
      expect(publishPack!.files.length).toBeGreaterThan(0);
    });

    it('does not include any forbidden cross-runner build artifacts', () => {
      const offenders = publishPack!.files
        .map((f) => f.path)
        .filter((p) =>
          FORBIDDEN_PATH_FRAGMENTS.some((fragment) => p.includes(fragment)),
        );
      expect(
        offenders,
        `Forbidden artifacts in tarball: ${JSON.stringify(offenders)}`,
      ).toEqual([]);
    });

    it('stays under the unpacked-size ceiling', () => {
      expect(
        publishPack!.unpackedSize,
        `Tarball unpacked size ${publishPack!.unpackedSize} bytes exceeds ceiling ${UNPACKED_SIZE_CEILING_BYTES}`,
      ).toBeLessThan(UNPACKED_SIZE_CEILING_BYTES);
    });

    it('still ships the cross-runner sources (Cargo.toml, *.go, *.rs)', () => {
      const paths = publishPack!.files.map((f) => f.path);
      expect(paths).toContain('vectors/runners/rust/Cargo.toml');
      expect(paths).toContain('vectors/runners/go/cmd/cross-runner/main.go');
      expect(paths).toContain('vectors/runners/rust/src/bin/cross-runner.rs');
    });
  });

  describe('negative path (PREPACK_MODE=pack — proves hook is load-bearing)', () => {
    it('DOES include the cross-runner build artifacts when cleanup is skipped', () => {
      const paths = packPack!.files.map((f) => f.path);
      const targetMarkerLeaked = paths.some((p) =>
        p.includes('vectors/runners/rust/target/'),
      );
      const goBinaryLeaked = paths.some(
        (p) => p === 'vectors/runners/go/cross-runner',
      );
      expect(
        targetMarkerLeaked,
        'rust target/ marker should leak into tarball when prepack runs in pack mode (proves hook is necessary)',
      ).toBe(true);
      expect(
        goBinaryLeaked,
        'go cross-runner binary should leak into tarball when prepack runs in pack mode (proves hook is necessary)',
      ).toBe(true);
    });
  });
});
