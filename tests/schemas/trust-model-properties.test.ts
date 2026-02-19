/**
 * Property-based tests and compile-time type safety tests for the
 * v6.0.0 trust model (S1-T9).
 *
 * Validates invariants that must hold for all possible inputs,
 * not just specific examples.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  TRUST_LEVELS,
  CAPABILITY_SCOPES,
  CapabilityScopedTrustSchema,
  effectiveTrustLevel,
  flatTrustToScoped,
  trustLevelForScope,
  meetsThresholdForScope,
  type TrustLevel,
  type CapabilityScopedTrust,
  type CapabilityScope,
} from '../../src/schemas/agent-identity.js';
import {
  LivenessPropertySchema,
  CANONICAL_LIVENESS_PROPERTIES,
} from '../../src/integrity/liveness-properties.js';

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Property: effectiveTrustLevel(flatTrustToScoped(level)) == level', () => {
  for (const level of TRUST_LEVELS) {
    it(`roundtrips for ${level}`, () => {
      expect(effectiveTrustLevel(flatTrustToScoped(level))).toBe(level);
    });
  }
});

describe('Property: trustLevelForScope returns scope or default', () => {
  for (const scope of CAPABILITY_SCOPES) {
    it(`trustLevelForScope with explicit ${scope} returns that value`, () => {
      const trust: CapabilityScopedTrust = {
        scopes: { [scope]: 'sovereign' } as CapabilityScopedTrust['scopes'],
        default_level: 'untrusted',
      };
      expect(trustLevelForScope(trust, scope)).toBe('sovereign');
    });
  }

  it('returns default_level for unset scopes', () => {
    const trust: CapabilityScopedTrust = {
      scopes: {} as CapabilityScopedTrust['scopes'],
      default_level: 'verified',
    };
    for (const scope of CAPABILITY_SCOPES) {
      expect(trustLevelForScope(trust, scope)).toBe('verified');
    }
  });
});

describe('Property: meetsThresholdForScope is reflexive', () => {
  for (const level of TRUST_LEVELS) {
    it(`${level} meets its own threshold`, () => {
      const trust = flatTrustToScoped(level);
      for (const scope of CAPABILITY_SCOPES) {
        expect(meetsThresholdForScope(trust, scope, level)).toBe(true);
      }
    });
  }
});

describe('Property: scoped trust roundtrip consistency', () => {
  it('flatTrustToScoped produces valid CapabilityScopedTrust for all levels', () => {
    for (const level of TRUST_LEVELS) {
      const scoped = flatTrustToScoped(level);
      expect(Value.Check(CapabilityScopedTrustSchema, scoped)).toBe(true);
    }
  });

  it('all scopes set to same level yields that level as effective', () => {
    for (const level of TRUST_LEVELS) {
      const scoped = flatTrustToScoped(level);
      // Every scope should resolve to the same level
      for (const scope of CAPABILITY_SCOPES) {
        expect(trustLevelForScope(scoped, scope)).toBe(level);
      }
    }
  });
});

describe('Property: random liveness properties with valid companion_safety validate', () => {
  it('all canonical liveness properties pass LivenessPropertySchema', () => {
    for (const prop of CANONICAL_LIVENESS_PROPERTIES) {
      expect(
        Value.Check(LivenessPropertySchema, prop),
        `${prop.liveness_id} failed validation`,
      ).toBe(true);
    }
  });

  it('synthetically-generated liveness property with valid fields passes', () => {
    // Generate a valid liveness property programmatically
    const universes = ['single_lot', 'account', 'platform', 'bilateral'] as const;
    const behaviors = ['reaper', 'escalation', 'reconciliation', 'manual'] as const;
    const severities = ['critical', 'error', 'warning'] as const;

    for (let i = 0; i < universes.length; i++) {
      const synthetic = {
        liveness_id: `L-${i + 10}`,
        name: `Synthetic liveness ${i}`,
        description: `Synthetic liveness description ${i}`,
        ltl_formula: `G(pending => F_t(${(i + 1) * 1000}, done))`,
        companion_safety: `I-${i + 1}`,
        universe: universes[i],
        timeout_behavior: behaviors[i],
        timeout_seconds: (i + 1) * 1000,
        error_codes: [`SYNTHETIC_TIMEOUT_${i}`],
        severity: severities[i % severities.length],
        contract_version: '6.0.0',
      };
      expect(
        Value.Check(LivenessPropertySchema, synthetic),
        `Synthetic liveness ${i} failed validation`,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Compile-time type tests (@ts-expect-error)
// ---------------------------------------------------------------------------

describe('Compile-time type safety', () => {
  it('cannot assign TrustLevel directly to CapabilityScopedTrust', () => {
    // @ts-expect-error — TrustLevel is not assignable to CapabilityScopedTrust
    const _badTrust: CapabilityScopedTrust = 'verified' as TrustLevel;
    expect(_badTrust).toBeDefined(); // runtime doesn't matter, type check does
  });

  it('cannot assign CapabilityScopedTrust where TrustLevel expected', () => {
    const scoped = flatTrustToScoped('verified');
    // @ts-expect-error — CapabilityScopedTrust is not assignable to TrustLevel
    const _badLevel: TrustLevel = scoped;
    expect(_badLevel).toBeDefined();
  });

  it('cannot use invalid scope name', () => {
    // @ts-expect-error — 'admin' is not a valid CapabilityScope
    const _badScope: CapabilityScope = 'admin';
    expect(_badScope).toBeDefined();
  });
});
