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
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
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
// Tighter than 50 MB so we get earlier signal on slow drift, looser than
// the current ~14 MB so a few MB of legitimate fixture growth doesn't
// trip the gate.
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

const RUST_TARGET_MARKER = join(ROOT, 'vectors/runners/rust/target/release/.test-marker');
const GO_BINARY_MARKER = join(ROOT, 'vectors/runners/go/cross-runner');

/**
 * Snapshot a path's content + mtime so we can restore it byte-identical
 * after the test runs. Returns `null` if the path didn't exist; in that
 * case the restorer just removes whatever the test wrote.
 */
function snapshot(path: string): { content: Buffer; mtimeMs: number } | null {
  if (!existsSync(path)) return null;
  return {
    content: readFileSync(path),
    mtimeMs: statSync(path).mtimeMs,
  };
}

/**
 * Plant marker artifacts at the same paths the developer's real
 * cross-runner outputs would live, snapshot any pre-existing content,
 * then restore byte-identical state in finally. The repo's working
 * tree is left identical to how the test found it (Meta buck-test
 * "idempotent and restorative" invariant). The Go binary case is the
 * one that mattered: a developer who had run `npm run vectors:cross-
 * runners` would otherwise lose their compiled binary to the clobber.
 */
function withMarkers<T>(fn: () => T): T {
  const rustSnap = snapshot(RUST_TARGET_MARKER);
  const goSnap = snapshot(GO_BINARY_MARKER);

  mkdirSync(dirname(RUST_TARGET_MARKER), { recursive: true });
  writeFileSync(RUST_TARGET_MARKER, 'test\n');
  writeFileSync(GO_BINARY_MARKER, 'test\n');
  try {
    return fn();
  } finally {
    // Restore the rust marker path: write back the snapshot if it
    // existed, otherwise remove our test write + clean up any dirs we
    // created.
    if (rustSnap) {
      writeFileSync(RUST_TARGET_MARKER, rustSnap.content);
    } else {
      if (existsSync(RUST_TARGET_MARKER)) rmSync(RUST_TARGET_MARKER, { force: true });
      const release = join(ROOT, 'vectors/runners/rust/target/release');
      const target = join(ROOT, 'vectors/runners/rust/target');
      for (const d of [release, target]) {
        try {
          rmSync(d, { recursive: false });
        } catch {
          // Ignore — directory non-empty or already gone.
        }
      }
    }
    // Restore the go binary path.
    if (goSnap) {
      writeFileSync(GO_BINARY_MARKER, goSnap.content);
    } else {
      if (existsSync(GO_BINARY_MARKER)) rmSync(GO_BINARY_MARKER, { force: true });
    }
  }
}

describe('prepack-clean: tarball regression guard', () => {
  let pack: PackOutput | undefined;

  beforeAll(() => {
    pack = withMarkers(() => {
      // PREPACK_MODE=publish forces the destructive branch even though
      // we're invoking `npm pack`. This is the same gate publish flows
      // use, so the assertion exercises the publish-path semantics.
      const stdout = execSync('npm pack --dry-run --json', {
        cwd: ROOT,
        env: { ...process.env, PREPACK_MODE: 'publish' },
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      // npm pack --json emits a JSON array with one entry per pack call.
      const parsed = JSON.parse(stdout) as readonly PackOutput[];
      expect(parsed).toHaveLength(1);
      return parsed[0];
    });
  }, 60_000);

  afterAll(() => {
    pack = undefined;
  });

  it('packs successfully and reports a non-empty file list', () => {
    expect(pack).toBeDefined();
    expect(pack!.files.length).toBeGreaterThan(0);
  });

  it('does not include any forbidden cross-runner build artifacts', () => {
    const offenders = pack!.files
      .map((f) => f.path)
      .filter((p) =>
        FORBIDDEN_PATH_FRAGMENTS.some((fragment) => p.includes(fragment)),
      );
    expect(offenders, `Forbidden artifacts in tarball: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  it('stays under the unpacked-size ceiling', () => {
    expect(
      pack!.unpackedSize,
      `Tarball unpacked size ${pack!.unpackedSize} bytes exceeds ceiling ${UNPACKED_SIZE_CEILING_BYTES}`,
    ).toBeLessThan(UNPACKED_SIZE_CEILING_BYTES);
  });

  it('still ships the cross-runner sources (Cargo.toml, *.go, *.rs)', () => {
    // Defensive: the prepack hook should remove only build outputs, not
    // the source contracts consumers need to run cross-runners.
    const paths = pack!.files.map((f) => f.path);
    expect(paths).toContain('vectors/runners/rust/Cargo.toml');
    expect(paths).toContain('vectors/runners/go/cmd/cross-runner/main.go');
    expect(paths).toContain('vectors/runners/rust/src/bin/cross-runner.rs');
  });
});
