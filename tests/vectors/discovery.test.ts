import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import {
  ProtocolDiscoverySchema,
  buildDiscoveryDocument,
} from '../../src/schemas/discovery.js';
import {
  CapabilityQuerySchema,
  CapabilityResponseSchema,
} from '../../src/schemas/capability.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../../src/version.js';

const VECTORS_DIR = join(__dirname, '../../vectors/discovery');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('ProtocolDiscovery Golden Vectors', () => {
  const data = loadVectors('discovery.json');

  describe('valid discovery documents', () => {
    for (const v of data.valid_discovery as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(ProtocolDiscoverySchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid discovery documents', () => {
    for (const v of data.invalid_discovery as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(ProtocolDiscoverySchema, v.data);
        expect(result.valid).toBe(false);
      });
    }
  });
});

describe('buildDiscoveryDocument', () => {
  it('builds valid discovery document from schema IDs', () => {
    const doc = buildDiscoveryDocument(
      ['https://schemas.0xhoneyjar.com/loa-hounfour/2.3.0/domain-event'],
      ['agent', 'billing'],
    );
    expect(doc.contract_version).toBe(CONTRACT_VERSION);
    expect(doc.min_supported_version).toBe(MIN_SUPPORTED_VERSION);
    expect(doc.schemas).toHaveLength(1);
    expect(doc.supported_aggregates).toEqual(['agent', 'billing']);

    const result = validate(ProtocolDiscoverySchema, doc);
    expect(result.valid).toBe(true);
  });

  it('builds valid discovery without supported_aggregates', () => {
    const doc = buildDiscoveryDocument([]);
    expect(doc.supported_aggregates).toBeUndefined();

    const result = validate(ProtocolDiscoverySchema, doc);
    expect(result.valid).toBe(true);
  });

  it('builds valid discovery with capabilities_url', () => {
    const doc = buildDiscoveryDocument(
      ['https://schemas.0xhoneyjar.com/loa-hounfour/2.3.0/domain-event'],
      ['agent'],
      'https://api.0xhoneyjar.com/v1/capabilities',
    );
    expect(doc.capabilities_url).toBe('https://api.0xhoneyjar.com/v1/capabilities');

    const result = validate(ProtocolDiscoverySchema, doc);
    expect(result.valid).toBe(true);
  });

  it('omits capabilities_url when not provided', () => {
    const doc = buildDiscoveryDocument([]);
    expect(doc.capabilities_url).toBeUndefined();
  });

  it('throws on invalid schema IDs (BB-V3-F009)', () => {
    expect(() => buildDiscoveryDocument(['not-a-uri'])).toThrow(
      /Invalid schema IDs/,
    );
  });

  it('throws on mixed valid/invalid schema IDs', () => {
    expect(() => buildDiscoveryDocument([
      'https://schemas.0xhoneyjar.com/loa-hounfour/2.3.0/domain-event',
      'bad-uri',
    ])).toThrow(/bad-uri/);
  });

  it('throws on invalid capabilities_url', () => {
    expect(() => buildDiscoveryDocument([], undefined, 'not-a-url')).toThrow(
      /capabilities_url/,
    );
  });

  it('throws on http capabilities_url (must be https)', () => {
    expect(() => buildDiscoveryDocument([], undefined, 'http://insecure.example.com')).toThrow(
      /capabilities_url must be https/,
    );
  });
});

describe('Discovery → Capability Integration (BB-POST-003)', () => {
  it('demonstrates full discovery → capability flow', () => {
    // Step 1: Build discovery document with capabilities_url
    const doc = buildDiscoveryDocument(
      [
        'https://schemas.0xhoneyjar.com/loa-hounfour/2.3.0/domain-event',
        'https://schemas.0xhoneyjar.com/loa-hounfour/2.3.0/billing-entry',
      ],
      ['agent', 'billing', 'conversation'],
      'https://api.0xhoneyjar.com/v1/capabilities',
    );

    // Validate discovery document
    const discResult = validate(ProtocolDiscoverySchema, doc);
    expect(discResult.valid).toBe(true);

    // Step 2: Extract capabilities_url
    expect(doc.capabilities_url).toBe('https://api.0xhoneyjar.com/v1/capabilities');

    // Step 3: Construct a CapabilityQuery
    const query = {
      required_skills: ['text-generation', 'code-review'],
      preferred_models: ['claude-opus-4-6'],
      max_latency_ms: 5000,
    };
    const queryResult = validate(CapabilityQuerySchema, query);
    expect(queryResult.valid).toBe(true);

    // Step 4: Validate a mock CapabilityResponse
    const response = {
      agent_id: 'agent-loa-001',
      capabilities: [
        { skill_id: 'text-generation', input_modes: ['text'], output_modes: ['text'] },
        { skill_id: 'code-review', input_modes: ['text', 'code'], output_modes: ['text'] },
      ],
      available: true,
      contract_version: CONTRACT_VERSION,
      responded_at: '2026-02-14T10:00:00Z',
    };
    const respResult = validate(CapabilityResponseSchema, response);
    expect(respResult.valid).toBe(true);

    // Step 5: Verify contract_version matches across all three
    expect(doc.contract_version).toBe(response.contract_version);

    // Step 6: Verify responded_at is valid ISO 8601
    const parsed = new Date(response.responded_at);
    expect(parsed.getTime()).not.toBeNaN();
  });
});
