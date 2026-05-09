/**
 * `check:dist-parity` — assert the committed `dist/` tree matches the
 * `tsc` output of the current `src/` tree.
 *
 * This is the gate that turns the committed-`dist/` convention from
 * "trust the author ran `npm run build`" into "CI rejects PRs where
 * `dist/` drifts from `src/`". Without this gate, a contributor can
 * edit one and forget the other; with it, the diff a reviewer sees
 * is guaranteed to be the JavaScript that ships.
 *
 * Mechanism:
 *   1. Run `tsc` (writes to `dist/`).
 *   2. Run `git diff --exit-code dist/`. Exit 0 = parity; exit 1 =
 *      drift, with the unified diff on stdout for the reviewer.
 *
 * Wired into `check:all` per the cycle-005 PR-A3.7 iter-2 bridge
 * disposition of F5 (dist/ committed without enforced parity gate).
 *
 * @see CONTRIBUTING.md — "Build artifacts (dist/) policy"
 */
import { execSync } from 'node:child_process';

function run(cmd: string): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

console.log('[check:dist-parity] Running tsc (writes dist/)...');
const build = run('npx tsc');
if (build.code !== 0) {
  console.error('[check:dist-parity] tsc failed:');
  console.error(build.stdout);
  console.error(build.stderr);
  process.exit(build.code);
}

console.log('[check:dist-parity] Comparing committed dist/ against tsc output...');
const diff = run('git diff --exit-code -- dist/');
if (diff.code !== 0) {
  console.error(
    '[check:dist-parity] FAIL: committed dist/ does not match tsc output.\n' +
      'Either run `npm run build` and commit the result, or check that ' +
      '`src/` was edited without rebuilding.\n\n' +
      'Drift summary:',
  );
  console.error(diff.stdout);
  process.exit(1);
}
console.log('[check:dist-parity] OK: dist/ tree is byte-identical to tsc output.');
