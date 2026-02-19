/**
 * Tests for CapabilityScopedTrust, CapabilityScope vocabulary,
 * and scope-aware trust helper functions (S1-T5, S1-T7).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  CapabilityScopeSchema,
  CapabilityScopedTrustSchema,
  CAPABILITY_SCOPES,
  TRUST_LEVELS,
  trustLevelForScope,
  meetsThresholdForScope,
  effectiveTrustLevel,
  flatTrustToScoped,
  type CapabilityScopedTrust,
  type CapabilityScope,
  type TrustLevel,
} from '../../src/schemas/agent-identity.js';

const fullScopedTrust: CapabilityScopedTrust = {
  scopes: {
    billing: 'sovereign',
    governance: 'basic',
    inference: 'trusted',
    delegation: 'verified',
    audit: 'trusted',
    composition: 'basic',
  },
  default_level: 'untrusted',
};

describe('CapabilityScopeSchema', () => {
  it('has correct $id', () => {
    expect(CapabilityScopeSchema.$id).toBe('CapabilityScope');
  });

  for (const scope of CAPABILITY_SCOPES) {
    it(`accepts "${scope}"`, () => {
      expect(Value.Check(CapabilityScopeSchema, scope)).toBe(true);
    });
  }

  it('has exactly 6 scopes', () => {
    expect(CAPABILITY_SCOPES).toHaveLength(6);
  });

  it('rejects unknown scope', () => {
    expect(Value.Check(CapabilityScopeSchema, 'admin')).toBe(false);
  });
});

describe('CapabilityScopedTrustSchema', () => {
  it('has correct $id', () => {
    expect(CapabilityScopedTrustSchema.$id).toBe('CapabilityScopedTrust');
  });

  it('validates full scoped trust', () => {
    expect(Value.Check(CapabilityScopedTrustSchema, fullScopedTrust)).toBe(true);
  });

  it('validates partial scopes (fallback to default_level)', () => {
    const partial: CapabilityScopedTrust = {
      scopes: { billing: 'sovereign' } as CapabilityScopedTrust['scopes'],
      default_level: 'basic',
    };
    expect(Value.Check(CapabilityScopedTrustSchema, partial)).toBe(true);
  });

  it('validates empty scopes (all fall back to default_level)', () => {
    const empty: CapabilityScopedTrust = {
      scopes: {} as CapabilityScopedTrust['scopes'],
      default_level: 'verified',
    };
    expect(Value.Check(CapabilityScopedTrustSchema, empty)).toBe(true);
  });

  it('rejects missing default_level', () => {
    const noDefault = { scopes: { billing: 'sovereign' } };
    expect(Value.Check(CapabilityScopedTrustSchema, noDefault)).toBe(false);
  });

  it('rejects invalid trust level in scopes', () => {
    const invalid = {
      scopes: { billing: 'admin' },
      default_level: 'basic',
    };
    expect(Value.Check(CapabilityScopedTrustSchema, invalid)).toBe(false);
  });

  it('rejects additional properties', () => {
    const extra = { ...fullScopedTrust, extra: true };
    expect(Value.Check(CapabilityScopedTrustSchema, extra)).toBe(false);
  });
});

describe('trustLevelForScope', () => {
  it('returns explicit scope level', () => {
    expect(trustLevelForScope(fullScopedTrust, 'billing')).toBe('sovereign');
    expect(trustLevelForScope(fullScopedTrust, 'governance')).toBe('basic');
  });

  it('falls back to default_level for missing scope', () => {
    const partial: CapabilityScopedTrust = {
      scopes: { billing: 'sovereign' } as CapabilityScopedTrust['scopes'],
      default_level: 'basic',
    };
    expect(trustLevelForScope(partial, 'governance')).toBe('basic');
    expect(trustLevelForScope(partial, 'inference')).toBe('basic');
  });
});

describe('meetsThresholdForScope', () => {
  it('sovereign billing meets any threshold', () => {
    for (const t of TRUST_LEVELS) {
      expect(meetsThresholdForScope(fullScopedTrust, 'billing', t)).toBe(true);
    }
  });

  it('basic governance does not meet verified', () => {
    expect(meetsThresholdForScope(fullScopedTrust, 'governance', 'verified')).toBe(false);
  });

  it('verified delegation meets verified (delegation threshold)', () => {
    expect(meetsThresholdForScope(fullScopedTrust, 'delegation', 'verified')).toBe(true);
  });

  it('uses default_level for missing scope', () => {
    const partial: CapabilityScopedTrust = {
      scopes: {} as CapabilityScopedTrust['scopes'],
      default_level: 'trusted',
    };
    expect(meetsThresholdForScope(partial, 'billing', 'verified')).toBe(true);
    expect(meetsThresholdForScope(partial, 'billing', 'sovereign')).toBe(false);
  });
});

describe('effectiveTrustLevel', () => {
  it('returns minimum across all scopes', () => {
    // fullScopedTrust has default 'untrusted', but that only applies to missing scopes
    // All 6 scopes are defined, minimum is 'basic' (governance, composition)
    expect(effectiveTrustLevel(fullScopedTrust)).toBe('untrusted');
    // Wait — default_level is 'untrusted' which is lower. Since we compare all defined
    // scopes AND the default, the minimum considers the default_level too.
  });

  it('returns the flat level for flatTrustToScoped result', () => {
    for (const level of TRUST_LEVELS) {
      expect(effectiveTrustLevel(flatTrustToScoped(level))).toBe(level);
    }
  });

  it('handles mixed scopes correctly', () => {
    const mixed: CapabilityScopedTrust = {
      scopes: {
        billing: 'sovereign',
        governance: 'verified',
        inference: 'trusted',
        delegation: 'verified',
        audit: 'trusted',
        composition: 'basic',
      },
      default_level: 'basic',
    };
    expect(effectiveTrustLevel(mixed)).toBe('basic');
  });
});

describe('flatTrustToScoped', () => {
  it('sets all scopes to the given level', () => {
    const scoped = flatTrustToScoped('verified');
    for (const scope of CAPABILITY_SCOPES) {
      expect(scoped.scopes[scope]).toBe('verified');
    }
    expect(scoped.default_level).toBe('verified');
  });

  it('roundtrips: effectiveTrustLevel(flatTrustToScoped(level)) == level', () => {
    for (const level of TRUST_LEVELS) {
      expect(effectiveTrustLevel(flatTrustToScoped(level))).toBe(level);
    }
  });

  it('creates a valid CapabilityScopedTrust', () => {
    for (const level of TRUST_LEVELS) {
      const scoped = flatTrustToScoped(level);
      expect(Value.Check(CapabilityScopedTrustSchema, scoped)).toBe(true);
    }
  });
});
