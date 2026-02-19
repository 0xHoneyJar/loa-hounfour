/**
 * Tests for JwtBoundarySpec constraint file (S1-T7).
 *
 * Validates all 3 constraints against valid and invalid inputs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'JwtBoundarySpec.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function findConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

const validSpec = {
  spec_id: '550e8400-e29b-41d4-a716-446655440010',
  boundary_name: 'arrakis-to-loa-finn',
  steps: [
    { step_number: 1, name: 'Signature verification', description: 'Verify EdDSA/Ed25519 signature', error_code: 'JWT_SIGNATURE_INVALID', is_blocking: true },
    { step_number: 2, name: 'Algorithm whitelist', description: 'Verify signing algorithm is permitted', error_code: 'JWT_ALGORITHM_REJECTED', is_blocking: true },
    { step_number: 3, name: 'Claims validation', description: 'Validate inbound claims against schema', error_code: 'JWT_CLAIMS_INVALID', is_blocking: true },
    { step_number: 4, name: 'Reservation existence', description: 'Verify referenced reservation exists', error_code: 'JWT_RESERVATION_NOT_FOUND', is_blocking: true },
    { step_number: 5, name: 'Replay detection', description: 'Verify JTI not in idempotency store', error_code: 'JWT_REPLAY_DETECTED', is_blocking: true },
    { step_number: 6, name: 'Overspend guard', description: 'Verify actual_cost <= reserved_amount', error_code: 'JWT_OVERSPEND', is_blocking: true },
  ],
  algorithm_whitelist: ['EdDSA'],
  claims_schema_ref: 'OutboundClaims',
  replay_window_seconds: 300,
  contract_version: '5.5.0',
};

describe('JwtBoundarySpec constraint file', () => {
  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('JwtBoundarySpec');
  });

  it('has contract_version 5.5.0', () => {
    expect(constraintFile.contract_version).toBe('5.5.0');
  });

  it('has 3 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(3);
  });

  describe('jwt-boundary-step-ordering', () => {
    const c = findConstraint('jwt-boundary-step-ordering');

    it('passes for correctly ordered steps 1-6', () => {
      expect(evaluateConstraint(validSpec, c.expression)).toBe(true);
    });

    it('fails when step 3 has wrong number', () => {
      const invalid = {
        ...validSpec,
        steps: validSpec.steps.map((s, i) =>
          i === 2 ? { ...s, step_number: 4 } : s,
        ),
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('fails when steps are reordered', () => {
      const reversed = {
        ...validSpec,
        steps: [...validSpec.steps].reverse(),
      };
      expect(evaluateConstraint(reversed, c.expression)).toBe(false);
    });
  });

  describe('jwt-boundary-crypto-steps-blocking', () => {
    const c = findConstraint('jwt-boundary-crypto-steps-blocking');

    it('passes when both crypto steps are blocking', () => {
      expect(evaluateConstraint(validSpec, c.expression)).toBe(true);
    });

    it('fails when step 1 is not blocking', () => {
      const invalid = {
        ...validSpec,
        steps: validSpec.steps.map((s, i) =>
          i === 0 ? { ...s, is_blocking: false } : s,
        ),
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });

    it('fails when step 2 is not blocking', () => {
      const invalid = {
        ...validSpec,
        steps: validSpec.steps.map((s, i) =>
          i === 1 ? { ...s, is_blocking: false } : s,
        ),
      };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });

  describe('jwt-boundary-algorithm-non-empty', () => {
    const c = findConstraint('jwt-boundary-algorithm-non-empty');

    it('passes with one algorithm', () => {
      expect(evaluateConstraint(validSpec, c.expression)).toBe(true);
    });

    it('passes with multiple algorithms', () => {
      const multi = { ...validSpec, algorithm_whitelist: ['EdDSA', 'RS256', 'ES256'] };
      expect(evaluateConstraint(multi, c.expression)).toBe(true);
    });

    it('fails with empty algorithm whitelist', () => {
      const invalid = { ...validSpec, algorithm_whitelist: [] };
      expect(evaluateConstraint(invalid, c.expression)).toBe(false);
    });
  });
});
