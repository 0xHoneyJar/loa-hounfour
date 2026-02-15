/**
 * TEMPORAL_PROPERTIES structural specification tests.
 *
 * Validates that temporal property definitions have unique IDs, correct
 * type classifications, valid scope references, non-empty formal expressions,
 * and the expected count of safety and liveness properties.
 *
 * @see S2-T5 — v4.6.0 Formalization Release, Sprint 2
 */
import { describe, it, expect } from 'vitest';
import {
  TEMPORAL_PROPERTIES,
  type TemporalProperty,
  type PropertyType,
} from '../../src/vocabulary/temporal-properties.js';
import { STATE_MACHINES } from '../../src/vocabulary/state-machines.js';

// Known schema names referenced in property scopes
const KNOWN_SCHEMA_NAMES = new Set([
  'reputation',
  'economy',
  'sanction',
  'commons-dividend',
  'dispute',
]);

// STATE_MACHINES IDs
const STATE_MACHINE_IDS = new Set(Object.keys(STATE_MACHINES));

/**
 * Checks whether a scope string references valid STATE_MACHINES ids
 * or known schema names. Scopes may be comma-separated lists.
 */
function isValidScope(scope: string): boolean {
  const parts = scope.split(',').map((s) => s.trim());
  return parts.every(
    (part) => STATE_MACHINE_IDS.has(part) || KNOWN_SCHEMA_NAMES.has(part),
  );
}

// ---------------------------------------------------------------------------
// Specification tests
// ---------------------------------------------------------------------------

describe('TEMPORAL_PROPERTIES specification tests (S2-T5)', () => {
  it('all properties have unique ids', () => {
    const ids = new Set<string>();
    for (const prop of TEMPORAL_PROPERTIES) {
      expect(ids.has(prop.id), `duplicate property id: ${prop.id}`).toBe(false);
      ids.add(prop.id);
    }
  });

  it('all safety properties have type "safety" and all liveness have type "liveness"', () => {
    const safetyProps = TEMPORAL_PROPERTIES.filter((p) => p.id.startsWith('S'));
    const livenessProps = TEMPORAL_PROPERTIES.filter((p) => p.id.startsWith('L'));

    for (const prop of safetyProps) {
      expect(prop.type, `property ${prop.id} should be safety`).toBe('safety');
    }

    for (const prop of livenessProps) {
      expect(prop.type, `property ${prop.id} should be liveness`).toBe('liveness');
    }
  });

  it('all properties reference valid STATE_MACHINES ids or known schema names in their scope', () => {
    for (const prop of TEMPORAL_PROPERTIES) {
      expect(
        isValidScope(prop.scope),
        `property ${prop.id} has invalid scope: "${prop.scope}"`,
      ).toBe(true);
    }
  });

  it('all properties have non-empty formal expression', () => {
    for (const prop of TEMPORAL_PROPERTIES) {
      expect(
        prop.formal.length,
        `property ${prop.id} has empty formal expression`,
      ).toBeGreaterThan(0);
    }
  });

  it('all 9 properties are testable', () => {
    for (const prop of TEMPORAL_PROPERTIES) {
      expect(
        prop.testable,
        `property ${prop.id} should be testable`,
      ).toBe(true);
    }
  });

  it('count check: at least 6 safety + 3 liveness', () => {
    const safetyCount = TEMPORAL_PROPERTIES.filter((p) => p.type === 'safety').length;
    const livenessCount = TEMPORAL_PROPERTIES.filter((p) => p.type === 'liveness').length;

    expect(safetyCount).toBeGreaterThanOrEqual(6);
    expect(livenessCount).toBeGreaterThanOrEqual(3);
    expect(TEMPORAL_PROPERTIES.length).toBeGreaterThanOrEqual(9);
  });
});
