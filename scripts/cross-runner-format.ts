/**
 * Cross-Runner Format Normalizer
 *
 * Normalizes vitest JSON reporter output to a common format that can be
 * diffed against results from other language runners (Go, Python, Rust).
 *
 * Usage:
 *   tsx scripts/cross-runner-format.ts [input-file]
 *
 * If no input file is provided, reads from stdin.
 * Writes normalized JSON to stdout.
 *
 * Output format (JSON array):
 *   [
 *     { "schema_name": "billing-pipeline", "vector_file": "tests/vectors/billing-pipeline.test.ts", "result": "pass" },
 *     { "schema_name": "domain-event", "vector_file": "tests/vectors/domain-event.test.ts", "result": "fail", "errors": ["expected X to equal Y"] }
 *   ]
 *
 * Consumer CI Integration:
 *   1. Run vitest with JSON reporter:
 *      npx vitest run --reporter=json > vitest-results.json
 *
 *   2. Normalize with this script:
 *      tsx scripts/cross-runner-format.ts vitest-results.json > normalized-ts.json
 *
 *   3. Compare with other runner outputs:
 *      diff <(jq -S . normalized-ts.json) <(jq -S . normalized-go.json)
 *
 *   4. Or use in CI pipeline:
 *      tsx scripts/cross-runner-format.ts < vitest-results.json | jq '.[] | select(.result == "fail")'
 *
 * Other runners should produce the same normalized format so that a simple
 * JSON diff reveals cross-language divergence in vector test results.
 *
 * @see S6-T5 — Cross-runner format script
 */

import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single assertion result from vitest JSON output. */
interface VitestAssertionResult {
  ancestorTitles: string[];
  title: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  failureMessages?: string[];
}

/** A single test file result from vitest JSON output. */
interface VitestTestResult {
  name: string;
  status: 'passed' | 'failed';
  assertionResults: VitestAssertionResult[];
}

/** Top-level vitest JSON reporter output. */
interface VitestJsonOutput {
  testResults: VitestTestResult[];
}

/** Normalized cross-runner result entry. */
interface NormalizedResult {
  schema_name: string;
  vector_file: string;
  result: 'pass' | 'fail';
  errors?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a relative vector file path from an absolute path.
 *
 * Vitest reports absolute paths like `/home/user/project/tests/vectors/billing-pipeline.test.ts`.
 * We normalize to a relative path from the project root: `tests/vectors/billing-pipeline.test.ts`.
 */
function toRelativePath(absolutePath: string): string {
  const marker = 'tests/vectors/';
  const idx = absolutePath.indexOf(marker);
  if (idx !== -1) {
    return absolutePath.slice(idx);
  }
  // Fallback: use basename-based relative path
  const parts = absolutePath.split('/');
  const testsIdx = parts.indexOf('tests');
  if (testsIdx !== -1) {
    return parts.slice(testsIdx).join('/');
  }
  return absolutePath;
}

/**
 * Derive a schema name from a test file path.
 *
 * Strategy:
 * 1. Try to extract from the top-level describe block (ancestorTitles[0])
 *    if it looks like a schema name (lowercase, hyphenated).
 * 2. Fallback: derive from the filename by stripping `.test.ts`.
 *
 * Examples:
 *   - `billing-pipeline.test.ts` -> `billing-pipeline`
 *   - `domain-event.test.ts` -> `domain-event`
 *   - `transfer-choreography.test.ts` -> `transfer-choreography`
 */
function deriveSchemaName(filePath: string, assertionResults: VitestAssertionResult[]): string {
  // Try the first describe block title — often it is the schema name
  if (assertionResults.length > 0 && assertionResults[0].ancestorTitles.length > 0) {
    const topDescribe = assertionResults[0].ancestorTitles[0];
    // If the describe block looks like a schema identifier (e.g., "BillingEntry", "DomainEvent"),
    // convert PascalCase or camelCase to kebab-case
    const kebab = topDescribe
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();

    // Only use it if it looks like a reasonable identifier (no special chars beyond hyphens)
    if (/^[a-z][a-z0-9-]*$/.test(kebab) && kebab.length <= 60) {
      return kebab;
    }
  }

  // Fallback: derive from filename
  const basename = filePath.split('/').pop() ?? filePath;
  return basename.replace(/\.test\.(ts|js|mts|mjs)$/, '');
}

/**
 * Map vitest status to normalized result status.
 */
function mapStatus(status: string): 'pass' | 'fail' {
  return status === 'passed' ? 'pass' : 'fail';
}

/**
 * Collect error messages from failed assertion results.
 */
function collectErrors(assertionResults: VitestAssertionResult[]): string[] {
  const errors: string[] = [];
  for (const assertion of assertionResults) {
    if (assertion.status === 'failed') {
      if (assertion.failureMessages && assertion.failureMessages.length > 0) {
        errors.push(...assertion.failureMessages.map(msg => msg.trim()));
      } else {
        errors.push(`${assertion.ancestorTitles.join(' > ')} > ${assertion.title}`);
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function readInput(): string {
  const inputFile = process.argv[2];

  if (inputFile) {
    return readFileSync(inputFile, 'utf-8');
  }

  // Read from stdin
  return readFileSync(0, 'utf-8');
}

function normalize(input: VitestJsonOutput): NormalizedResult[] {
  const results: NormalizedResult[] = [];

  for (const testResult of input.testResults) {
    const vectorFile = toRelativePath(testResult.name);
    const schemaName = deriveSchemaName(vectorFile, testResult.assertionResults);
    const result = mapStatus(testResult.status);

    const entry: NormalizedResult = {
      schema_name: schemaName,
      vector_file: vectorFile,
      result,
    };

    if (result === 'fail') {
      const errors = collectErrors(testResult.assertionResults);
      if (errors.length > 0) {
        entry.errors = errors;
      }
    }

    results.push(entry);
  }

  // Sort by schema_name for deterministic output
  results.sort((a, b) => a.schema_name.localeCompare(b.schema_name));

  return results;
}

function main(): void {
  let rawInput: string;
  try {
    rawInput = readInput();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error reading input: ${message}`);
    process.exit(1);
  }

  let parsed: VitestJsonOutput;
  try {
    parsed = JSON.parse(rawInput) as VitestJsonOutput;
  } catch {
    console.error('Error: input is not valid JSON');
    process.exit(1);
  }

  if (!parsed.testResults || !Array.isArray(parsed.testResults)) {
    console.error('Error: input does not contain a testResults array — is this vitest JSON output?');
    process.exit(1);
  }

  const normalized = normalize(parsed);
  console.log(JSON.stringify(normalized, null, 2));
}

main();
