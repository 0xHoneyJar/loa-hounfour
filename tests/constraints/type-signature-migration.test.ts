/**
 * Integration tests: verify all constraint files have type_signature (S2-T5).
 *
 * Reads every *.constraints.json file from constraints/ and checks that
 * each constraint carries a type_signature with valid ConstraintType values.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONSTRAINT_TYPES } from '../../src/constraints/constraint-types.js';

const CONSTRAINTS_DIR = join(import.meta.dirname, '../../constraints');

function loadAllConstraintFiles(): Array<{ filename: string; data: any }> {
  const files = readdirSync(CONSTRAINTS_DIR).filter(f => f.endsWith('.constraints.json'));
  return files.map(filename => ({
    filename,
    data: JSON.parse(readFileSync(join(CONSTRAINTS_DIR, filename), 'utf-8')),
  }));
}

const allFiles = loadAllConstraintFiles();

// Superset of valid types: the 8 ConstraintType primitives PLUS schema references
// and compound types used by Sprint 1 schemas (e.g., "string[]", "CapabilityScopedTrust", "integer").
const validTypeSet = new Set<string>([
  ...CONSTRAINT_TYPES,
  // Compound types from Sprint 1 migration
  'string[]',
  'integer',
  // Nullable types (v7.1.0 — ReputationAggregate, v7.7.0 — ProposalExecution)
  'number | null',
  'string | null',
  // Optional types (v7.3.0 — ReputationCredential, AccessPolicy)
  'string | undefined',
  'number | undefined',
]);

function isValidType(t: string): boolean {
  if (validTypeSet.has(t)) return true;
  // Allow uppercase-initial schema references (e.g., "CapabilityScopedTrust", "ConservationProperty[]")
  if (/^[A-Z]/.test(t)) return true;
  return false;
}

describe('type_signature migration (S2-T5)', () => {
  it('found constraint files', () => {
    expect(allFiles.length).toBe(77);
  });

  for (const { filename, data } of allFiles) {
    describe(filename, () => {
      it('has schema_id', () => {
        expect(data.schema_id).toBeDefined();
        expect(typeof data.schema_id).toBe('string');
        expect(data.schema_id.length).toBeGreaterThan(0);
      });

      it('has constraints array', () => {
        expect(Array.isArray(data.constraints)).toBe(true);
      });

      for (const constraint of data.constraints ?? []) {
        describe(`constraint ${constraint.id}`, () => {
          it('has type_signature', () => {
            expect(constraint.type_signature).toBeDefined();
            expect(typeof constraint.type_signature).toBe('object');
          });

          it('type_signature values are valid types', () => {
            if (!constraint.type_signature) return;
            for (const [field, type] of Object.entries(constraint.type_signature)) {
              expect(
                isValidType(type as string),
                `${constraint.id}: field '${field}' has invalid type '${type}'`,
              ).toBe(true);
            }
          });
        });
      }
    });
  }
});

describe('type_signature coverage statistics', () => {
  it('100% of constraints have type_signature', () => {
    let total = 0;
    let withSig = 0;
    for (const { data } of allFiles) {
      for (const c of data.constraints ?? []) {
        total++;
        if (c.type_signature) withSig++;
      }
    }
    expect(withSig).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  it('no constraint uses invalid type values', () => {
    const invalidEntries: string[] = [];
    for (const { filename, data } of allFiles) {
      for (const c of data.constraints ?? []) {
        if (!c.type_signature) continue;
        for (const [field, type] of Object.entries(c.type_signature)) {
          if (!isValidType(type as string)) {
            invalidEntries.push(`${filename}:${c.id}:${field}=${type}`);
          }
        }
      }
    }
    expect(invalidEntries).toEqual([]);
  });
});
