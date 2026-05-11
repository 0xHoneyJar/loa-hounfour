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
import type { TSchema } from '@sinclair/typebox';
import { PanelDecisionArtifactSchema } from '../src/governance/panel-decision-artifact.js';
import { PanelVerdictSchema } from '../src/governance/panel-verdict.js';
import { DeliberationDissentSchema } from '../src/governance/deliberation-dissent.js';
import { CrossScoreReportSchema } from '../src/governance/cross-score-report.js';
import { OrgIdentitySchema } from '../src/governance/org-identity.js';
import { OrgRepresentativeDelegationSchema } from '../src/governance/org-representative-delegation.js';
import { SuccessionPolicySchema } from '../src/governance/succession-policy.js';
// PR-A3.9 (FR-A2) — v8.6.0 cycle-005 cluster cross-runner coverage.
import { PhaseCompletionEnvelopeSchema } from '../src/integrity/phase-completion-envelope.js';
import { OracleDigestSchema } from '../src/operations/oracle-digest.js';
import { EpicCheckpointSchema } from '../src/operations/epic-checkpoint.js';
import { PlanSignoffEnvelopeSchema } from '../src/governance/plan-signoff-envelope.js';
import { PlanAmendmentRequestSchema } from '../src/governance/plan-amendment-request.js';
import { ChallengeSchema } from '../src/governance/challenge.js';
import { CanonicalRunSchema } from '../src/canonical/canonical-run.js';
import { ClusterRunSeriesSchema } from '../src/canonical/cluster-run-series.js';
import { InterSeriesScopingArtifactSchema } from '../src/canonical/inter-series-scoping-artifact.js';
import { evaluateIsValidDag, extractPath } from '../src/constraints/is-valid-dag.js';
import '../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const VECTORS_ROOT = join(REPO_ROOT, 'vectors');

/**
 * Cross-runner schema registry. Each entry declares the schema's
 * vector path layout:
 *
 *   - `versionPath: null` — flat layout `vectors/<Schema>/{valid,invalid}/`
 *     (v8.4.0 substrate; introduced in PR-A3.9 baseline).
 *   - `versionPath: 'v8.6.0'` — versioned layout
 *     `vectors/<Schema>/v8.6.0/{valid,invalid,boundary,invalid-cross-field}/`
 *     (v8.6.0 cycle-005 cluster; introduced PR-A3.4..A3.8).
 *
 * Cross-language runners (Python / Go / Rust under `vectors/runners/`)
 * mirror this registry by-convention — each runner's schema list is
 * a hand-maintained translation of this dict. (Iter-2 7649d21c
 * disposition: a generated `vectors/runners/registry.json` SSOT is a
 * v8.7.0 follow-up — at v8.6.0 the registry shape stays per-runtime
 * because Go / Rust embed schema-name → schema-file mapping in
 * native syntax that doesn't trivially cross-compile from JSON.)
 * The TS reference is the golden corpus per AT-1; runners diff
 * against this output.
 *
 * @since v8.6.0 — PR-A3.9 (FR-A2) — version-path support + v8.6.0 cluster.
 */
interface SchemaRegistration {
  schema: TSchema;
  versionPath: string | null;
  /** Validity buckets to walk. Defaults to `['valid', 'invalid']`; a
   * schema with cross-field-only invalids (e.g., CanonicalRun under
   * direct-invocation) ALSO walks `'invalid-cross-field'` so the
   * cross-runner manifest includes those entries with a special
   * `'pass-cross-field-deferred'` result label (cross-language
   * structural validators report `valid` on the structural tier;
   * the cross-field tier rejection is consumer-side per ADR-010).
   */
  buckets?: ReadonlyArray<'valid' | 'invalid' | 'invalid-cross-field' | 'boundary'>;
}

