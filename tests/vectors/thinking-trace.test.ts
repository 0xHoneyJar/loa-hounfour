import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { ThinkingTraceSchema } from '../../src/schemas/thinking-trace.js';

const VECTORS_DIR = join(__dirname, '../../vectors/thinking');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('ThinkingTrace Golden Vectors (v3.1.0)', () => {
  const data = loadVectors('thinking-traces.json');

  describe('valid traces', () => {
    for (const v of data.valid_traces as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(ThinkingTraceSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid traces', () => {
    for (const v of data.invalid_traces as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(ThinkingTraceSchema, v.data);
        expect(result.valid).toBe(false);
      });
    }
  });
});
