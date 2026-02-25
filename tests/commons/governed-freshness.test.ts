/**
 * Tests for GovernedFreshness schema.
 *
 * @see SDD §4.5.3 — GovernedFreshness
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  GovernedFreshnessSchema,
  type GovernedFreshness,
} from '../../src/commons/governed-freshness.js';
import { AUDIT_TRAIL_GENESIS_HASH } from '../../src/commons/audit-trail.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;

const governanceFields = {
  conservation_law: {
    invariants: [{
      invariant_id: 'FR-01',
      name: 'Score bounds',
      expression: 'freshness_score >= 0 && freshness_score <= 1',
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
    states: [
      { name: 'fresh' }, { name: 'decaying' },
      { name: 'stale' }, { name: 'expired' },
    ],
    transitions: [
      { from: 'fresh', to: 'decaying' },
      { from: 'decaying', to: 'stale' },
      { from: 'stale', to: 'expired' },
    ],
    initial_state: 'fresh',
    terminal_states: ['expired'],
  },
  governance_class: 'protocol-fixed' as const,
  version: 0,
  contract_version: '8.0.0',
};

describe('GovernedFreshness', () => {
  const validFreshness: GovernedFreshness = {
    source_id: 'data-feed-001',
    freshness_score: 0.95,
    decay_rate: 0.01,
    last_refresh: '2026-02-25T10:00:00Z',
    minimum_freshness: 0.3,
    ...governanceFields,
  };

  describe('valid instances', () => {
    it('accepts a fresh resource', () => {
      expect(Value.Check(GovernedFreshnessSchema, validFreshness)).toBe(true);
    });

    it('accepts a decaying resource at boundary', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        freshness_score: 0.3,
      })).toBe(true);
    });

    it('accepts zero decay rate', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        decay_rate: 0,
      })).toBe(true);
    });

    it('accepts zero freshness score', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        freshness_score: 0,
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects freshness_score > 1', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        freshness_score: 1.1,
      })).toBe(false);
    });

    it('rejects negative freshness_score', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        freshness_score: -0.1,
      })).toBe(false);
    });

    it('rejects negative decay_rate', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        decay_rate: -0.01,
      })).toBe(false);
    });

    it('rejects missing source_id', () => {
      const { source_id, ...rest } = validFreshness;
      expect(Value.Check(GovernedFreshnessSchema, rest)).toBe(false);
    });

    it('rejects empty source_id', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        source_id: '',
      })).toBe(false);
    });

    it('rejects invalid last_refresh format', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        last_refresh: 'not-a-date',
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(GovernedFreshnessSchema, {
        ...validFreshness,
        extra: true,
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "GovernedFreshness"', () => {
      expect(GovernedFreshnessSchema.$id).toBe('GovernedFreshness');
    });

    it('has additionalProperties false', () => {
      expect(GovernedFreshnessSchema.additionalProperties).toBe(false);
    });
  });

  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/commons/governed-freshness');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    for (const file of vectorFiles) {
      it(`vector: ${file}`, () => {
        const raw = fs.readFileSync(path.join(vectorDir, file), 'utf-8');
        const vector = JSON.parse(raw);
        const result = Value.Check(GovernedFreshnessSchema, vector.input);
        expect(result).toBe(vector.expected_valid);
      });
    }
  });
});
