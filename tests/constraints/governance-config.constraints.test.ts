/**
 * Tests for GovernanceConfig sandbox constraint (S2-T2).
 *
 * v5.4.0 — governance-sandbox-consistency constraint.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_GOVERNANCE_CONFIG } from '../../src/schemas/governance-config.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'GovernanceConfig.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

describe('GovernanceConfig sandbox constraint (v5.4.0)', () => {
  it('constraint file has 4 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(4);
  });

  it('constraint file has contract_version 5.4.0', () => {
    expect(constraintFile.contract_version).toBe('5.4.0');
  });

  it('governance-sandbox-consistency exists', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-sandbox-consistency');
    expect(c).toBeDefined();
    expect(c.severity).toBe('warning');
  });

  it('sandbox consistency passes when no sandbox_permeability set', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-sandbox-consistency');
    // sandbox_permeability is undefined, so != 'impermeable' is true
    const result = evaluateConstraint(DEFAULT_GOVERNANCE_CONFIG, c.expression);
    expect(result).toBe(true);
  });

  it('sandbox consistency passes for permeable sandbox', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-sandbox-consistency');
    const config = { ...DEFAULT_GOVERNANCE_CONFIG, sandbox_permeability: 'permeable' };
    expect(evaluateConstraint(config, c.expression)).toBe(true);
  });

  it('sandbox consistency passes for semi_permeable sandbox', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-sandbox-consistency');
    const config = { ...DEFAULT_GOVERNANCE_CONFIG, sandbox_permeability: 'semi_permeable' };
    expect(evaluateConstraint(config, c.expression)).toBe(true);
  });

  it('sandbox consistency warns for impermeable with non-zero advisory', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-sandbox-consistency');
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'impermeable',
      advisory_warning_threshold_percent: 20,
    };
    expect(evaluateConstraint(config, c.expression)).toBe(false);
  });

  it('sandbox consistency passes for impermeable with zero advisory', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-sandbox-consistency');
    const config = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      sandbox_permeability: 'impermeable',
      advisory_warning_threshold_percent: 0,
    };
    expect(evaluateConstraint(config, c.expression)).toBe(true);
  });

  it('existing tier ordering constraint still passes for default config', () => {
    const c = constraintFile.constraints.find((c: { id: string }) => c.id === 'governance-tier-ordering');
    expect(evaluateConstraint(DEFAULT_GOVERNANCE_CONFIG, c.expression)).toBe(true);
  });
});
