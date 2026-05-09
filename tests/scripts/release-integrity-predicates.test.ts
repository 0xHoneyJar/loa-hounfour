/**
 * Truth-table tests for `isVectorExcluded` — the predicate that
 * decides which paths under `vectors/` ship in `RELEASE-INTEGRITY.json`.
 *
 * The predicate originally shipped with an inverted branch in
 * PR-A3.12 iter-1 (5 days of cycle-005 reviews caught it at iter-3)
 * and silently leaked 146 cargo `target/` cache paths into the v8.6.0
 * published manifest because no test pinned the truth table.
 *
 * Encoding the lesson here (Meta release-engineering principle:
 * "every empirical fix becomes a regression test"). Every documented
 * inclusion + exclusion gets a row.
 */
import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isVectorExcluded } from '../../scripts/lib/release-integrity-predicates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

interface Row {
  readonly relPath: string;
  readonly excluded: boolean;
  readonly why: string;
}

const TRUTH_TABLE: readonly Row[] = [
  // ---- Inclusion (returns false) ----
  {
    relPath: 'vectors/CanonicalRun/v8.6.0/valid/canonical-001-baseline.json',
    excluded: false,
    why: 'cycle-005 per-file fixture under v8.6.0/valid/',
  },
  {
    relPath: 'vectors/CanonicalRun/v8.6.0/invalid/missing-required-phase.json',
    excluded: false,
    why: 'cycle-005 per-file fixture under v8.6.0/invalid/',
  },
  {
    relPath: 'vectors/CanonicalRun/v8.6.0/invalid-cross-field/cr1-non-monotonic.json',
    excluded: false,
    why: 'cycle-005 per-file fixture under v8.6.0/invalid-cross-field/',
  },
  {
    relPath: 'vectors/CanonicalRun/v8.6.0/boundary/cr1-edge-case.json',
    excluded: false,
    why: 'cycle-005 per-file fixture under v8.6.0/boundary/',
  },
  {
    relPath: 'vectors/conformance/legacy-multi-vector.json',
    excluded: false,
    why: 'pre-cycle-005 multi-vector legacy format',
  },
  {
    relPath: 'vectors/AgentEstate/invalid/extra-field.json',
    excluded: false,
    why: 'pre-cycle-005 layout (no v<X>/ subdir)',
  },

  // ---- Exclusion: trace diagnostics ----
  {
    relPath: 'vectors/CanonicalRun/v8.6.0/valid/canonical-001-baseline.trace.json',
    excluded: true,
    why: '*.trace.json — per-fixture diagnostic companion',
  },

  // ---- Exclusion: tooling registries (top-level _meta/) ----
  {
    relPath: 'vectors/_meta/constraint-level-invalids.json',
    excluded: true,
    why: 'vectors/_meta/ — tooling registry',
  },
  {
    relPath: 'vectors/_meta/regex-subset.json',
    excluded: true,
    why: 'vectors/_meta/ — framework-internal',
  },

  // ---- Exclusion: per-schema _meta.json (depth-2 only) ----
  {
    relPath: 'vectors/CanonicalRun/_meta.json',
    excluded: true,
    why: 'per-schema _meta.json at depth-2 — schema-level metadata',
  },
  {
    relPath: 'vectors/OracleDigest/_meta.json',
    excluded: true,
    why: 'per-schema _meta.json at depth-2',
  },
  {
    relPath: 'vectors/CanonicalRun/v8.6.0/_meta.json',
    excluded: false,
    why: 'depth-3 _meta.json — NOT excluded by depth-2 anchor (intentional; future fixture name)',
  },

  // ---- Exclusion: cargo build cache ----
  {
    relPath: 'vectors/runners/rust/target/.rustc_info.json',
    excluded: true,
    why: 'vectors/runners/rust/target/ — cargo build cache (PR-B1.0 fix)',
  },
  {
    relPath: 'vectors/runners/rust/target/release/.fingerprint/ahash-71bcea/lib-ahash.json',
    excluded: true,
    why: 'cargo .fingerprint/ artifact under target/',
  },
  {
    relPath: 'vectors/runners/rust/target/CACHEDIR.TAG',
    excluded: true,
    why: 'cargo cache dir marker (matched by target/ prefix)',
  },

  // ---- Exclusion: compiled Go binary ----
  {
    relPath: 'vectors/runners/go/cross-runner',
    excluded: true,
    why: 'compiled Go cross-runner binary',
  },
  {
    relPath: 'vectors/runners/go/cross-runner.exe',
    excluded: true,
    why: 'Windows-variant Go cross-runner binary',
  },

  // ---- Exclusion: Python build cache ----
  {
    relPath: 'vectors/runners/python/__pycache__/cross_runner.cpython-312.pyc',
    excluded: true,
    why: 'Python __pycache__/ bytecode',
  },
  {
    relPath: 'vectors/runners/python/.venv/bin/python3',
    excluded: true,
    why: 'Python virtual env',
  },
  {
    relPath: 'vectors/runners/python/cross_runner.pyc',
    excluded: true,
    why: 'top-level .pyc — Python bytecode',
  },

  // ---- Inclusion: runner sources (always ship as reference) ----
  {
    relPath: 'vectors/runners/_shared/parity-protocol-version.txt',
    excluded: false,
    why: 'cross-runner SSOT shared file',
  },
  {
    relPath: 'vectors/runners/rust/Cargo.toml',
    excluded: false,
    why: 'rust runner source contract',
  },
  {
    relPath: 'vectors/runners/rust/src/bin/cross-runner.rs',
    excluded: false,
    why: 'rust runner source code',
  },
  {
    relPath: 'vectors/runners/go/cmd/cross-runner/main.go',
    excluded: false,
    why: 'Go runner source code',
  },
  {
    relPath: 'vectors/runners/python/cross_runner.py',
    excluded: false,
    why: 'Python runner source code',
  },
];

describe('isVectorExcluded — truth table', () => {
  for (const row of TRUTH_TABLE) {
    it(`${row.excluded ? 'EXCLUDES' : 'INCLUDES'} ${row.relPath} — ${row.why}`, () => {
      const abs = join(ROOT, row.relPath);
      expect(isVectorExcluded(abs, ROOT)).toBe(row.excluded);
    });
  }

  it('handles forward-slash paths from POSIX (Linux/macOS canonical)', () => {
    const abs = `${ROOT}/vectors/runners/rust/target/test.json`;
    expect(isVectorExcluded(abs, ROOT)).toBe(true);
  });

  // Note: cross-platform path-separator normalization is documented as
  // a forward-compatible defense for future Windows contributors, but
  // is not unit-testable from a POSIX runner because `path.relative`
  // is platform-specific (uses `path.sep` which is `/` on Linux).
  // The predicate's `.split(sep).join('/')` is a no-op on POSIX. To
  // exhaustively test the win32 path, the predicate would need to
  // accept the `path` module as a parameter — over-engineering for a
  // defensive feature consumers don't currently exercise.
});
