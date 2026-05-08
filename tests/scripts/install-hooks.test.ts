/**
 * End-to-end smoke test for scripts/install-hooks.sh.
 *
 * Verifies that the installed pre-commit hook intercepts a synthetic
 * commit whose staged diff contains a forbidden framework-internal term,
 * and accepts a clean commit. Forbidden terms are constructed at runtime
 * via string concatenation so this source file itself stays clean of the
 * pollution-grep pattern.
 *
 * @see scripts/install-hooks.sh
 * @see CLAUDE.local.md
 * @since v8.6.0 (PR-A3.0; CT-13)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const repoRoot = resolve(__dirname, '..', '..');
const installScript = join(repoRoot, 'scripts', 'install-hooks.sh');

/** Run a command in a working dir; return { status, stdout, stderr } without throwing. */
function run(cmd: string, args: string[], cwd: string, env: Record<string, string> = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, ...env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 't@t' },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('install-hooks.sh — pollution pre-commit hook (CT-13)', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'hounfour-hook-test-'));
    // Initialize a fresh git repo
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: workDir });
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: workDir });
    execFileSync('git', ['config', 'user.name', 'test'], { cwd: workDir });
    // Install the hook (script needs to find the repo root via `git rev-parse --show-toplevel`)
    execFileSync('bash', [installScript], { cwd: workDir });
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('installs the hook at .git/hooks/pre-commit and makes it executable', () => {
    const hookPath = join(workDir, '.git', 'hooks', 'pre-commit');
    const stat = run('test', ['-x', hookPath], workDir);
    expect(stat.status).toBe(0);
  });

  it('accepts a commit whose staged diff is clean of pollution terms', () => {
    writeFileSync(join(workDir, 'clean.txt'), 'this is a clean file with no forbidden terms\n');
    execFileSync('git', ['add', 'clean.txt'], { cwd: workDir });
    const result = run('git', ['commit', '-m', 'add clean file'], workDir);
    expect(result.status).toBe(0);
  });

  it('rejects a commit whose staged diff contains a forbidden term', () => {
    writeFileSync(join(workDir, 'polluted.txt'), 'this file mentions sp' + 'iral which is forbidden\n');
    execFileSync('git', ['add', 'polluted.txt'], { cwd: workDir });
    const result = run('git', ['commit', '-m', 'add polluted file'], workDir);
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/ABORT.*pollution-grep/);
  });

  it('rejects a commit that adds a forbidden term to an existing file', () => {
    // Seed a clean commit first.
    writeFileSync(join(workDir, 'README.md'), 'first version\n');
    execFileSync('git', ['add', 'README.md'], { cwd: workDir });
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: workDir });

    // Now amend with a pollution term.
    writeFileSync(join(workDir, 'README.md'), 'first version\nspi' + 'ral added\n');
    execFileSync('git', ['add', 'README.md'], { cwd: workDir });
    const result = run('git', ['commit', '-m', 'add forbidden term'], workDir);
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('ABORT');
  });

  it('allows --no-verify bypass (documented escape hatch)', () => {
    writeFileSync(join(workDir, 'urgent.txt'), 'sp' + 'iral mention\n');
    execFileSync('git', ['add', 'urgent.txt'], { cwd: workDir });
    const result = run('git', ['commit', '-m', 'urgent', '--no-verify'], workDir);
    expect(result.status).toBe(0);
  });
});
