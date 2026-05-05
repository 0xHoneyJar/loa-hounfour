/**
 * Cross-Runner Sweep Driver
 *
 * Sweeps the v8.4.0 vector subtrees against the TypeScript reference
 * implementation and emits a normalized JSON manifest of (schema, vector_path,
 * result) entries that other-language runners (Go, Python, Rust) can be
 * compared against per SDD section 5.7 cross-runner contract.
 *
 * Sister script: `scripts/cross-runner-format.ts` normalizes vitest output
 * for the TS-via-vitest path. This driver complements that path by walking
 * the per-file vector directories introduced in v8.4.0 (SDD section 7.3 vector
 * authoring pattern: `vectors/<SchemaName>/{valid,invalid}/<case>.json`).
 *
 * Usage:
 *   npx tsx scripts/cross-runner.ts                 # full sweep, exit 1 on divergence
 *   npx tsx scripts/cross-runner.ts --emit-manifest # write JSON to stdout, exit 0
 *
 * Output (JSON array):
 *   [
 *     { "schema": "PanelDecisionArtifact", "vector": "valid/canonical-001-tool-output.json", "result": "pass" },
 *     { "schema": "PanelVerdict",          "vector": "invalid/pv-1-bucket-verdict-mismatch.json", "result": "pass-constraint-level" },
 *     ...
 *   ]
 *
 * Cross-runner authors (Go / Python / Rust) consume the manifest by:
 *   1. Running the TS sweep: `npx tsx scripts/cross-runner.ts --emit-manifest > ts.json`
 *   2. Running the language-native sweep (each runner produces same shape).
 *   3. Diffing: `diff <(jq -S . ts.json) <(jq -S . go.json)`. Per SDD section 6.5,
 *      `code + path + context` must be byte-identical; `message` is excluded.
 *
 * @see SDD section 5.7 — Cross-Language Runner Contract
 * @see SDD section 7.3 — Vector authoring pattern
 * @see Sprint 5 / D5.9
 */
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PanelDecisionArtifactSchema } from '../src/governance/panel-decision-artifact.js';
import { PanelVerdictSchema } from '../src/governance/panel-verdict.js';
import { DeliberationDissentSchema } from '../src/governance/deliberation-dissent.js';
import { CrossScoreReportSchema } from '../src/governance/cross-score-report.js';
import { OrgIdentitySchema } from '../src/governance/org-identity.js';
import { OrgRepresentativeDelegationSchema } from '../src/governance/org-representative-delegation.js';
import { SuccessionPolicySchema } from '../src/governance/succession-policy.js';
import { evaluateIsValidDag, extractPath } from '../src/constraints/is-valid-dag.js';
import '../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const VECTORS_ROOT = join(REPO_ROOT, 'vectors');

const SCHEMAS = {
  PanelDecisionArtifact: PanelDecisionArtifactSchema,
  PanelVerdict: PanelVerdictSchema,
  DeliberationDissent: DeliberationDissentSchema,
  CrossScoreReport: CrossScoreReportSchema,
  OrgIdentity: OrgIdentitySchema,
  OrgRepresentativeDelegation: OrgRepresentativeDelegationSchema,
  SuccessionPolicy: SuccessionPolicySchema,
} as const;

// Re-export the canonical constraint-level invalid set so this driver and
// tests/vectors/v840-governance-vectors.test.ts share one source of truth
// (resolves bridge iter-1 F8 — DRY across the two consumers).
import { CONSTRAINT_LEVEL_INVALIDS } from '../tests/vectors/v840-constraint-level-invalids.js';

interface ManifestEntry {
  schema: string;
  vector: string;
  expected: 'valid' | 'invalid';
  result: 'pass' | 'fail' | 'pass-constraint-level';
  diagnostic?: { code: string; path: string };
}

const manifest: ManifestEntry[] = [];

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.trace.json')).sort();
}

// -----------------------------------------------------------------------
// Schema vectors: vectors/<Schema>/{valid,invalid}/*.json
// -----------------------------------------------------------------------
for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
  for (const validity of ['valid', 'invalid'] as const) {
    const dir = join(VECTORS_ROOT, schemaName, validity);
    for (const f of listJsonFiles(dir)) {
      const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const ok = Value.Check(schema, data);
      // F-001: `expected` is the manifest contract; keep it a string literal
      // so cross-language consumers parse the manifest into a discriminated
      // union without polymorphism. `okMatchesExpected` is the local boolean.
      const expected: 'valid' | 'invalid' = validity;
      const okMatchesExpected = ok === (validity === 'valid');
      const key = `${schemaName}/${validity}/${f}`;
      let result: ManifestEntry['result'];
      if (CONSTRAINT_LEVEL_INVALIDS.has(key)) {
        result = ok ? 'pass-constraint-level' : 'fail';
      } else {
        result = okMatchesExpected ? 'pass' : 'fail';
      }
      manifest.push({ schema: schemaName, vector: `${validity}/${f}`, expected, result });
    }
  }
}

// -----------------------------------------------------------------------
// is-valid-dag corpus: vectors/is-valid-dag/{valid,invalid}/*.json
// -----------------------------------------------------------------------
for (const validity of ['valid', 'invalid'] as const) {
  const dir = join(VECTORS_ROOT, 'is-valid-dag', validity);
  for (const f of listJsonFiles(dir)) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const result = evaluateIsValidDag(data.items, data.id_field, data.ref_fields ?? []);
    const expected: 'valid' | 'invalid' = validity;
    const okMatches = result.valid === (validity === 'valid');
    manifest.push({
      schema: 'is_valid_dag',
      vector: `${validity}/${f}`,
      expected,
      result: okMatches ? 'pass' : 'fail',
      diagnostic: result.valid ? undefined : { code: result.diagnostic.code, path: result.diagnostic.path },
    });
  }
}

