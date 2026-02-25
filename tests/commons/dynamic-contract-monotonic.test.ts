/**
 * Tests for DynamicContract monotonic expansion verification.
 *
 * @see Bridgebuilder Finding F10 — Monotonic expansion declared but not enforced
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import { verifyMonotonicExpansion } from '../../src/commons/dynamic-contract-monotonic.js';
import type { DynamicContract, ProtocolSurface } from '../../src/commons/dynamic-contract.js';

function makeSurface(
  schemas: string[],
  capabilities: string[],
  rateLimitTier: 'restricted' | 'standard' | 'extended' | 'unlimited',
): ProtocolSurface {
  return { schemas, capabilities, rate_limit_tier: rateLimitTier };
}

describe('verifyMonotonicExpansion', () => {
  describe('valid contracts', () => {
    it('validates a correctly expanding contract', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: makeSurface(['Basic'], ['inference'], 'restricted'),
          warming: makeSurface(['Basic', 'Extended'], ['inference', 'ensemble'], 'standard'),
          established: makeSurface(['Basic', 'Extended', 'Full'], ['inference', 'ensemble', 'tools'], 'extended'),
          authoritative: makeSurface(['Basic', 'Extended', 'Full', 'Gov'], ['inference', 'ensemble', 'tools', 'governance'], 'unlimited'),
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('validates a contract with equal surfaces (non-strictly monotonic)', () => {
      const surface = makeSurface(['Basic'], ['inference'], 'standard');
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: surface,
          warming: surface,
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(true);
    });

    it('validates a contract with only one state defined', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          established: makeSurface(['Basic'], ['inference'], 'standard'),
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(true);
    });

    it('validates a contract with non-adjacent states', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: makeSurface(['Basic'], ['inference'], 'restricted'),
          authoritative: makeSurface(['Basic', 'Full'], ['inference', 'governance'], 'unlimited'),
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid contracts', () => {
    it('detects missing capabilities at higher state', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: makeSurface(['Basic'], ['inference', 'ensemble'], 'restricted'),
          warming: makeSurface(['Basic'], ['inference'], 'standard'), // Missing 'ensemble'
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].violation_type).toBe('missing_capabilities');
      expect(result.violations[0].details).toContain('ensemble');
    });

    it('detects missing schemas at higher state', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: makeSurface(['Basic', 'Core'], ['inference'], 'restricted'),
          warming: makeSurface(['Basic'], ['inference'], 'standard'), // Missing 'Core'
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(false);
      expect(result.violations[0].violation_type).toBe('missing_schemas');
      expect(result.violations[0].details).toContain('Core');
    });

    it('detects rate limit regression', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: makeSurface(['Basic'], ['inference'], 'standard'),
          warming: makeSurface(['Basic'], ['inference'], 'restricted'), // Regression
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(false);
      expect(result.violations[0].violation_type).toBe('rate_limit_regression');
    });

    it('detects multiple violations', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: makeSurface(['A', 'B'], ['inference', 'tools'], 'extended'),
          warming: makeSurface(['A'], ['inference'], 'restricted'), // Missing B, tools, rate regression
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });

    it('reports correct state pair in violations', () => {
      const contract: DynamicContract = {
        contract_id: '550e8400-e29b-41d4-a716-446655440000',
        surfaces: {
          cold: makeSurface(['Basic'], ['inference'], 'restricted'),
          warming: makeSurface(['Basic'], ['inference'], 'standard'),
          established: makeSurface(['Basic'], ['inference'], 'restricted'), // Regression from warming
        },
        contract_version: '8.1.0',
        created_at: '2026-02-25T10:00:00Z',
      };
      const result = verifyMonotonicExpansion(contract);
      expect(result.valid).toBe(false);
      expect(result.violations[0].lower_state).toBe('warming');
      expect(result.violations[0].higher_state).toBe('established');
    });
  });
});
