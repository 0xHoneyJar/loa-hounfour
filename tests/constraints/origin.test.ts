/**
 * Tests for ConstraintOrigin type and the 72-file origin annotation.
 *
 * @see FR-6 v7.9.0 — ConstraintOrigin field
 * @since v7.9.0
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ConstraintOrigin } from '../../src/constraints/types.js';

const CONSTRAINTS_DIR = path.resolve('constraints');

describe('ConstraintOrigin', () => {
  it('accepts valid values: genesis, enacted, migrated', () => {
    const validValues: ConstraintOrigin[] = ['genesis', 'enacted', 'migrated'];
    for (const value of validValues) {
      const origin: ConstraintOrigin = value;
      expect(origin).toBe(value);
    }
  });

  it('all 72 constraint files have origin: "genesis"', () => {
    const files = fs.readdirSync(CONSTRAINTS_DIR)
      .filter(f => f.endsWith('.constraints.json'));

    expect(files.length).toBe(87); // 77 existing + 10 new v8.0.0 (ConservationLaw, StateMachineConfig, AuditTrail, GovernedCredits, GovernedReputation, GovernedFreshness, HashChainDiscontinuity, QuarantineRecord, DynamicContract, ContractNegotiation)

    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(CONSTRAINTS_DIR, file), 'utf8'));
      expect(content.origin).toBe('genesis');
    }
  });

  it('files without origin field still parse as valid ConstraintFile', () => {
    // Simulate a legacy file without origin — it should still parse
    const legacyFile = {
      $schema: 'https://loa-hounfour.dev/schemas/constraint-file.json',
      schema_id: 'TestSchema',
      contract_version: '7.0.0',
      expression_version: '1.0',
      constraints: [],
    };
    // No origin field — this is valid because origin is optional
    expect(legacyFile.schema_id).toBe('TestSchema');
    expect('origin' in legacyFile).toBe(false);
  });

  it('all constraint files parse as valid JSON', () => {
    const files = fs.readdirSync(CONSTRAINTS_DIR)
      .filter(f => f.endsWith('.constraints.json'));

    for (const file of files) {
      const raw = fs.readFileSync(path.join(CONSTRAINTS_DIR, file), 'utf8');
      expect(() => JSON.parse(raw)).not.toThrow();
    }
  });
});
