#!/usr/bin/env tsx
/**
 * TS reference runner for the verifier conformance suite (SDD §5).
 *
 * Runs every case under vectors/verifier/ through the TS reference
 * functions. With --emit-manifest, prints a JSON array of
 * `{kind, case, result, matches_expected}` to stdout for the parity
 * harness (scripts/run-verifier-parity.sh), which diffs it against the
 * Go runner (vectors/runners/go/cmd/verifier-runner).
 *
 * Exit codes: 0 all cases match `expected`; 1 at least one mismatch.
 *
 * @since v8.8.0 (FR-C2)
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVerifierManifest } from './lib/verifier-cases.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = await buildVerifierManifest(repoRoot);
const failed = manifest.filter((e) => !e.matches_expected);

if (process.argv.includes('--emit-manifest')) {
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} else {
  for (const e of manifest) {
    process.stdout.write(`${e.matches_expected ? 'ok  ' : 'FAIL'} ${e.kind}/${e.case}\n`);
  }
}
for (const e of failed) {
  process.stderr.write(`[verifier-runner:ts] mismatch ${e.kind}/${e.case}: ${JSON.stringify(e.result)}\n`);
}
process.exit(failed.length === 0 ? 0 : 1);
