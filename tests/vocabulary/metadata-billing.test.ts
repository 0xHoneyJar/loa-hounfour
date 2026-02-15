/**
 * Billing metadata namespace tests (S4-T4).
 *
 * Validates the billing.* namespace addition to METADATA_NAMESPACES,
 * BILLING_METADATA_KEYS values, and getNamespaceOwner routing.
 */
import { describe, it, expect } from 'vitest';
import {
  isValidMetadataKey,
  getNamespaceOwner,
  METADATA_NAMESPACES,
  BILLING_METADATA_KEYS,
} from '../../src/vocabulary/metadata.js';

// ---------------------------------------------------------------------------
// METADATA_NAMESPACES.BILLING
// ---------------------------------------------------------------------------

describe('METADATA_NAMESPACES.BILLING', () => {
  it('has the billing namespace prefix', () => {
    expect(METADATA_NAMESPACES.BILLING).toBe('billing.');
  });

  it('is recognized by isValidMetadataKey', () => {
    expect(isValidMetadataKey('billing.entry_id')).toBe(true);
    expect(isValidMetadataKey('billing.cost_micro')).toBe(true);
    expect(isValidMetadataKey('billing.reconciled')).toBe(true);
    expect(isValidMetadataKey('billing.provider')).toBe(true);
    expect(isValidMetadataKey('billing.custom_field')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BILLING_METADATA_KEYS
// ---------------------------------------------------------------------------

describe('BILLING_METADATA_KEYS', () => {
  it('contains entry_id key', () => {
    expect(BILLING_METADATA_KEYS.ENTRY_ID).toBe('billing.entry_id');
  });

  it('contains cost_micro key', () => {
    expect(BILLING_METADATA_KEYS.COST_MICRO).toBe('billing.cost_micro');
  });

  it('contains reconciled key', () => {
    expect(BILLING_METADATA_KEYS.RECONCILED).toBe('billing.reconciled');
  });

  it('contains provider key', () => {
    expect(BILLING_METADATA_KEYS.PROVIDER).toBe('billing.provider');
  });

  it('all keys start with the billing namespace prefix', () => {
    for (const value of Object.values(BILLING_METADATA_KEYS)) {
      expect(value.startsWith(METADATA_NAMESPACES.BILLING)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getNamespaceOwner — billing.*
// ---------------------------------------------------------------------------

describe('getNamespaceOwner for billing namespace', () => {
  it('returns "economy" for billing.entry_id', () => {
    expect(getNamespaceOwner('billing.entry_id')).toBe('economy');
  });

  it('returns "economy" for billing.cost_micro', () => {
    expect(getNamespaceOwner('billing.cost_micro')).toBe('economy');
  });

  it('returns "economy" for billing.reconciled', () => {
    expect(getNamespaceOwner('billing.reconciled')).toBe('economy');
  });

  it('returns "economy" for billing.provider', () => {
    expect(getNamespaceOwner('billing.provider')).toBe('economy');
  });

  it('returns "economy" for any billing.* key', () => {
    expect(getNamespaceOwner('billing.anything')).toBe('economy');
  });

  it('does not return "economy" for non-billing keys', () => {
    expect(getNamespaceOwner('model.id')).not.toBe('economy');
    expect(getNamespaceOwner('loa.version')).not.toBe('economy');
    expect(getNamespaceOwner('trace.id')).not.toBe('economy');
  });
});
