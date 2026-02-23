/**
 * Conformance vector tests for evaluateEconomicBoundary() and evaluateFromBoundary().
 *
 * Dynamically loads all vectors from vectors/economic-boundary-evaluation/
 * and verifies the decision engine produces expected results.
 *
 * @see FR-1 v7.9.0 — Decision Engine
 * @see F5 v7.9.1 — Integration conformance vectors
 * @since v7.9.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateEconomicBoundary, evaluateFromBoundary } from '../../src/utilities/economic-boundary.js';

const VECTORS_DIR = join(__dirname, '../../vectors/economic-boundary-evaluation');

function loadVector(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

const index = loadVector('index.json');

describe('Economic Boundary Evaluation Vectors', () => {
  it('index manifest exists and lists vectors', () => {
    expect(index.schema_version).toBe(1);
    expect(index.vectors.length).toBeGreaterThanOrEqual(12);
  });

  // Dynamically test all vectors listed in the index
  for (const entry of index.vectors as Array<{ file: string; description: string }>) {
    // Integration vectors use evaluateFromBoundary()
    const isIntegration = entry.file.startsWith('integration-');

    describe(entry.description, () => {
      const vector = loadVector(entry.file);

      it(`${entry.file}: produces expected result`, () => {
        let result;
        if (isIntegration) {
          // Integration vectors pass a full boundary object
          result = evaluateFromBoundary(
            vector.input.boundary,
            vector.input.evaluated_at,
          );
        } else {
          result = evaluateEconomicBoundary(
            vector.input.trust_snapshot,
            vector.input.capital_snapshot,
            vector.input.criteria,
            vector.input.evaluated_at,
          );
        }

        // Check granted status
        expect(result.access_decision.granted).toBe(vector.expected.access_decision.granted);

        // Check denial_reason (exact match or contains check)
        if (vector.expected.access_decision.denial_reason) {
          expect(result.access_decision.denial_reason).toBe(vector.expected.access_decision.denial_reason);
        } else if (vector.expected.access_decision.denial_reason_contains) {
          expect(result.access_decision.denial_reason).toContain(
            vector.expected.access_decision.denial_reason_contains,
          );
        }

        // Check trust evaluation if fully specified
        if (vector.expected.trust_evaluation?.actual_score !== undefined) {
          expect(result.trust_evaluation.actual_score).toBe(vector.expected.trust_evaluation.actual_score);
          expect(result.trust_evaluation.required_score).toBe(vector.expected.trust_evaluation.required_score);
          expect(result.trust_evaluation.actual_state).toBe(vector.expected.trust_evaluation.actual_state);
          expect(result.trust_evaluation.required_state).toBe(vector.expected.trust_evaluation.required_state);
        }
        if (vector.expected.trust_evaluation?.passed !== undefined) {
          expect(result.trust_evaluation.passed).toBe(vector.expected.trust_evaluation.passed);
        }

        // Check capital evaluation if fully specified
        if (vector.expected.capital_evaluation?.actual_budget !== undefined) {
          expect(result.capital_evaluation.actual_budget).toBe(vector.expected.capital_evaluation.actual_budget);
          expect(result.capital_evaluation.required_budget).toBe(vector.expected.capital_evaluation.required_budget);
        }
        if (vector.expected.capital_evaluation?.passed !== undefined) {
          expect(result.capital_evaluation.passed).toBe(vector.expected.capital_evaluation.passed);
        }

        // Check boundary_id if specified (v7.9.1 F3)
        if (vector.expected.boundary_id !== undefined) {
          expect(result.boundary_id).toBe(vector.expected.boundary_id);
        }

        // Check denial_codes if specified (v7.9.1 F4)
        if (vector.expected.denial_codes !== undefined) {
          expect(result.denial_codes).toEqual(vector.expected.denial_codes);
        }

        // Check evaluation_gap if specified (v7.9.1 Q4)
        if (vector.expected.evaluation_gap !== undefined) {
          expect(result.evaluation_gap).toBeDefined();
          if (vector.expected.evaluation_gap.trust_score_gap !== undefined) {
            expect(result.evaluation_gap!.trust_score_gap).toBeCloseTo(
              vector.expected.evaluation_gap.trust_score_gap, 10,
            );
          }
          if (vector.expected.evaluation_gap.reputation_state_gap !== undefined) {
            expect(result.evaluation_gap!.reputation_state_gap).toBe(
              vector.expected.evaluation_gap.reputation_state_gap,
            );
          }
          if (vector.expected.evaluation_gap.budget_gap !== undefined) {
            expect(result.evaluation_gap!.budget_gap).toBe(
              vector.expected.evaluation_gap.budget_gap,
            );
          }
        }
      });
    });
  }
});
