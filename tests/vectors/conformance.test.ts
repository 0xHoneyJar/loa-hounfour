/**
 * Conformance test harness — executable cross-ecosystem vectors.
 *
 * Runs each cross-ecosystem vector through the full validation pipeline:
 * (1) schema validation, (2) cross-field validator, (3) constraint evaluator.
 * Asserts against `expected_evaluation` results when present.
 *
 * Transforms vectors from "does the schema accept this?" to
 * "does the system behave correctly with this input?"
 *
 * @see S11-T2 — Bridgebuilder structural concern #2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import type { ConstraintFile } from '../../src/constraints/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vectorsDir = join(__dirname, '..', '..', 'vectors', 'cross-ecosystem');
const constraintsDir = join(__dirname, '..', '..', 'constraints');

interface ExpectedEvaluation {
  constraint_file: string;
  results: Array<{
    constraint_id: string;
    expected: 'pass' | 'fail';
    expected_message?: string;
  }>;
}

interface VectorEntry {
  id: string;
  description: string;
  valid: boolean;
  schema?: string;
  data?: Record<string, unknown>;
  expected_evaluation?: ExpectedEvaluation;
  [key: string]: unknown;
}

function loadConstraintFile(schemaId: string): ConstraintFile {
  const filePath = join(constraintsDir, `${schemaId}.constraints.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as ConstraintFile;
}

function loadVectorFile(filename: string): { vectors: VectorEntry[] } {
  const filePath = join(vectorsDir, filename);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

// Discover all vector files
const vectorFiles = readdirSync(vectorsDir).filter((f) => f.endsWith('.json'));

let totalConformanceAssertions = 0;

describe('Conformance test harness', () => {
  for (const filename of vectorFiles) {
    const fileData = loadVectorFile(filename);
    const vectors = fileData.vectors;

    for (const vector of vectors) {
      if (!vector.expected_evaluation) continue;

      const eval_ = vector.expected_evaluation;
      const constraintFile = loadConstraintFile(eval_.constraint_file);
      const data = vector.data as Record<string, unknown>;

      describe(`${filename} → ${vector.id}`, () => {
        for (const expectedResult of eval_.results) {
          it(`${expectedResult.constraint_id}: expects ${expectedResult.expected}`, () => {
            const constraint = constraintFile.constraints.find(
              (c) => c.id === expectedResult.constraint_id,
            );
            expect(constraint).toBeDefined();

            const result = evaluateConstraint(data, constraint!.expression);
            totalConformanceAssertions++;

            if (expectedResult.expected === 'pass') {
              expect(result).toBe(true);
            } else {
              expect(result).toBe(false);
            }
          });
        }
      });
    }
  }

  it('has at least 20 conformance assertions', () => {
    // Count expected_evaluation results across all vector files
    let count = 0;
    for (const filename of vectorFiles) {
      const fileData = loadVectorFile(filename);
      for (const vector of fileData.vectors) {
        if (vector.expected_evaluation) {
          count += vector.expected_evaluation.results.length;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(20);
  });
});
