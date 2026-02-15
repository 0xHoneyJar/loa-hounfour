import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { HealthStatusSchema } from '../../src/schemas/health-status.js';

const VECTORS_DIR = join(__dirname, '../../vectors/health');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('HealthStatus Golden Vectors (v3.1.0)', () => {
  const data = loadVectors('health-status.json');

  describe('valid statuses', () => {
    for (const v of data.valid_statuses as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(HealthStatusSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid statuses', () => {
    for (const v of data.invalid_statuses as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(HealthStatusSchema, v.data);
        expect(result.valid).toBe(false);
      });
    }
  });
});
