#!/usr/bin/env tsx
/**
 * Vector-authoring helper. Creates a skeleton fixture file under
 * `vectors/<Schema>/<intent>/<case>.json` and records its
 * `validation_layer` annotation in `vectors/<Schema>/_meta.json`.
 *
 * Usage:
 *   npm run author:vector -- --schema PanelVerdict --intent valid --case minimal
 *   npm run author:vector -- --schema PanelVerdict --intent invalid --case missing-bucket --layer shape
 *
 * Flags:
 *   --schema <name>           PascalCase $id of the schema (required)
 *   --intent <valid|invalid>  Direction of the fixture (required)
 *   --case <slug>             Hyphenated case name (required)
 *   --layer <layer>           Validation layer this fixture exercises:
 *                             'shape' | 'shape+constraint' | 'shape+constraint+manifest'
 *                             (default: 'shape+constraint')
 *   --description <text>      Human-readable rationale, recorded in _meta.json
 *   --force                   Overwrite an existing fixture file
 *
 * The skeleton file contains an explicit `__TODO__` marker so authors
 * cannot accidentally land an empty fixture; the round-trip / vector
 * conformance suites reject it on first run. Replace the body with the
 * actual fixture content before committing.
 *
 * @since v8.5.0 (PR-A2.1; per Eileen `validation_layer` discipline)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ValidationLayer = 'shape' | 'shape+constraint' | 'shape+constraint+manifest';

interface FixtureMetaEntry {
  case: string;
  intent: 'valid' | 'invalid';
  validation_layer: ValidationLayer;
  description?: string;
  authored_at: string;
}

interface SchemaMeta {
  schema: string;
  fixtures: FixtureMetaEntry[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const vectorsDir = join(repoRoot, 'vectors');

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function fail(msg: string): never {
  console.error(`author-vectors: ${msg}`);
  process.exit(1);
}

function isValidationLayer(s: unknown): s is ValidationLayer {
  return s === 'shape' || s === 'shape+constraint' || s === 'shape+constraint+manifest';
}

function loadSchemaMeta(metaPath: string, schema: string): SchemaMeta {
  if (!existsSync(metaPath)) {
    return { schema, fixtures: [] };
  }
  const raw = readFileSync(metaPath, 'utf-8');
  const parsed = JSON.parse(raw) as SchemaMeta;
  if (parsed.schema !== schema) {
    fail(`_meta.json schema mismatch: file says "${parsed.schema}", flag says "${schema}"`);
  }
  if (!Array.isArray(parsed.fixtures)) {
    parsed.fixtures = [];
  }
  return parsed;
}

function writeSchemaMeta(metaPath: string, meta: SchemaMeta): void {
  meta.fixtures.sort((a, b) => {
    if (a.intent !== b.intent) return a.intent === 'valid' ? -1 : 1;
    return a.case.localeCompare(b.case);
  });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
}

function makeSkeleton(schema: string, intent: 'valid' | 'invalid', caseName: string): unknown {
  return {
    __TODO__: `Replace with a real ${schema} fixture body. Intent: ${intent}; case: ${caseName}.`,
    __schema__: schema,
    __intent__: intent,
    __case__: caseName,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const schema = args.schema;
  const intent = args.intent;
  const caseName = args.case;
  const layerArg = args.layer ?? 'shape+constraint';
  const description = typeof args.description === 'string' ? args.description : undefined;
  const force = args.force === true;

  if (typeof schema !== 'string' || !/^[A-Z][A-Za-z0-9]*$/.test(schema)) {
    fail('--schema <PascalCaseName> is required');
  }
  if (intent !== 'valid' && intent !== 'invalid') {
    fail('--intent must be "valid" or "invalid"');
  }
  if (typeof caseName !== 'string' || !/^[a-z][a-z0-9-]*$/.test(caseName)) {
    fail('--case <kebab-case-slug> is required (lowercase, hyphenated)');
  }
  if (!isValidationLayer(layerArg)) {
    fail(
      `--layer must be one of: 'shape' | 'shape+constraint' | 'shape+constraint+manifest' ` +
        `(got "${String(layerArg)}")`,
    );
  }

  const schemaDir = join(vectorsDir, schema);
  const intentDir = join(schemaDir, intent);
  const fixturePath = join(intentDir, `${caseName}.json`);
  const metaPath = join(schemaDir, '_meta.json');

  mkdirSync(intentDir, { recursive: true });

  if (existsSync(fixturePath) && !force) {
    fail(`fixture already exists: ${fixturePath} (pass --force to overwrite)`);
  }

  const skeleton = makeSkeleton(schema, intent, caseName);
  writeFileSync(fixturePath, JSON.stringify(skeleton, null, 2) + '\n');

  const meta = loadSchemaMeta(metaPath, schema);
  const existing = meta.fixtures.findIndex(
    (f) => f.case === caseName && f.intent === intent,
  );
  const entry: FixtureMetaEntry = {
    case: caseName,
    intent,
    validation_layer: layerArg,
    ...(description ? { description } : {}),
    authored_at: new Date().toISOString(),
  };
  if (existing >= 0) {
    meta.fixtures[existing] = entry;
  } else {
    meta.fixtures.push(entry);
  }
  writeSchemaMeta(metaPath, meta);

  console.log(`Wrote ${fixturePath}`);
  console.log(`Updated ${metaPath}`);
  console.log(`Replace the __TODO__ stub with a real fixture body before committing.`);
}

main();
