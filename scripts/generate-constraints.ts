/**
 * Constraint file validation script.
 *
 * Validates that constraint files in constraints/ match the TypeScript
 * cross-field validator registry:
 * - Every registered schema has a corresponding constraint file
 * - Every constraint file references a registered schema
 * - Each constraint file has valid structure
 *
 * Usage: npx tsx scripts/generate-constraints.ts --validate
 *
 * @see FR-4 v4.6.0 — Cross-Language Constraints
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCrossFieldValidatorSchemas } from '../src/validators/index.js';
import type { ConstraintFile } from '../src/constraints/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const constraintsDir = join(__dirname, '..', 'constraints');

function validate(): boolean {
  const registeredSchemas = getCrossFieldValidatorSchemas();
  let success = true;

  // Read all constraint files
  const constraintFiles = readdirSync(constraintsDir)
    .filter((f) => f.endsWith('.constraints.json'));

  const constraintSchemaIds = new Set<string>();

  // Validate each constraint file structure
  for (const file of constraintFiles) {
    const filePath = join(constraintsDir, file);
    const content = readFileSync(filePath, 'utf-8');
    let parsed: ConstraintFile;

    try {
      parsed = JSON.parse(content) as ConstraintFile;
    } catch (e) {
      console.error(`FAIL: ${file} — invalid JSON: ${e}`);
      success = false;
      continue;
    }

    // Validate required fields
    if (!parsed.$schema) {
      console.error(`FAIL: ${file} — missing $schema`);
      success = false;
    }
    if (!parsed.schema_id) {
      console.error(`FAIL: ${file} — missing schema_id`);
      success = false;
      continue;
    }
    if (!parsed.contract_version) {
      console.error(`FAIL: ${file} — missing contract_version`);
      success = false;
    }
    if (!Array.isArray(parsed.constraints)) {
      console.error(`FAIL: ${file} — missing or invalid constraints array`);
      success = false;
      continue;
    }

    // Validate each constraint
    for (const constraint of parsed.constraints) {
      if (!constraint.id) {
        console.error(`FAIL: ${file} — constraint missing id`);
        success = false;
      }
      if (!constraint.expression) {
        console.error(`FAIL: ${file} — constraint ${constraint.id} missing expression`);
        success = false;
      }
      if (!constraint.severity || !['error', 'warning'].includes(constraint.severity)) {
        console.error(`FAIL: ${file} — constraint ${constraint.id} invalid severity`);
        success = false;
      }
      if (!constraint.message) {
        console.error(`FAIL: ${file} — constraint ${constraint.id} missing message`);
        success = false;
      }
      if (!Array.isArray(constraint.fields) || constraint.fields.length === 0) {
        console.error(`FAIL: ${file} — constraint ${constraint.id} missing or empty fields`);
        success = false;
      }
    }

    // Validate filename matches schema_id
    const expectedFile = `${parsed.schema_id}.constraints.json`;
    if (file !== expectedFile) {
      console.error(`FAIL: ${file} — filename does not match schema_id "${parsed.schema_id}" (expected ${expectedFile})`);
      success = false;
    }

    constraintSchemaIds.add(parsed.schema_id);
    console.log(`OK: ${file} — ${parsed.constraints.length} constraints`);
  }

  // Check coverage: every registered schema has a constraint file
  for (const schemaId of registeredSchemas) {
    if (!constraintSchemaIds.has(schemaId)) {
      console.error(`FAIL: registered schema "${schemaId}" has no constraint file`);
      success = false;
    }
  }

  // Check reverse: every constraint file references a registered schema
  for (const schemaId of constraintSchemaIds) {
    if (!registeredSchemas.includes(schemaId)) {
      console.error(`FAIL: constraint file for "${schemaId}" does not match any registered schema`);
      success = false;
    }
  }

  // Summary
  console.log('');
  console.log(`Registered schemas: ${registeredSchemas.length}`);
  console.log(`Constraint files: ${constraintFiles.length}`);
  console.log(`Coverage: ${constraintSchemaIds.size}/${registeredSchemas.length}`);

  return success;
}

// CLI entry point
const args = process.argv.slice(2);
if (args.includes('--validate')) {
  const ok = validate();
  process.exit(ok ? 0 : 1);
} else {
  console.log('Usage: npx tsx scripts/generate-constraints.ts --validate');
  process.exit(1);
}