// -----------------------------------------------------------------------
// extract-path corpus: vectors/extract-path/{valid,invalid}/*.json
// -----------------------------------------------------------------------
for (const validity of ['valid', 'invalid'] as const) {
  const dir = join(VECTORS_ROOT, 'extract-path', validity);
  for (const f of listJsonFiles(dir)) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      input: unknown;
      path: string;
      expected_status: 'extracted' | 'undefined' | 'rejected';
      expected_value?: unknown;
    };
    const out = extractPath(data.input, data.path);
    let pass: boolean;
    if (data.expected_status === 'extracted') pass = out === data.expected_value;
    else pass = out === undefined;
    const expected: 'valid' | 'invalid' = validity;
    manifest.push({
      schema: 'extract_path',
      vector: `${validity}/${f}`,
      expected,
      result: pass ? 'pass' : 'fail',
    });
  }
}

// -----------------------------------------------------------------------
// signing/ed25519-pattern: pattern recognition only (no crypto per NF-1)
// F-003: pattern is read from a vector file; wrap RegExp construction in
// a try-catch + bound the source length so a malformed-pattern fixture
// fails the entry instead of crashing the sweep.
// -----------------------------------------------------------------------
const MAX_PATTERN_LEN = 1024;

function safeMatch(pattern: string, value: string): { ok: boolean; reason?: string } {
  if (pattern.length > MAX_PATTERN_LEN) return { ok: false, reason: 'pattern-too-long' };
  try {
    return { ok: new RegExp(pattern).test(value) };
  } catch (err) {
    return { ok: false, reason: `regex-compile-error:${(err as Error).message}` };
  }
}

for (const validity of ['valid', 'invalid'] as const) {
  const dir = join(VECTORS_ROOT, 'signing', 'ed25519-pattern', validity);
  for (const f of listJsonFiles(dir)) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      value: string;
      pattern: string;
      expected_match: boolean;
    };
    const { ok: matched, reason } = safeMatch(data.pattern, data.value);
    const pass = matched === data.expected_match;
    const expected: 'valid' | 'invalid' = data.expected_match ? 'valid' : 'invalid';
    manifest.push({
      schema: 'ed25519_pattern',
      vector: `${validity}/${f}`,
      expected,
      result: pass ? 'pass' : 'fail',
      ...(reason ? { diagnostic: { code: 'PATTERN_COMPILE_FAILURE', path: `$.pattern` } } : {}),
    });
  }
}

// -----------------------------------------------------------------------
// signing/contract-version-binding: semver pattern recognition (F-002)
// Fixtures with `value`+`expected_match` exercise the schema-layer pattern
// `^[1-9][0-9]*\.[0-9]+\.[0-9]+$`. Envelope-shape fixtures (with
// `envelope.signing_context.contract_version`) compare outer vs inner
// version pinning; for those, the manifest records the equality result.
// -----------------------------------------------------------------------
const SEMVER_PATTERN = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
for (const validity of ['valid', 'invalid'] as const) {
  const dir = join(VECTORS_ROOT, 'signing', 'contract-version-binding', validity);
  for (const f of listJsonFiles(dir)) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      value?: string;
      envelope?: { signing_context: { contract_version: string }; contract_version: string };
      expected_match: boolean;
    };
    let matched: boolean;
    if (typeof data.value === 'string') {
      matched = SEMVER_PATTERN.test(data.value);
    } else if (data.envelope) {
      matched = data.envelope.signing_context.contract_version === data.envelope.contract_version;
    } else {
      matched = false;
    }
    const pass = matched === data.expected_match;
    const expected: 'valid' | 'invalid' = data.expected_match ? 'valid' : 'invalid';
    manifest.push({
      schema: 'contract_version_binding',
      vector: `${validity}/${f}`,
      expected,
      result: pass ? 'pass' : 'fail',
    });
  }
}

// -----------------------------------------------------------------------
// Output + exit
// -----------------------------------------------------------------------
const args = process.argv.slice(2);
const emitManifest = args.includes('--emit-manifest');

if (emitManifest) {
  console.log(JSON.stringify(manifest, null, 2));
  process.exit(0);
}

const failures = manifest.filter((m) => m.result === 'fail');
const counts = manifest.reduce<Record<string, number>>((acc, m) => {
  acc[m.result] = (acc[m.result] ?? 0) + 1;
  return acc;
}, {});

console.log(`Cross-runner sweep over v8.4.0 vector subtrees:`);
console.log(`  Total: ${manifest.length}`);
for (const [k, v] of Object.entries(counts)) {
  console.log(`  ${k}: ${v}`);
}

if (failures.length > 0) {
  console.error(`\nFAILURES:`);
  for (const f of failures.slice(0, 20)) {
    console.error(`  ${f.schema}/${f.vector}: expected=${f.expected} result=${f.result}`);
  }
  if (failures.length > 20) {
    console.error(`  ...and ${failures.length - 20} more`);
  }
  process.exit(1);
}

console.log(`\nAll ${manifest.length} entries pass the TS reference sweep.`);
console.log(`Cross-language runners (Go / Python / Rust) MUST produce a manifest`);
console.log(`with byte-identical (schema, vector, result, diagnostic.code, diagnostic.path)`);
console.log(`tuples per SDD section 6.5 normative comparison rule.`);