const SCHEMAS: Record<string, SchemaRegistration> = {
  // v8.4.0 substrate — flat layout.
  PanelDecisionArtifact: { schema: PanelDecisionArtifactSchema, versionPath: null },
  PanelVerdict: { schema: PanelVerdictSchema, versionPath: null },
  DeliberationDissent: { schema: DeliberationDissentSchema, versionPath: null },
  CrossScoreReport: { schema: CrossScoreReportSchema, versionPath: null },
  OrgIdentity: { schema: OrgIdentitySchema, versionPath: null },
  OrgRepresentativeDelegation: { schema: OrgRepresentativeDelegationSchema, versionPath: null },
  SuccessionPolicy: { schema: SuccessionPolicySchema, versionPath: null },
  // v8.6.0 cycle-005 cluster — versioned layout.
  // PhaseCompletionEnvelope deferred from PR-A3.9 cross-runner sweep:
  // the on-disk fixture corpus mixes Tier-1 (`phase_completion_tier1`)
  // and Tier-2 (`phase_completion`) envelope shapes in the same
  // `valid/` directory (e.g. canonical-010-tier1-only-shape.json
  // contains only the Tier-1 ingestion). Validating Tier-1 fixtures
  // against PhaseCompletionEnvelopeSchema (Tier-2) produces structural
  // failures that are not real divergences. Routing requires either a
  // discriminator-based runtime selector (envelope_kind →
  // Tier-1-vs-Tier-2 schema) or a fixture-corpus split into separate
  // PhaseCompletionEnvelopeTier1/ vs PhaseCompletionEnvelope/
  // directories. Both are v8.7.0 follow-up scope; this PR (FR-A2)
  // ships cross-runner coverage for the 6 v8.6.0 schemas without
  // tier-routing ambiguity.
  // PhaseCompletionEnvelope: { schema: PhaseCompletionEnvelopeSchema, versionPath: 'v8.6.0' },
  OracleDigest: { schema: OracleDigestSchema, versionPath: 'v8.6.0' },
  EpicCheckpoint: { schema: EpicCheckpointSchema, versionPath: 'v8.6.0' },
  PlanSignoffEnvelope: { schema: PlanSignoffEnvelopeSchema, versionPath: 'v8.6.0' },
  PlanAmendmentRequest: { schema: PlanAmendmentRequestSchema, versionPath: 'v8.6.0' },
  Challenge: { schema: ChallengeSchema, versionPath: 'v8.6.0' },
  CanonicalRun: {
    schema: CanonicalRunSchema,
    versionPath: 'v8.6.0',
    buckets: ['valid', 'invalid', 'invalid-cross-field'],
  },
  // v8.7.0 cycle-007 cluster — PR-A4.1 (FR-G1).
  ClusterRunSeries: {
    schema: ClusterRunSeriesSchema,
    versionPath: 'v8.7.0',
    buckets: ['valid', 'invalid', 'invalid-cross-field'],
  },
  // v8.7.0 cycle-007 cluster — PR-A4.2 (FR-G2).
  InterSeriesScopingArtifact: {
    schema: InterSeriesScopingArtifactSchema,
    versionPath: 'v8.7.0',
    buckets: ['valid', 'invalid', 'invalid-cross-field'],
  },
};

/**
 * Cross-language harness contract version. Source-of-truth lives at
 * `vectors/runners/_shared/parity-protocol-version.txt` — every
 * runner reads from there at startup. iter-2 F011 mitigation:
 * hardcoded fallbacks across multiple runners are a parity-drift
 * footgun (same root concern as F008 — three hand-rolled RFC 3339
 * regexes); the shared file is the load-bearing source.
 *
 * @since v8.6.0 — PR-A3.9 (FR-A2) iter-3.
 */
const SHARED_DIR = join(REPO_ROOT, 'vectors', 'runners', '_shared');
export const PARITY_PROTOCOL_VERSION = readFileSync(
  join(SHARED_DIR, 'parity-protocol-version.txt'),
  'utf8',
).trim();

// Constraint-level invalid set is committed metadata at
// `vectors/_meta/constraint-level-invalids.json` so consumers in any
// language read the same file (resolves bridge iter-2 F4 + F6).
// F001 iter-3: the path is computed from VECTORS_ROOT (which is itself
// derived from import.meta.url's *directory*) so symlinks and sandboxed
// builds resolve correctly without leaning on POSIX `..` tolerance for
// file-path inputs.
const CONSTRAINT_LEVEL_INVALIDS_PATH = join(VECTORS_ROOT, '_meta', 'constraint-level-invalids.json');
const CONSTRAINT_LEVEL_INVALIDS = new Set<string>(
  (JSON.parse(readFileSync(CONSTRAINT_LEVEL_INVALIDS_PATH, 'utf8')) as { fixtures: string[] }).fixtures,
);

