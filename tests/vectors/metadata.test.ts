import { describe, it, expect } from 'vitest';
import {
  METADATA_NAMESPACES,
  MODEL_METADATA_KEYS,
} from '../../src/vocabulary/metadata.js';

describe('Metadata Namespaces (v2.4.0)', () => {
  it('includes model namespace alongside existing namespaces', () => {
    expect(METADATA_NAMESPACES.PROTOCOL).toBe('loa.');
    expect(METADATA_NAMESPACES.TRACE).toBe('trace.');
    expect(METADATA_NAMESPACES.MODEL).toBe('model.');
    expect(METADATA_NAMESPACES.CONSUMER).toBe('x-');
  });

  it('has exactly 4 namespaces', () => {
    expect(Object.keys(METADATA_NAMESPACES)).toHaveLength(4);
  });

  it('all namespace values are non-empty strings', () => {
    for (const [key, value] of Object.entries(METADATA_NAMESPACES)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('Model Metadata Keys (BB-C4-ADV-004)', () => {
  it('defines expected keys', () => {
    expect(MODEL_METADATA_KEYS.ID).toBe('model.id');
    expect(MODEL_METADATA_KEYS.PROVIDER).toBe('model.provider');
    expect(MODEL_METADATA_KEYS.THINKING_TRACE_AVAILABLE).toBe('model.thinking_trace_available');
    expect(MODEL_METADATA_KEYS.CONTEXT_WINDOW_USED).toBe('model.context_window_used');
  });

  it('all keys start with model. namespace prefix', () => {
    for (const value of Object.values(MODEL_METADATA_KEYS)) {
      expect(value).toMatch(/^model\./);
    }
  });

  it('has exactly 4 documented keys', () => {
    expect(Object.keys(MODEL_METADATA_KEYS)).toHaveLength(4);
  });
});
