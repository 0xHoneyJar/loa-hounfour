/**
 * Validate all generated JSON Schema files meet SchemaStore.org requirements.
 *
 * Checks:
 * 1. Every schema has $schema declaration (JSON Schema 2020-12)
 * 2. Every schema has a resolvable $id URL
 * 3. Every schema has a description
 * 4. No duplicate $id values
 *
 * @see S4-T4 — SchemaStore.org registration preparation
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(__dirname, '..', 'schemas');

const EXPECTED_SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema';

let passed = 0;
let failed = 0;
const errors: string[] = [];
const ids = new Set<string>();

function check(file: string, condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(`  ${file}: ${message}`);
  }
}

const files = readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));

console.log(`Validating ${files.length} schema files...\n`);

for (const file of files) {
  const path = join(schemasDir, file);
  const content = readFileSync(path, 'utf-8');
  let schema: Record<string, unknown>;

  try {
    schema = JSON.parse(content);
  } catch {
    failed++;
    errors.push(`  ${file}: Invalid JSON`);
    continue;
  }

  // 1. $schema declaration
  check(file, schema.$schema === EXPECTED_SCHEMA_DRAFT,
    `Missing or wrong $schema (expected ${EXPECTED_SCHEMA_DRAFT}, got ${schema.$schema})`);

  // 2. Resolvable $id URL
  const id = schema.$id as string | undefined;
  check(file, typeof id === 'string' && id.startsWith('https://'),
    `Missing or non-URL $id (got ${id})`);

  // 3. Description
  check(file, typeof schema.description === 'string' && schema.description.length > 0,
    'Missing description');

  // 4. No duplicate $id
  if (id) {
    check(file, !ids.has(id), `Duplicate $id: ${id}`);
    ids.add(id);
  }

  // 5. Has type field
  check(file, schema.type !== undefined || schema.oneOf !== undefined || schema.anyOf !== undefined,
    'Missing type, oneOf, or anyOf');

  console.log(`  ${passed > 0 && errors.filter(e => e.includes(file)).length === 0 ? '✓' : '✗'} ${file}`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} checks passed, ${failed} failed`);

if (errors.length > 0) {
  console.log('\nFailures:');
  for (const e of errors) {
    console.log(e);
  }
  process.exit(1);
}

process.exit(0);
