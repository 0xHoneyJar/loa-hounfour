import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ProviderTypeSchema,
  KNOWN_PROVIDER_TYPES,
  isKnownProviderType,
} from '../../src/schemas/model/routing/provider-type.js';

describe('ProviderTypeSchema', () => {
  // Original v5.0.0 values
  it('accepts claude-code', () => {
    expect(Value.Check(ProviderTypeSchema, 'claude-code')).toBe(true);
  });

  it('accepts openai', () => {
    expect(Value.Check(ProviderTypeSchema, 'openai')).toBe(true);
  });

  it('accepts openai-compatible', () => {
    expect(Value.Check(ProviderTypeSchema, 'openai-compatible')).toBe(true);
  });

  // v5.1.0 additions
  it('accepts anthropic', () => {
    expect(Value.Check(ProviderTypeSchema, 'anthropic')).toBe(true);
  });

  it('accepts google', () => {
    expect(Value.Check(ProviderTypeSchema, 'google')).toBe(true);
  });

  it('accepts custom', () => {
    expect(Value.Check(ProviderTypeSchema, 'custom')).toBe(true);
  });

  // Rejection tests
  it('rejects unknown provider types', () => {
    expect(Value.Check(ProviderTypeSchema, 'aws')).toBe(false);
    expect(Value.Check(ProviderTypeSchema, 'azure')).toBe(false);
    expect(Value.Check(ProviderTypeSchema, '')).toBe(false);
  });

  it('rejects case-variant values', () => {
    expect(Value.Check(ProviderTypeSchema, 'Anthropic')).toBe(false);
    expect(Value.Check(ProviderTypeSchema, 'OPENAI')).toBe(false);
    expect(Value.Check(ProviderTypeSchema, 'Google')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(ProviderTypeSchema, 42)).toBe(false);
    expect(Value.Check(ProviderTypeSchema, null)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ProviderTypeSchema.$id).toBe('ProviderType');
  });
});

describe('KNOWN_PROVIDER_TYPES', () => {
  it('contains all 6 values', () => {
    expect(KNOWN_PROVIDER_TYPES).toHaveLength(6);
  });

  it('contains original v5.0.0 values', () => {
    expect(KNOWN_PROVIDER_TYPES).toContain('claude-code');
    expect(KNOWN_PROVIDER_TYPES).toContain('openai');
    expect(KNOWN_PROVIDER_TYPES).toContain('openai-compatible');
  });

  it('contains v5.1.0 additions', () => {
    expect(KNOWN_PROVIDER_TYPES).toContain('anthropic');
    expect(KNOWN_PROVIDER_TYPES).toContain('google');
    expect(KNOWN_PROVIDER_TYPES).toContain('custom');
  });
});

describe('isKnownProviderType', () => {
  it('returns true for all known types', () => {
    for (const type of KNOWN_PROVIDER_TYPES) {
      expect(isKnownProviderType(type)).toBe(true);
    }
  });

  it('returns false for unknown types', () => {
    expect(isKnownProviderType('aws')).toBe(false);
    expect(isKnownProviderType('azure')).toBe(false);
    expect(isKnownProviderType('')).toBe(false);
    expect(isKnownProviderType('OPENAI')).toBe(false);
  });

  it('narrows type correctly', () => {
    const value: string = 'anthropic';
    if (isKnownProviderType(value)) {
      // TypeScript should narrow to ProviderType
      const _providerType: string = value;
      expect(_providerType).toBe('anthropic');
    }
  });
});
