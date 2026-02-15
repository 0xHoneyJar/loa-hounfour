import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { DomainEventBatchSchema } from '../../src/schemas/domain-event.js';

const VECTORS_DIR = join(__dirname, '../../vectors/domain-event');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('DomainEventBatch Golden Vectors', () => {
  const data = loadVectors('batches.json');

  describe('valid batches', () => {
    for (const v of data.valid_batches as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(DomainEventBatchSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid batches', () => {
    for (const v of data.invalid_batches as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(DomainEventBatchSchema, v.data);
        expect(result.valid).toBe(false);
      });
    }
  });
});
