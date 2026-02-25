/**
 * Property-based tests for DynamicContract monotonic expansion.
 *
 * Uses fast-check to verify that contracts built by progressively
 * adding capabilities always pass verifyMonotonicExpansion().
 *
 * @see Bridgebuilder Finding F14 — Missing property tests for monotonic expansion
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { verifyMonotonicExpansion } from '../../src/commons/dynamic-contract-monotonic.js';
import type { DynamicContract, ProtocolSurface } from '../../src/commons/dynamic-contract.js';

const STATES = ['cold', 'warming', 'established', 'authoritative'] as const;
const TIERS = ['restricted', 'standard', 'extended', 'unlimited'] as const;

/** Arbitrary for a pool of capability strings. */
const capabilityPoolArb = fc.uniqueArray(
  fc.constantFrom('inference', 'ensemble', 'tools', 'governance', 'billing', 'admin', 'audit'),
  { minLength: 1, maxLength: 7 },
);

/** Arbitrary for a pool of schema strings. */
const schemaPoolArb = fc.uniqueArray(
  fc.constantFrom('Basic', 'Core', 'Extended', 'Full', 'Governance', 'Billing', 'Audit'),
  { minLength: 1, maxLength: 7 },
);

describe('Monotonic expansion properties', () => {
  it('contracts built by progressive accumulation always verify', () => {
    fc.assert(
      fc.property(
        capabilityPoolArb,
        schemaPoolArb,
        fc.integer({ min: 1, max: 4 }),
        (capPool, schemaPool, numStates) => {
          const usedStates = STATES.slice(0, numStates);
          const surfaces: Record<string, ProtocolSurface> = {};

          let currentCaps: string[] = [];
          let currentSchemas: string[] = [];

          for (let i = 0; i < usedStates.length; i++) {
            // Progressive accumulation: each state adds capabilities from the pool
            const newCaps = capPool.slice(0, Math.min(i + 1, capPool.length));
            const newSchemas = schemaPool.slice(0, Math.min(i + 1, schemaPool.length));

            // Union with previous (ensures superset)
            currentCaps = [...new Set([...currentCaps, ...newCaps])];
            currentSchemas = [...new Set([...currentSchemas, ...newSchemas])];

            surfaces[usedStates[i]] = {
              schemas: [...currentSchemas],
              capabilities: [...currentCaps],
              rate_limit_tier: TIERS[Math.min(i, TIERS.length - 1)],
            };
          }

          const contract: DynamicContract = {
            contract_id: '550e8400-e29b-41d4-a716-446655440000',
            surfaces,
            contract_version: '8.1.0',
            created_at: '2026-02-25T10:00:00Z',
          };

          const result = verifyMonotonicExpansion(contract);
          return result.valid === true && result.violations.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removing a capability from a higher state always produces a violation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        (removedIndex) => {
          const allCaps = ['inference', 'ensemble', 'tools', 'governance'];
          const allSchemas = ['Basic', 'Extended', 'Full'];

          const contract: DynamicContract = {
            contract_id: '550e8400-e29b-41d4-a716-446655440000',
            surfaces: {
              cold: {
                schemas: allSchemas.slice(0, 2),
                capabilities: allCaps.slice(0, 2),
                rate_limit_tier: 'restricted',
              },
              warming: {
                schemas: allSchemas.slice(0, 2),
                // Remove one capability that exists in cold
                capabilities: allCaps.slice(0, 2).filter((_, i) => i !== removedIndex % 2),
                rate_limit_tier: 'standard',
              },
            },
            contract_version: '8.1.0',
            created_at: '2026-02-25T10:00:00Z',
          };

          const result = verifyMonotonicExpansion(contract);
          return result.valid === false
            && result.violations.some(v => v.violation_type === 'missing_capabilities');
        },
      ),
      { numRuns: 30 },
    );
  });

  it('equal surfaces at all states always verify (non-strict monotonicity)', () => {
    fc.assert(
      fc.property(
        capabilityPoolArb,
        schemaPoolArb,
        fc.constantFrom(...TIERS),
        fc.integer({ min: 2, max: 4 }),
        (caps, schemas, tier, numStates) => {
          const usedStates = STATES.slice(0, numStates);
          const surface: ProtocolSurface = {
            schemas: [...schemas],
            capabilities: [...caps],
            rate_limit_tier: tier,
          };

          const surfaces: Record<string, ProtocolSurface> = {};
          for (const state of usedStates) {
            surfaces[state] = { ...surface };
          }

          const contract: DynamicContract = {
            contract_id: '550e8400-e29b-41d4-a716-446655440000',
            surfaces,
            contract_version: '8.1.0',
            created_at: '2026-02-25T10:00:00Z',
          };

          return verifyMonotonicExpansion(contract).valid === true;
        },
      ),
      { numRuns: 50 },
    );
  });
});