// iter-4 F014: every entry in the constraint-level-invalid registry must
// resolve to a real fixture file, otherwise a rename would silently flip
// expected outcomes ("passes schema, fails constraint" → "must fail
// schema") with no failure surface.
{
  const missing: string[] = [];
  for (const entry of CONSTRAINT_LEVEL_INVALIDS) {
    if (!existsSync(join(VECTORS_ROOT, entry))) {
      missing.push(entry);
    }
  }
  if (missing.length > 0) {
    console.error(`FAIL: constraint-level-invalid registry references files that do not exist:`);
    for (const m of missing) console.error(`  ${m}`);
    process.exit(1);
  }
}

interface ManifestEntry {
  schema: string;
  vector: string;
  expected: 'valid' | 'invalid' | 'invalid-cross-field' | 'boundary';
  /**
   * Manifest result vocabulary:
   *   - `'pass'`: structural validator outcome matched `expected`.
   *   - `'fail'`: structural validator outcome diverged from `expected`.
   *   - `'pass-constraint-level'`: structural validator passed despite
   *     `expected: 'invalid'`; the rejection is registered at constraint
   *     level (`vectors/_meta/constraint-level-invalids.json`).
   *   - `'pass-cross-field-deferred'`: structural validator passed (as
   *     designed) on an `'invalid-cross-field'` fixture; cross-field
   *     tier rejection is consumer-side per ADR-010 (PR-A3.9 FR-A2).
   */
  result:
    | 'pass'
    | 'fail'
    | 'pass-constraint-level'
    | 'pass-cross-field-deferred';
  diagnostic?: { code: string; path: string };
}

const manifest: ManifestEntry[] = [];

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.trace.json')).sort();
}

/**
 * Read + JSON-parse a fixture file, returning a typed result that callers
 * convert into a manifest "fail" entry on parse error rather than aborting
 * the sweep (resolves bridge iter-2 F-001). One malformed fixture in one
 * subtree should not kill diagnostic signal for the rest.
 */
function readJsonFixture(path: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Canonical = recursively sorted keys, primitives in JSON form, no extraneous
 * whitespace. Cross-runner comparator must agree on insertion-order-insensitive
 * equality for object-valued payloads (resolves bridge iter-4 F001 — the
 * order-sensitive JSON.stringify path could diverge from the test suite's
 * `toEqual` deep-equality for any future object-valued extract-path fixture).
 *
 * Downstream Go / Python / Rust runners MUST implement the same canonical
 * form: sort keys lexicographically by UTF-16 code units (RFC 8785), encode
 * primitives in JSON, omit whitespace.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k])).join(',') + '}';
}

