/**
 * Tests for GovernedCredits schema.
 *
 * @see SDD §4.5.1 — GovernedCredits
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  GovernedCreditsSchema,
  type GovernedCredits,
} from '../../src/commons/governed-credits.js';
import { AUDIT_TRAIL_GENESIS_HASH } from '../../src/commons/audit-trail.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;

const governanceFields = {
  conservation_law: {
    invariants: [{
      invariant_id: 'CL-01',
      name: 'Lot conservation',
      expression: "bigint_sum([balance, reserved, consumed]) == original_allocation",
      severity: 'error' as const,
    }],
    enforcement: 'strict' as const,
    scope: 'per-entry' as const,
  },
  audit_trail: {
    entries: [],
    hash_algorithm: 'sha256' as const,
    genesis_hash: GENESIS,
    integrity_status: 'unverified' as const,
  },
  state_machine: {
    states: [{ name: 'active' }, { name: 'depleted' }],
    transitions: [{ from: 'active', to: 'depleted' }],
    initial_state: 'active',
    terminal_states: [],
  },
  governance_class: 'protocol-fixed' as const,
  version: 0,
  contract_version: '8.0.0',
};

describe('GovernedCredits', () => {
  const validCredits: GovernedCredits = {
    lot_id: '550e8400-e29b-41d4-a716-446655440000',
    balance: '500000',
    original_allocation: '1000000',
    reserved: '200000',
    consumed: '300000',
    currency: 'micro-usd',
    ...governanceFields,
  };

  describe('valid instances', () => {
    it('accepts a balanced credit lot', () => {
      expect(Value.Check(GovernedCreditsSchema, validCredits)).toBe(true);
    });

    it('accepts zero balance', () => {
      expect(Value.Check(GovernedCreditsSchema, {
        ...validCredits,
        balance: '0',
        consumed: '800000',
      })).toBe(true);
    });

    it('accepts with governance_extensions', () => {
      expect(Value.Check(GovernedCreditsSchema, {
        ...validCredits,
        governance_extensions: { 'commons.budget': { limit: '5000000' } },
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects non-numeric balance', () => {
      expect(Value.Check(GovernedCreditsSchema, {
        ...validCredits,
        balance: 'abc',
      })).toBe(false);
    });

    it('rejects negative numeric string (has leading minus)', () => {
      expect(Value.Check(GovernedCreditsSchema, {
        ...validCredits,
        balance: '-100',
      })).toBe(false);
    });

    it('rejects floating point balance', () => {
      expect(Value.Check(GovernedCreditsSchema, {
        ...validCredits,
        balance: '100.50',
      })).toBe(false);
    });

    it('rejects wrong currency', () => {
      expect(Value.Check(GovernedCreditsSchema, {
        ...validCredits,
        currency: 'usd',
      })).toBe(false);
    });

    it('rejects missing lot_id', () => {
      const { lot_id, ...rest } = validCredits;
      expect(Value.Check(GovernedCreditsSchema, rest)).toBe(false);
    });

    it('rejects missing version (SKP-005)', () => {
      const { version, ...rest } = validCredits;
      expect(Value.Check(GovernedCreditsSchema, rest)).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(GovernedCreditsSchema, {
        ...validCredits,
        extra: true,
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "GovernedCredits"', () => {
      expect(GovernedCreditsSchema.$id).toBe('GovernedCredits');
    });

    it('has additionalProperties false', () => {
      expect(GovernedCreditsSchema.additionalProperties).toBe(false);
    });
  });

  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/commons/governed-credits');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    it('has at least 1 vector', () => {
      expect(vectorFiles.length).toBeGreaterThanOrEqual(1);
    });

    for (const file of vectorFiles) {
      it(`vector: ${file}`, () => {
        const raw = fs.readFileSync(path.join(vectorDir, file), 'utf-8');
        const vector = JSON.parse(raw);
        const result = Value.Check(GovernedCreditsSchema, vector.input);
        expect(result).toBe(vector.expected_valid);
      });
    }
  });
});
