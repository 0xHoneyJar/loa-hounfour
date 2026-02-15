/**
 * Metadata namespace validation utility tests.
 *
 * Tests isValidMetadataKey and getNamespaceOwner for all known namespaces
 * and unknown key handling.
 *
 * @see S4-T5 — v4.6.0 Formalization Release
 */
import { describe, it, expect } from 'vitest';
import {
  isValidMetadataKey,
  getNamespaceOwner,
  METADATA_NAMESPACES,
} from '../../src/vocabulary/metadata.js';

// ---------------------------------------------------------------------------
// isValidMetadataKey
// ---------------------------------------------------------------------------

describe('isValidMetadataKey', () => {
  it('returns true for PROTOCOL namespace keys', () => {
    expect(isValidMetadataKey('loa.version')).toBe(true);
    expect(isValidMetadataKey('loa.contract')).toBe(true);
  });

  it('returns true for TRACE namespace keys', () => {
    expect(isValidMetadataKey('trace.id')).toBe(true);
    expect(isValidMetadataKey('trace.span_id')).toBe(true);
  });

  it('returns true for MODEL namespace keys', () => {
    expect(isValidMetadataKey('model.id')).toBe(true);
    expect(isValidMetadataKey('model.provider')).toBe(true);
  });

  it('returns true for CONSUMER namespace keys', () => {
    expect(isValidMetadataKey('x-custom')).toBe(true);
    expect(isValidMetadataKey('x-my-app-data')).toBe(true);
  });

  it('returns false for unknown namespace keys', () => {
    expect(isValidMetadataKey('unknown.key')).toBe(false);
    expect(isValidMetadataKey('custom.field')).toBe(false);
    expect(isValidMetadataKey('')).toBe(false);
    expect(isValidMetadataKey('plainkey')).toBe(false);
  });

  it('validates the exact prefix from METADATA_NAMESPACES', () => {
    for (const prefix of Object.values(METADATA_NAMESPACES)) {
      expect(isValidMetadataKey(`${prefix}test`)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getNamespaceOwner
// ---------------------------------------------------------------------------

describe('getNamespaceOwner', () => {
  it('returns "loa-hounfour" for PROTOCOL namespace', () => {
    expect(getNamespaceOwner('loa.version')).toBe('loa-hounfour');
    expect(getNamespaceOwner('loa.anything')).toBe('loa-hounfour');
  });

  it('returns "infrastructure" for TRACE namespace', () => {
    expect(getNamespaceOwner('trace.id')).toBe('infrastructure');
    expect(getNamespaceOwner('trace.span_id')).toBe('infrastructure');
  });

  it('returns "model" for MODEL namespace', () => {
    expect(getNamespaceOwner('model.id')).toBe('model');
    expect(getNamespaceOwner('model.provider')).toBe('model');
  });

  it('returns "consumer" for CONSUMER namespace', () => {
    expect(getNamespaceOwner('x-custom')).toBe('consumer');
    expect(getNamespaceOwner('x-my-app')).toBe('consumer');
  });

  it('returns undefined for unknown keys', () => {
    expect(getNamespaceOwner('unknown.key')).toBeUndefined();
    expect(getNamespaceOwner('custom.field')).toBeUndefined();
    expect(getNamespaceOwner('')).toBeUndefined();
    expect(getNamespaceOwner('plainkey')).toBeUndefined();
  });
});
