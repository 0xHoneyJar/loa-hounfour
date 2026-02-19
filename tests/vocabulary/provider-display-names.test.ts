import { describe, it, expect } from 'vitest';
import {
  PROVIDER_DISPLAY_NAMES,
  getProviderDisplayName,
} from '../../src/vocabulary/provider-display-names.js';
import { KNOWN_PROVIDER_TYPES } from '../../src/schemas/model/routing/provider-type.js';

describe('PROVIDER_DISPLAY_NAMES', () => {
  it('maps claude-code to Anthropic (Claude Code)', () => {
    expect(PROVIDER_DISPLAY_NAMES['claude-code']).toBe('Anthropic (Claude Code)');
  });

  it('maps anthropic to Anthropic', () => {
    expect(PROVIDER_DISPLAY_NAMES.anthropic).toBe('Anthropic');
  });

  it('maps openai to OpenAI', () => {
    expect(PROVIDER_DISPLAY_NAMES.openai).toBe('OpenAI');
  });

  it('maps google to Google', () => {
    expect(PROVIDER_DISPLAY_NAMES.google).toBe('Google');
  });

  it('maps custom to Custom Provider', () => {
    expect(PROVIDER_DISPLAY_NAMES.custom).toBe('Custom Provider');
  });

  it('covers all known provider types', () => {
    for (const type of KNOWN_PROVIDER_TYPES) {
      expect(PROVIDER_DISPLAY_NAMES[type]).toBeDefined();
      expect(typeof PROVIDER_DISPLAY_NAMES[type]).toBe('string');
    }
  });
});

describe('getProviderDisplayName', () => {
  it('returns display name for known types', () => {
    expect(getProviderDisplayName('anthropic')).toBe('Anthropic');
    expect(getProviderDisplayName('openai')).toBe('OpenAI');
  });

  it('returns fallback for unknown types', () => {
    expect(getProviderDisplayName('aws')).toBe('Unknown (aws)');
    expect(getProviderDisplayName('azure')).toBe('Unknown (azure)');
  });
});
