/**
 * Tests for GovernedReputation schema.
 *
 * @see SDD §4.5.2 — GovernedReputation
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  GovernedReputationSchema,
  type GovernedReputation,
} from '../../src/commons/governed-reputation.js';
import { AUDIT_TRAIL_GENESIS_HASH } from '../../src/commons/audit-trail.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;

const governanceFields = {
  conservation_law: {
    invariants: [{
      invariant_id: 'REP-02',
      name: 'Cold null score',
      expression: "!(reputation_state == 'cold' && personal_score != null)",
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
      { name: 'cold' }, { name: 'warming' },
      { name: 'established' }, { name: 'authoritative' },
    ],
    transitions: [
      { from: 'cold', to: 'warming' },
      { from: 'warming', to: 'established' },
      { from: 'established', to: 'authoritative' },
    ],
    initial_state: 'cold',
    terminal_states: [],
  },
  governance_class: 'protocol-fixed' as const,
  version: 0,
  contract_version: '8.0.0',
};

describe('GovernedReputation', () => {
  const validReputation: GovernedReputation = {
    personality_id: 'agent-001',
    collection_id: 'collection-alpha',
    pool_id: 'pool-main',
    reputation_state: 'cold',
    personal_score: null,
    blended_score: 0.5,
    sample_count: 0,
    ...governanceFields,
  };

  describe('valid instances', () => {
    it('accepts cold reputation with null score', () => {
      expect(Value.Check(GovernedReputationSchema, validReputation)).toBe(true);
    });

    it('accepts warming reputation with score', () => {
      expect(Value.Check(GovernedReputationSchema, {
        ...validReputation,
        reputation_state: 'warming',
        personal_score: 0.72,
        sample_count: 3,
        version: 3,
      })).toBe(true);
    });

    it('accepts authoritative reputation', () => {
      expect(Value.Check(GovernedReputationSchema, {
        ...validReputation,
        reputation_state: 'authoritative',
        personal_score: 0.95,
        blended_score: 0.93,
        sample_count: 100,
        version: 100,
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects unknown reputation_state', () => {
      expect(Value.Check(GovernedReputationSchema, {
        ...validReputation,
        reputation_state: 'unknown',
      })).toBe(false);
    });

    it('rejects score out of range', () => {
      expect(Value.Check(GovernedReputationSchema, {
        ...validReputation,
        reputation_state: 'warming',
        personal_score: 1.5,
      })).toBe(false);
    });

    it('rejects negative sample_count', () => {
      expect(Value.Check(GovernedReputationSchema, {
        ...validReputation,
        sample_count: -1,
      })).toBe(false);
    });

    it('rejects missing personality_id', () => {
      const { personality_id, ...rest } = validReputation;
      expect(Value.Check(GovernedReputationSchema, rest)).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(GovernedReputationSchema, {
        ...validReputation,
        extra: true,
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "GovernedReputation"', () => {
      expect(GovernedReputationSchema.$id).toBe('GovernedReputation');
    });

    it('has additionalProperties false', () => {
      expect(GovernedReputationSchema.additionalProperties).toBe(false);
    });
  });

  describe('conformance vectors', () => {
    const vectorDir = path.join(process.cwd(), 'vectors/conformance/commons/governed-reputation');
    const vectorFiles = fs.readdirSync(vectorDir).filter(f => f.endsWith('.json'));

    for (const file of vectorFiles) {
      it(`vector: ${file}`, () => {
        const raw = fs.readFileSync(path.join(vectorDir, file), 'utf-8');
        const vector = JSON.parse(raw);
        const result = Value.Check(GovernedReputationSchema, vector.input);
        expect(result).toBe(vector.expected_valid);
      });
    }
  });
});
