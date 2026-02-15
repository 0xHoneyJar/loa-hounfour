/**
 * Deprecation registry tests.
 *
 * Tests the empty initial registry and verifies both utility functions
 * work correctly, including with synthetic entries.
 *
 * @see S4-T4 — v4.6.0 Formalization Release
 */
import { describe, it, expect } from 'vitest';
import {
  DEPRECATION_REGISTRY,
  getDeprecatedSchemas,
  isDeprecated,
  type DeprecationEntry,
} from '../../src/vocabulary/deprecation.js';

// ---------------------------------------------------------------------------
// Empty registry behavior
// ---------------------------------------------------------------------------

describe('DEPRECATION_REGISTRY (empty)', () => {
  it('starts as an empty array', () => {
    expect(DEPRECATION_REGISTRY).toEqual([]);
    expect(DEPRECATION_REGISTRY).toHaveLength(0);
  });

  it('getDeprecatedSchemas returns empty array', () => {
    expect(getDeprecatedSchemas()).toEqual([]);
  });

  it('isDeprecated returns false for any schema', () => {
    expect(isDeprecated('PerformanceRecord')).toBe(false);
    expect(isDeprecated('ReputationScore')).toBe(false);
    expect(isDeprecated('nonexistent')).toBe(false);
    expect(isDeprecated('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Synthetic entry verification (unit test for functions)
// ---------------------------------------------------------------------------

describe('deprecation utility functions with synthetic entries', () => {
  // Test the real exported functions with a custom registry parameter (BB-C9-005).

  const syntheticRegistry: readonly DeprecationEntry[] = [
    {
      schema_id: 'LegacySchema',
      deprecated_in: '4.0.0',
      removal_target: '5.0.0',
      migration_guide: 'Use NewSchema instead. See migration docs.',
      replacement: 'NewSchema',
    },
    {
      schema_id: 'OldBilling',
      deprecated_in: '3.5.0',
      removal_target: '4.0.0',
      migration_guide: 'Migrate to BillingEntry v2.',
    },
  ];

  it('getDeprecatedSchemas returns all schema_ids from custom registry', () => {
    const result = getDeprecatedSchemas(syntheticRegistry);
    expect(result).toEqual(['LegacySchema', 'OldBilling']);
  });

  it('isDeprecated returns true for registered schemas in custom registry', () => {
    expect(isDeprecated('LegacySchema', syntheticRegistry)).toBe(true);
    expect(isDeprecated('OldBilling', syntheticRegistry)).toBe(true);
  });

  it('isDeprecated returns false for unregistered schemas in custom registry', () => {
    expect(isDeprecated('PerformanceRecord', syntheticRegistry)).toBe(false);
    expect(isDeprecated('nonexistent', syntheticRegistry)).toBe(false);
  });

  it('DeprecationEntry replacement field is optional', () => {
    const withReplacement = syntheticRegistry.find(e => e.schema_id === 'LegacySchema');
    const withoutReplacement = syntheticRegistry.find(e => e.schema_id === 'OldBilling');
    expect(withReplacement!.replacement).toBe('NewSchema');
    expect(withoutReplacement!.replacement).toBeUndefined();
  });
});
