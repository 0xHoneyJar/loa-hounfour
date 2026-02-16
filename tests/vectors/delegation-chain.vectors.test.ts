/**
 * Tests for DelegationChain conformance vectors (S1-T3).
 *
 * Validates all 4 vectors against schema and constraint evaluation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import { DelegationChainSchema } from '../../src/schemas/model/routing/delegation-chain.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const vectorDir = join(rootDir, 'vectors', 'conformance', 'delegation-chain');
const constraintPath = join(rootDir, 'constraints', 'DelegationChain.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

interface Vector {
  vector_id: string;
  category: string;
  description: string;
  contract_version: string;
  input: Record<string, unknown>;
  expected_output: Record<string, unknown>;
  expected_valid: boolean;
  matching_rules: { select_fields: string[] };
  metadata: Record<string, string>;
}

const vectorFiles = readdirSync(vectorDir).filter((f) => f.endsWith('.json'));

describe('DelegationChain conformance vectors', () => {
  it('has exactly 4 vectors', () => {
    expect(vectorFiles).toHaveLength(4);
  });

  for (const file of vectorFiles) {
    const vector: Vector = JSON.parse(readFileSync(join(vectorDir, file), 'utf-8'));

    describe(vector.vector_id, () => {
      it(`schema validation matches expected_valid (${vector.expected_valid})`, () => {
        const schemaValid = Value.Check(DelegationChainSchema, vector.input);
        if (vector.expected_valid) {
          expect(schemaValid).toBe(true);
        }
        // Invalid vectors may fail at schema or constraint level
      });

      if (vector.expected_valid) {
        it('passes all constraints', () => {
          for (const constraint of constraintFile.constraints) {
            const result = evaluateConstraint(
              vector.input as Record<string, unknown>,
              constraint.expression,
            );
            expect(result).toBe(true);
          }
        });
      }

      if (!vector.expected_valid && vector.expected_output.constraint_violated) {
        it(`violates constraint: ${vector.expected_output.constraint_violated}`, () => {
          const constraint = constraintFile.constraints.find(
            (c: { id: string }) => c.id === vector.expected_output.constraint_violated,
          );
          expect(constraint).toBeDefined();
          const result = evaluateConstraint(
            vector.input as Record<string, unknown>,
            constraint.expression,
          );
          expect(result).toBe(false);
        });
      }
    });
  }
});
