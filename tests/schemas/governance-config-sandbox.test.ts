/**
 * Tests for GovernanceConfig sandbox extension (S2-T1).
 *
 * v5.4.0 — FR-3: sandbox_permeability, sandbox_permeability_rationale, mission_alignment.
 * Existing tests in governance-config.test.ts remain unchanged.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  GovernanceConfigSchema,
  DEFAULT_GOVERNANCE_CONFIG,
  type GovernanceConfig,
} from '../../src/schemas/governance-config.js';

describe('GovernanceConfig sandbox extension (v5.4.0)', () => {
  it('DEFAULT_GOVERNANCE_CONFIG still validates (no new required fields)', () => {
    expect(Value.Check(GovernanceConfigSchema, DEFAULT_GOVERNANCE_CONFIG)).toBe(true);
  });

  it('accepts config with sandbox_permeability = impermeable', () => {
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'impermeable',
    };
    expect(Value.Check(GovernanceConfigSchema, config)).toBe(true);
  });

  it('accepts config with sandbox_permeability = semi_permeable', () => {
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'semi_permeable',
    };
    expect(Value.Check(GovernanceConfigSchema, config)).toBe(true);
  });

  it('accepts config with sandbox_permeability = permeable', () => {
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'permeable',
    };
    expect(Value.Check(GovernanceConfigSchema, config)).toBe(true);
  });

  it('rejects invalid sandbox_permeability value', () => {
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'leaky',
    };
    expect(Value.Check(GovernanceConfigSchema, config)).toBe(false);
  });

  it('accepts config with sandbox_permeability_rationale', () => {
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'semi_permeable',
      sandbox_permeability_rationale: 'Controlled external flows for federation testing.',
    };
    expect(Value.Check(GovernanceConfigSchema, config)).toBe(true);
  });

  it('accepts config with mission_alignment', () => {
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      mission_alignment: 'Accelerate safe agent collaboration research.',
    };
    expect(Value.Check(GovernanceConfigSchema, config)).toBe(true);
  });

  it('accepts config with all three new fields', () => {
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'impermeable',
      sandbox_permeability_rationale: 'Sealed economy for safety testing.',
      mission_alignment: 'Distributional AGI safety research.',
    };
    expect(Value.Check(GovernanceConfigSchema, config)).toBe(true);
  });

  it('DEFAULT_GOVERNANCE_CONFIG does not include new fields', () => {
    expect('sandbox_permeability' in DEFAULT_GOVERNANCE_CONFIG).toBe(false);
    expect('sandbox_permeability_rationale' in DEFAULT_GOVERNANCE_CONFIG).toBe(false);
    expect('mission_alignment' in DEFAULT_GOVERNANCE_CONFIG).toBe(false);
  });
});
