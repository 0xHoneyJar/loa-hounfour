import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import {
  ProtocolDiscoverySchema,
  buildDiscoveryDocument,
} from '../../src/schemas/discovery.js';
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
      ['https://schemas.0xhoneyjar.com/loa-hounfour/2.2.0/domain-event'],
      ['agent', 'billing'],
    );
    expect(doc.contract_version).toBe(CONTRACT_VERSION);
    expect(doc.min_supported_version).toBe(MIN_SUPPORTED_VERSION);
    expect(doc.schemas).toHaveLength(1);
    expect(doc.capabilities).toEqual(['agent', 'billing']);

    const result = validate(ProtocolDiscoverySchema, doc);
    expect(result.valid).toBe(true);
  });

  it('builds valid discovery without capabilities', () => {
    const doc = buildDiscoveryDocument([]);
    expect(doc.capabilities).toBeUndefined();

    const result = validate(ProtocolDiscoverySchema, doc);
    expect(result.valid).toBe(true);
  });
});
