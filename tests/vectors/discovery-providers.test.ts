/**
 * Tests for ProtocolDiscovery provider summary (v5.1.0).
 *
 * S4-T4: ProviderSummary, new discovery fields, buildDiscoveryDocument().
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ProtocolDiscoverySchema,
  ProviderSummarySchema,
  buildDiscoveryDocument,
  type ProviderSummary,
} from '../../src/schemas/discovery.js';
import { validate } from '../../src/validators/index.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../../src/version.js';

// ---------------------------------------------------------------------------
// ProviderSummarySchema
// ---------------------------------------------------------------------------

describe('ProviderSummarySchema', () => {
  it('accepts valid provider summary', () => {
    const summary: ProviderSummary = {
      provider: 'openai',
      model_count: 3,
    };
    expect(Value.Check(ProviderSummarySchema, summary)).toBe(true);
  });

  it('accepts provider summary with conformance_level', () => {
    const summary: ProviderSummary = {
      provider: 'anthropic',
      model_count: 2,
      conformance_level: 'protocol_certified',
    };
    expect(Value.Check(ProviderSummarySchema, summary)).toBe(true);
  });

  it('rejects empty provider name', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: '',
      model_count: 1,
    })).toBe(false);
  });

  it('rejects negative model_count', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: 'openai',
      model_count: -1,
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: 'openai',
      model_count: 1,
      extra: true,
    })).toBe(false);
  });

  // v5.2.0 — Marketplace discovery dimensions
  it('accepts provider with supports_reservations', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: 'anthropic',
      model_count: 3,
      supports_reservations: true,
    })).toBe(true);
  });

  it('accepts provider with reservation_enforcement', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: 'openai',
      model_count: 5,
      supports_reservations: true,
      reservation_enforcement: 'strict',
    })).toBe(true);
  });

  it('rejects invalid reservation_enforcement', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: 'openai',
      model_count: 1,
      reservation_enforcement: 'invalid',
    })).toBe(false);
  });

  it('accepts provider with total_capacity_tokens_per_minute', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: 'anthropic',
      model_count: 2,
      total_capacity_tokens_per_minute: 1000000,
    })).toBe(true);
  });

  it('rejects negative total_capacity_tokens_per_minute', () => {
    expect(Value.Check(ProviderSummarySchema, {
      provider: 'openai',
      model_count: 1,
      total_capacity_tokens_per_minute: -1,
    })).toBe(false);
  });

  it('accepts provider with all marketplace dimensions', () => {
    const summary: ProviderSummary = {
      provider: 'deepseek',
      model_count: 4,
      conformance_level: 'community_verified',
      supports_reservations: true,
      reservation_enforcement: 'advisory',
      total_capacity_tokens_per_minute: 500000,
    };
    expect(Value.Check(ProviderSummarySchema, summary)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ProtocolDiscovery with new v5.1.0 fields
// ---------------------------------------------------------------------------

describe('ProtocolDiscovery v5.1.0 fields', () => {
  it('accepts discovery document without new fields (backward compat)', () => {
    const doc = {
      contract_version: '5.1.0',
      min_supported_version: '5.0.0',
      schemas: ['https://schemas.example.com/test'],
    };
    expect(validate(ProtocolDiscoverySchema, doc).valid).toBe(true);
  });

  it('accepts discovery document with providers', () => {
    const doc = {
      contract_version: '5.1.0',
      min_supported_version: '5.0.0',
      schemas: ['https://schemas.example.com/test'],
      providers: [
        { provider: 'openai', model_count: 3 },
        { provider: 'anthropic', model_count: 2, conformance_level: 'protocol_certified' },
      ],
    };
    expect(validate(ProtocolDiscoverySchema, doc).valid).toBe(true);
  });

  it('accepts discovery document with conformance_suite_version', () => {
    const doc = {
      contract_version: '5.1.0',
      min_supported_version: '5.0.0',
      schemas: ['https://schemas.example.com/test'],
      conformance_suite_version: '5.1.0',
    };
    expect(validate(ProtocolDiscoverySchema, doc).valid).toBe(true);
  });

  it('rejects invalid conformance_suite_version format', () => {
    const doc = {
      contract_version: '5.1.0',
      min_supported_version: '5.0.0',
      schemas: ['https://schemas.example.com/test'],
      conformance_suite_version: 'not-semver',
    };
    expect(validate(ProtocolDiscoverySchema, doc).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildDiscoveryDocument — legacy + options API
// ---------------------------------------------------------------------------

describe('buildDiscoveryDocument', () => {
  const testSchemas = ['https://schemas.example.com/test'];

  it('legacy positional API still works', () => {
    const doc = buildDiscoveryDocument(testSchemas, ['agent', 'billing']);
    expect(doc.contract_version).toBe(CONTRACT_VERSION);
    expect(doc.min_supported_version).toBe(MIN_SUPPORTED_VERSION);
    expect(doc.supported_aggregates).toEqual(['agent', 'billing']);
    expect(doc.providers).toBeUndefined();
  });

  it('legacy positional API with capabilities URL', () => {
    const doc = buildDiscoveryDocument(
      testSchemas,
      ['agent'],
      'https://api.example.com/capabilities',
    );
    expect(doc.capabilities_url).toBe('https://api.example.com/capabilities');
  });

  it('options API with providers', () => {
    const providers: ProviderSummary[] = [
      { provider: 'openai', model_count: 3 },
      { provider: 'anthropic', model_count: 2, conformance_level: 'protocol_certified' },
    ];
    const doc = buildDiscoveryDocument(testSchemas, {
      aggregateTypes: ['agent'],
      providers,
      conformanceSuiteVersion: '5.1.0',
    });
    expect(doc.providers).toEqual(providers);
    expect(doc.conformance_suite_version).toBe('5.1.0');
    expect(doc.supported_aggregates).toEqual(['agent']);
  });

  it('options API without optional fields', () => {
    const doc = buildDiscoveryDocument(testSchemas, {});
    expect(doc.providers).toBeUndefined();
    expect(doc.conformance_suite_version).toBeUndefined();
    expect(doc.supported_aggregates).toBeUndefined();
  });

  it('still validates schema IDs', () => {
    expect(() => buildDiscoveryDocument(['not-a-url'], {}))
      .toThrow('Invalid schema IDs');
  });

  it('still validates capabilities URL', () => {
    expect(() => buildDiscoveryDocument(testSchemas, {
      capabilitiesUrl: 'http://insecure.example.com',
    })).toThrow('capabilities_url must be https://');
  });

  it('result validates against ProtocolDiscoverySchema', () => {
    const doc = buildDiscoveryDocument(testSchemas, {
      aggregateTypes: ['agent'],
      providers: [{ provider: 'openai', model_count: 1 }],
      conformanceSuiteVersion: '5.1.0',
    });
    expect(validate(ProtocolDiscoverySchema, doc).valid).toBe(true);
  });
});