// -----------------------------------------------------------------------
// Schema vectors: vectors/<Schema>/[<versionPath>/]{valid,invalid,invalid-cross-field,boundary}/*.json
// -----------------------------------------------------------------------
for (const [schemaName, registration] of Object.entries(SCHEMAS)) {
  const { schema, versionPath } = registration;
  const buckets = registration.buckets ?? (['valid', 'invalid'] as const);
  for (const bucket of buckets) {
    const bucketParts = versionPath
      ? [schemaName, versionPath, bucket]
      : [schemaName, bucket];
    const dir = join(VECTORS_ROOT, ...bucketParts);
    // The `vector` path encoded into the manifest is RELATIVE to the
    // schema directory (`<versionPath>/<bucket>/<file>` or
    // `<bucket>/<file>` for flat layout) — cross-language runners
    // produce identical paths so manifest diffs are byte-stable.
    const vectorPathPrefix = versionPath ? `${versionPath}/${bucket}` : bucket;
    for (const f of listJsonFiles(dir)) {
      const expected: ManifestEntry['expected'] = bucket;
      const parsed = readJsonFixture(join(dir, f));
      if (!parsed.ok) {
        manifest.push({
          schema: schemaName,
          vector: `${vectorPathPrefix}/${f}`,
          expected,
          result: 'fail',
          diagnostic: { code: 'FIXTURE_PARSE_ERROR', path: '$' },
        });
        continue;
      }
      // Strip optional `_comment` field per cycle-005 vector convention
      // (cf. tests/vectors/challenge-vectors.test.ts) — cross-language
      // runners MUST do the same so manifest diff stays byte-identical.
      const data = (typeof parsed.data === 'object' && parsed.data !== null && !Array.isArray(parsed.data))
        ? (() => {
            const { _comment, ...rest } = parsed.data as Record<string, unknown>;
            void _comment;
            return rest;
          })()
        : parsed.data;
      const ok = Value.Check(schema, data);
      const key = `${schemaName}/${vectorPathPrefix}/${f}`;
      let result: ManifestEntry['result'];
      if (bucket === 'invalid-cross-field') {
        // Structural tier MUST pass these (CR-1 / cross-field rejection
        // is consumer-side per ADR-010). Cross-language runners
        // implementing structural-only validation produce the same
        // 'pass-cross-field-deferred' label so the manifest diff stays
        // byte-identical regardless of whether a runner ships the
        // cross-field tier.
        result = ok ? 'pass-cross-field-deferred' : 'fail';
      } else if (bucket === 'boundary') {
        // Boundary fixtures are structurally valid; the cross-field
        // tier surfaces the tradeoff. Treat like valid for the
        // structural diff.
        result = ok ? 'pass' : 'fail';
      } else if (CONSTRAINT_LEVEL_INVALIDS.has(key)) {
        result = ok ? 'pass-constraint-level' : 'fail';
      } else {
        const okMatchesExpected = ok === (bucket === 'valid');
        result = okMatchesExpected ? 'pass' : 'fail';
      }
      manifest.push({
        schema: schemaName,
        vector: `${vectorPathPrefix}/${f}`,
        expected,
        result,
      });
    }
  }
}

