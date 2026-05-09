/**
 * PR-A3.9 (FR-A2) — SSOT contract tests for the cross-language
 * runner harness.
 *
 * iter-3 F001 + F012 mitigation. Two assertions:
 *
 *   1. The shared `vectors/runners/_shared/rfc3339-utc-pattern.txt`
 *      regex matches TypeBox's `ISO8601_UTC_PATTERN` exactly (modulo
 *      whitespace). A drift between the SSOT regex and the schema
 *      module's pattern would silently break cross-runner parity on
 *      the format-checker tier — the SSOT and TypeBox MUST agree.
 *
 *   2. Each cross-language runner's hand-maintained schema registry
 *      (Python list, Go slice, Rust array) must match the TS
 *      reference's SCHEMAS dict in shape (name, versionPath,
 *      buckets). Drift between any two runners is a parity-contract
 *      violation; this test surfaces it at vitest time rather than
 *      at the harness's diff stage.
 *
 * Both assertions guard the SSOT discipline established in iter-3.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ISO8601_UTC_PATTERN } from '../../src/utilities/iso8601-utc-pattern.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const SHARED_DIR = join(REPO_ROOT, 'vectors', 'runners', '_shared');

describe('cross-runner SSOT regex parity (FR-A2 / PR-A3.9 iter-3 F001)', () => {
  it('vectors/runners/_shared/rfc3339-utc-pattern.txt matches TypeBox ISO8601_UTC_PATTERN', () => {
    const sharedPattern = readFileSync(
      join(SHARED_DIR, 'rfc3339-utc-pattern.txt'),
      'utf8',
    ).trim();
    expect(sharedPattern).toBe(ISO8601_UTC_PATTERN);
  });

  it('parity-protocol-version.txt is a parseable semver triple', () => {
    const v = readFileSync(
      join(SHARED_DIR, 'parity-protocol-version.txt'),
      'utf8',
    ).trim();
    expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('cross-runner schema-registry drift detector (FR-A2 / PR-A3.9 iter-3 F012)', () => {
  // Each runner's source file holds a per-runtime schema registry.
  // The TS reference is the AT-1 golden corpus; runners that diverge
  // from its (name, versionPath, buckets) shape break parity.
  // This test parses each runner's source file and asserts the same
  // (name, versionPath, buckets) ordered triple sequence.

  function tsRegistryEntries(): Array<{
    name: string;
    versionPath: string | null;
    buckets: string[];
  }> {
    const src = readFileSync(join(REPO_ROOT, 'scripts', 'cross-runner.ts'), 'utf8');
    const start = src.indexOf('const SCHEMAS: Record<string, SchemaRegistration> = {');
    const end = src.indexOf('};', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end);
    const out: Array<{ name: string; versionPath: string | null; buckets: string[] }> = [];
    // Match each `Name: { schema: ..., versionPath: '<v>' | null, ... },`
    // skipping commented-out lines.
    const lineRe = /^\s*(\w+):\s*\{[^}]*versionPath:\s*('[^']*'|null)([^}]*?)\}/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(body)) !== null) {
      // Skip if the line is preceded by a `//` comment marker
      // (deferred entries).
      const lineStart = body.lastIndexOf('\n', m.index) + 1;
      const lineToMatch = body.slice(lineStart, m.index + m[0].length);
      if (/^\s*\/\//.test(lineToMatch)) continue;
      const name = m[1];
      const versionPath = m[2] === 'null' ? null : m[2].slice(1, -1);
      const bucketsMatch = /buckets:\s*\[([^\]]*)\]/.exec(m[3]);
      const buckets = bucketsMatch
        ? bucketsMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean)
        : ['valid', 'invalid'];
      out.push({ name, versionPath, buckets });
    }
    return out;
  }

  function pythonRegistryEntries(): Array<{
    name: string;
    versionPath: string | null;
    buckets: string[];
  }> {
    const src = readFileSync(
      join(REPO_ROOT, 'vectors', 'runners', 'python', 'cross_runner.py'),
      'utf8',
    );
    const start = src.indexOf('SCHEMAS:');
    const end = src.indexOf('\n]', start) + 2;
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start, end);
    const out: Array<{ name: string; versionPath: string | null; buckets: string[] }> = [];
    const lineRe = /^\s*\(\s*"(\w+)",\s*(None|"[^"]*"),\s*\(([^)]*)\)\s*\)/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(body)) !== null) {
      const lineStart = body.lastIndexOf('\n', m.index) + 1;
      const lineToMatch = body.slice(lineStart, m.index + 1);
      if (/^\s*#/.test(lineToMatch)) continue;
      const name = m[1];
      const versionPath = m[2] === 'None' ? null : m[2].slice(1, -1);
      const buckets = m[3]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      out.push({ name, versionPath, buckets });
    }
    return out;
  }

  function goRegistryEntries(): Array<{
    name: string;
    versionPath: string | null;
    buckets: string[];
  }> {
    const src = readFileSync(
      join(REPO_ROOT, 'vectors', 'runners', 'go', 'cmd', 'cross-runner', 'main.go'),
      'utf8',
    );
    const start = src.indexOf('var Schemas = []SchemaReg{');
    const end = src.indexOf('\n}', start) + 2;
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start, end);
    const out: Array<{ name: string; versionPath: string | null; buckets: string[] }> = [];
    const lineRe = /^\s*\{\s*"(\w+)",\s*"([^"]*)",\s*\[\]string\{([^}]*)\}/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(body)) !== null) {
      const lineStart = body.lastIndexOf('\n', m.index) + 1;
      const lineToMatch = body.slice(lineStart, m.index + 1);
      if (/^\s*\/\//.test(lineToMatch)) continue;
      const name = m[1];
      const versionPath = m[2] === '' ? null : m[2];
      const buckets = m[3]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      out.push({ name, versionPath, buckets });
    }
    return out;
  }

  function rustRegistryEntries(): Array<{
    name: string;
    versionPath: string | null;
    buckets: string[];
  }> {
    const src = readFileSync(
      join(REPO_ROOT, 'vectors', 'runners', 'rust', 'src', 'bin', 'cross-runner.rs'),
      'utf8',
    );
    const start = src.indexOf('const SCHEMAS:');
    const end = src.indexOf('\n];', start) + 3;
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start, end);
    const out: Array<{ name: string; versionPath: string | null; buckets: string[] }> = [];
    const lineRe = /SchemaReg\s*\{\s*name:\s*"(\w+)"\s*,\s*version_path:\s*(None|Some\("[^"]*"\))\s*,\s*buckets:\s*&\[([^\]]*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(body)) !== null) {
      const lineStart = body.lastIndexOf('\n', m.index) + 1;
      const lineToMatch = body.slice(lineStart, m.index + 12);
      if (/^\s*\/\//.test(lineToMatch)) continue;
      const name = m[1];
      let versionPath: string | null;
      if (m[2] === 'None') {
        versionPath = null;
      } else {
        const inner = /Some\("([^"]*)"\)/.exec(m[2]);
        versionPath = inner ? inner[1] : null;
      }
      const buckets = m[3]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      out.push({ name, versionPath, buckets });
    }
    return out;
  }

  it('TS reference SCHEMAS dict parses to ≥10 active schema entries', () => {
    const ts = tsRegistryEntries();
    expect(ts.length).toBeGreaterThanOrEqual(10);
  });

  it('Python registry matches TS reference (name, versionPath, buckets)', () => {
    const ts = tsRegistryEntries();
    const py = pythonRegistryEntries();
    expect(py).toEqual(ts);
  });

  it('Go registry matches TS reference (name, versionPath, buckets)', () => {
    const ts = tsRegistryEntries();
    const go = goRegistryEntries();
    expect(go).toEqual(ts);
  });

  it('Rust registry matches TS reference (name, versionPath, buckets)', () => {
    const ts = tsRegistryEntries();
    const rust = rustRegistryEntries();
    expect(rust).toEqual(ts);
  });
});
