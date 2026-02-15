/**
 * ECONOMIC_CHOREOGRAPHY saga context tests.
 *
 * Verifies that all choreography entries have saga context with non-empty fields.
 *
 * @see S4-T3 — v4.6.0 Formalization Release
 */
import { describe, it, expect } from 'vitest';
import {
  ECONOMIC_CHOREOGRAPHY,
  type EconomicScenarioChoreography,
} from '../../src/vocabulary/economic-choreography.js';

// ---------------------------------------------------------------------------
// Saga context presence and content
// ---------------------------------------------------------------------------

describe('ECONOMIC_CHOREOGRAPHY saga context', () => {
  const scenarioNames = Object.keys(ECONOMIC_CHOREOGRAPHY);

  it('has exactly 3 scenarios (stake, escrow, mutual_credit)', () => {
    expect(scenarioNames).toHaveLength(3);
    expect(scenarioNames).toContain('stake');
    expect(scenarioNames).toContain('escrow');
    expect(scenarioNames).toContain('mutual_credit');
  });

  for (const name of scenarioNames) {
    describe(`scenario: ${name}`, () => {
      const scenario: EconomicScenarioChoreography = ECONOMIC_CHOREOGRAPHY[name];

      it('has saga context defined', () => {
        expect(scenario.saga).toBeDefined();
      });

      it('saga.compensation_trigger is a non-empty string', () => {
        expect(typeof scenario.saga!.compensation_trigger).toBe('string');
        expect(scenario.saga!.compensation_trigger.length).toBeGreaterThan(0);
      });

      it('saga.idempotency is a non-empty string', () => {
        expect(typeof scenario.saga!.idempotency).toBe('string');
        expect(scenario.saga!.idempotency.length).toBeGreaterThan(0);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Backward compatibility: existing fields are still present
// ---------------------------------------------------------------------------

describe('ECONOMIC_CHOREOGRAPHY backward compatibility', () => {
  for (const name of Object.keys(ECONOMIC_CHOREOGRAPHY)) {
    const scenario = ECONOMIC_CHOREOGRAPHY[name];

    it(`${name} still has forward array`, () => {
      expect(Array.isArray(scenario.forward)).toBe(true);
      expect(scenario.forward.length).toBeGreaterThan(0);
    });

    it(`${name} still has compensation array`, () => {
      expect(Array.isArray(scenario.compensation)).toBe(true);
      expect(scenario.compensation.length).toBeGreaterThan(0);
    });

    it(`${name} still has invariants array`, () => {
      expect(Array.isArray(scenario.invariants)).toBe(true);
      expect(scenario.invariants.length).toBeGreaterThan(0);
    });
  }
});
