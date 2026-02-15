import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { LifecycleTransitionPayloadSchema } from '../../src/schemas/lifecycle-event-payload.js';

const VECTORS_DIR = join(__dirname, '../../vectors/agent');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('LifecycleTransitionPayload Golden Vectors', () => {
  const data = loadVectors('lifecycle-payloads.json');

  describe('valid payloads', () => {
    for (const v of data.valid_payloads as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(LifecycleTransitionPayloadSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid payloads', () => {
    for (const v of data.invalid_payloads as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(LifecycleTransitionPayloadSchema, v.data);
        expect(result.valid).toBe(false);
      });
    }
  });
});