// -----------------------------------------------------------------------
// is-valid-dag corpus: vectors/is-valid-dag/{valid,invalid}/*.json
// -----------------------------------------------------------------------
for (const validity of ['valid', 'invalid'] as const) {
  const dir = join(VECTORS_ROOT, 'is-valid-dag', validity);
  for (const f of listJsonFiles(dir)) {
    const expected: 'valid' | 'invalid' = validity;
    const parsed = readJsonFixture(join(dir, f));
    if (!parsed.ok) {
      manifest.push({
        schema: 'is_valid_dag',
        vector: `${validity}/${f}`,
        expected,
        result: 'fail',
        diagnostic: { code: 'FIXTURE_PARSE_ERROR', path: '$' },
      });
      continue;
    }
    const data = parsed.data as { items: unknown[]; id_field: string; ref_fields?: string[] };
    const result = evaluateIsValidDag(data.items, data.id_field, data.ref_fields ?? []);

    // iter-4 F-002: enforce the trace contract from the TS reference itself.
    // Each invalid fixture has a `<base>.trace.json` companion declaring the
    // expected diagnostic.code (per SDD section 6.5). The reference runner
    // MUST self-validate against its own published trace, otherwise the
    // contract drifts silently and other-language runners diff against a
    // moving target.
    const tracePath = join(dir, f.replace(/\.json$/, '.trace.json'));
    const traceParsed = readJsonFixture(tracePath);
    if (validity === 'invalid' && traceParsed.ok) {
      const trace = traceParsed.data as { diagnostic?: { code?: string } };
      if (trace.diagnostic?.code && (result.valid || result.diagnostic.code !== trace.diagnostic.code)) {
        manifest.push({
          schema: 'is_valid_dag',
          vector: `${validity}/${f}`,
          expected,
          result: 'fail',
          diagnostic: { code: 'TRACE_CONTRACT_VIOLATION', path: '$.diagnostic.code' },
        });
        continue;
      }
    }

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
    const expected: 'valid' | 'invalid' = validity;
    const parsed = readJsonFixture(join(dir, f));
    if (!parsed.ok) {
      manifest.push({
        schema: 'extract_path',
        vector: `${validity}/${f}`,
        expected,
        result: 'fail',
        diagnostic: { code: 'FIXTURE_PARSE_ERROR', path: '$' },
      });
      continue;
    }
    const data = parsed.data as {
      input: unknown;
      path: string;
      expected_status: 'extracted' | 'undefined' | 'rejected';
      expected_value?: unknown;
    };
    const out = extractPath(data.input, data.path);
    // iter-3 cross-runner-extract-path-strict-equality (HIGH): use canonical-
    // JSON deep equality for `extracted` cases so object/array values match
    // by structure, not reference. iter-3 F002: track the derived status
    // (extracted | undefined | rejected) on the manifest so cross-runner
    // divergence between "missing" and "rejected" semantics is visible.
    // The library returns `undefined` in both branches; we recover the
    // intent from the fixture's expected_status and emit it as the manifest
    // diagnostic for downstream comparison.
    const derivedStatus: 'extracted' | 'undefined' | 'rejected' =
      out !== undefined ? 'extracted' : data.expected_status === 'rejected' ? 'rejected' : 'undefined';
    let pass: boolean;
    if (data.expected_status === 'extracted') {
      pass = canonicalJson(out) === canonicalJson(data.expected_value);
    } else if (data.expected_status === 'undefined' || data.expected_status === 'rejected') {
      pass = out === undefined;
    } else {
      pass = false;
    }
    manifest.push({
      schema: 'extract_path',
      vector: `${validity}/${f}`,
      expected,
      result: pass ? 'pass' : 'fail',
      diagnostic: { code: `EXTRACT_PATH_STATUS_${derivedStatus.toUpperCase()}`, path: '$' },
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
    // F1 (iter-2): expected is derived from directory across every section,
    // not from `data.expected_match`. expected_match is checked against the
    // computed match result and contributes to the pass/fail verdict.
    const expected: 'valid' | 'invalid' = validity;
    const parsed = readJsonFixture(join(dir, f));
    if (!parsed.ok) {
      manifest.push({
        schema: 'ed25519_pattern',
        vector: `${validity}/${f}`,
        expected,
        result: 'fail',
        diagnostic: { code: 'FIXTURE_PARSE_ERROR', path: '$' },
      });
      continue;
    }
    const data = parsed.data as { value: string; pattern: string; expected_match: boolean };
    const { ok: matched, reason } = safeMatch(data.pattern, data.value);
    const pass = matched === data.expected_match;
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
    const expected: 'valid' | 'invalid' = validity;
    const parsed = readJsonFixture(join(dir, f));
    if (!parsed.ok) {
      manifest.push({
        schema: 'contract_version_binding',
        vector: `${validity}/${f}`,
        expected,
        result: 'fail',
        diagnostic: { code: 'FIXTURE_PARSE_ERROR', path: '$' },
      });
      continue;
    }
    const data = parsed.data as {
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
    manifest.push({
      schema: 'contract_version_binding',
      vector: `${validity}/${f}`,
      expected,
      result: pass ? 'pass' : 'fail',
    });
  }
}

// -----------------------------------------------------------------------
// Per-section non-empty guard (iter-3 cross-runner-fixture-corpus-empty-not-flagged):
// a directory rename or deletion would otherwise produce a green sweep
// with a hollowed corpus. Fail loudly with the section name on violation.
// -----------------------------------------------------------------------
const REQUIRED_SECTIONS = [
  ...Object.keys(SCHEMAS),
  'is_valid_dag',
  'extract_path',
  'ed25519_pattern',
  'contract_version_binding',
];
const sectionCounts = manifest.reduce<Record<string, number>>((acc, m) => {
  acc[m.schema] = (acc[m.schema] ?? 0) + 1;
  return acc;
}, {});
const emptySections = REQUIRED_SECTIONS.filter((s) => (sectionCounts[s] ?? 0) === 0);
if (emptySections.length > 0) {
  console.error(`FAIL: cross-runner sweep produced empty manifest sections: ${emptySections.join(', ')}`);
  console.error(`Each registered section must have at least one fixture entry.`);
  process.exit(1);
}

// iter-5 F-001 (MEDIUM): emit manifest in stably-sorted order so cross-CI
// diffs are semantic rather than driven by traversal order. The (schema,
// vector) pair is the natural primary key.
manifest.sort((a, b) => {
  if (a.schema !== b.schema) return a.schema < b.schema ? -1 : 1;
  return a.vector < b.vector ? -1 : a.vector > b.vector ? 1 : 0;
});

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
