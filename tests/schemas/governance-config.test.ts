/**
 * Tests for GovernanceConfig schema and defaults (S3-T1).
 *
 * Validates schema structure, default config values, TypeBox validation,
 * and constraint file evaluation.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GovernanceConfigSchema,
  DEFAULT_GOVERNANCE_CONFIG,
  type GovernanceConfig,
} from '../../src/schemas/governance-config.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

describe('GovernanceConfigSchema', () => {
  it('DEFAULT_GOVERNANCE_CONFIG validates against schema', () => {
    expect(Value.Check(GovernanceConfigSchema, DEFAULT_GOVERNANCE_CONFIG)).toBe(true);
  });

  it('default governance_version is 1.0.0', () => {
    expect(DEFAULT_GOVERNANCE_CONFIG.governance_version).toBe('1.0.0');
  });

  it('default tiers match RESERVATION_TIER_MAP', () => {
    expect(DEFAULT_GOVERNANCE_CONFIG.reservation_tiers.self_declared).toBe(300);
    expect(DEFAULT_GOVERNANCE_CONFIG.reservation_tiers.community_verified).toBe(500);
    expect(DEFAULT_GOVERNANCE_CONFIG.reservation_tiers.protocol_certified).toBe(1000);
  });

  it('default advisory_warning_threshold_percent is 20', () => {
    expect(DEFAULT_GOVERNANCE_CONFIG.advisory_warning_threshold_percent).toBe(20);
  });

  it('rejects invalid governance_version format', () => {
    const invalid: GovernanceConfig = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      governance_version: 'not-semver',
    };
    expect(Value.Check(GovernanceConfigSchema, invalid)).toBe(false);
  });

  it('rejects negative tier values', () => {
    const invalid = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      reservation_tiers: { ...DEFAULT_GOVERNANCE_CONFIG.reservation_tiers, self_declared: -1 },
    };
    expect(Value.Check(GovernanceConfigSchema, invalid)).toBe(false);
  });

  it('rejects tier values above 10000', () => {
    const invalid = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      reservation_tiers: { ...DEFAULT_GOVERNANCE_CONFIG.reservation_tiers, protocol_certified: 10001 },
    };
    expect(Value.Check(GovernanceConfigSchema, invalid)).toBe(false);
  });

  it('rejects advisory threshold above 100', () => {
    const invalid = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      advisory_warning_threshold_percent: 101,
    };
    expect(Value.Check(GovernanceConfigSchema, invalid)).toBe(false);
  });

  it('rejects advisory threshold below 0', () => {
    const invalid = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      advisory_warning_threshold_percent: -1,
    };
    expect(Value.Check(GovernanceConfigSchema, invalid)).toBe(false);
  });

  it('accepts custom valid config', () => {
    const custom: GovernanceConfig = {
      governance_version: '1.1.0',
      reservation_tiers: {
        self_declared: 100,
        community_verified: 300,
        protocol_certified: 500,
      },
      advisory_warning_threshold_percent: 10,
    };
    expect(Value.Check(GovernanceConfigSchema, custom)).toBe(true);
  });

  it('accepts zero tier values (governance choice)', () => {
    const zeroTiers: GovernanceConfig = {
      governance_version: '1.0.0',
      reservation_tiers: {
        self_declared: 0,
        community_verified: 0,
        protocol_certified: 0,
      },
      advisory_warning_threshold_percent: 0,
    };
    expect(Value.Check(GovernanceConfigSchema, zeroTiers)).toBe(true);
  });

  it('rejects additional properties', () => {
    const withExtra = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      extra_field: 'not allowed',
    };
    expect(Value.Check(GovernanceConfigSchema, withExtra)).toBe(false);
  });
});

describe('GovernanceConfig constraint file', () => {
  const constraintPath = join(rootDir, 'constraints', 'GovernanceConfig.constraints.json');
  const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('GovernanceConfig');
  });

  it('has contract_version 5.4.0', () => {
    expect(constraintFile.contract_version).toBe('5.4.0');
  });

  it('has expression_version 2.0', () => {
    expect(constraintFile.expression_version).toBe('2.0');
  });

  it('has 4 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(4);
  });

  it('tier ordering constraint passes for default config', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-tier-ordering');
    const result = evaluateConstraint(DEFAULT_GOVERNANCE_CONFIG, c.expression);
    expect(result).toBe(true);
  });

  it('tier ordering constraint fails when inverted', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-tier-ordering');
    const inverted = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      reservation_tiers: { self_declared: 1000, community_verified: 500, protocol_certified: 300 },
    };
    const result = evaluateConstraint(inverted, c.expression);
    expect(result).toBe(false);
  });

  it('tier bounds constraint passes for default config', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-tier-bounds');
    const result = evaluateConstraint(DEFAULT_GOVERNANCE_CONFIG, c.expression);
    expect(result).toBe(true);
  });

  it('tier bounds constraint checks community_verified independently (medium-v53-002)', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-tier-bounds');
    // Expression should include community_verified bounds
    expect(c.expression).toContain('reservation_tiers.community_verified >= 0');
    expect(c.expression).toContain('reservation_tiers.community_verified <= 10000');
  });

  it('advisory bounds constraint passes for default config', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-advisory-bounds');
    const result = evaluateConstraint(DEFAULT_GOVERNANCE_CONFIG, c.expression);
    expect(result).toBe(true);
  });

  it('has institutional_context in metadata', () => {
    expect(constraintFile.metadata.institutional_context).toBeDefined();
    expect(constraintFile.metadata.institutional_context).toContain('economic constitution');
  });
});
