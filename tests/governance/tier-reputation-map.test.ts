/**
 * Tests for tier-to-reputation state mapping.
 *
 * @see SDD §6.2 — Tier-Reputation Mapping
 * @see PRD FR-2 — Economic Boundary Refinement
 */
import { describe, it, expect } from 'vitest';
import { mapTierToReputationState } from '../../src/governance/tier-reputation-map.js';

describe('mapTierToReputationState', () => {
  it('free → cold', () => {
    expect(mapTierToReputationState('free')).toBe('cold');
  });

  it('basic → warming', () => {
    expect(mapTierToReputationState('basic')).toBe('warming');
  });

  it('pro → established', () => {
    expect(mapTierToReputationState('pro')).toBe('established');
  });

  it('enterprise → authoritative', () => {
    expect(mapTierToReputationState('enterprise')).toBe('authoritative');
  });

  it('unknown tier returns cold (fail-safe)', () => {
    expect(mapTierToReputationState('premium')).toBe('cold');
    expect(mapTierToReputationState('')).toBe('cold');
    expect(mapTierToReputationState('ENTERPRISE')).toBe('cold');
  });
});
