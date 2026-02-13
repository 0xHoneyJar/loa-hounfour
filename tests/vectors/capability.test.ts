import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import {
  CapabilitySchema,
  CapabilityQuerySchema,
  CapabilityResponseSchema,
} from '../../src/schemas/capability.js';

const VECTORS_DIR = join(__dirname, '../../vectors/capability');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('Capability Golden Vectors', () => {
  const data = loadVectors('capabilities.json');

  describe('valid capabilities', () => {
    for (const v of data.valid_capabilities as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(CapabilitySchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('valid queries', () => {
    for (const v of data.valid_queries as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(CapabilityQuerySchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('valid responses', () => {
    for (const v of data.valid_responses as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(CapabilityResponseSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid responses', () => {
    for (const v of data.invalid_responses as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(CapabilityResponseSchema, v.data);
        expect(result.valid).toBe(false);
      });
    }
  });
});
