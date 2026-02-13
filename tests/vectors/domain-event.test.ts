import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { DomainEventSchema } from '../../src/schemas/domain-event.js';
import { ERROR_CODES, ERROR_HTTP_STATUS } from '../../src/vocabulary/errors.js';

const VECTORS_DIR = join(__dirname, '../../vectors/domain-event');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('DomainEvent Golden Vectors', () => {
  const data = loadVectors('events.json');

  describe('valid events', () => {
    for (const v of data.valid_events as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(DomainEventSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid events', () => {
    for (const v of data.invalid as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(DomainEventSchema, v.data);
        expect(result.valid).toBe(false);
      });
    }
  });
});

describe('Error Codes v2.0.0', () => {
  it('has 38 total error codes (31 existing + 7 new)', () => {
    expect(Object.keys(ERROR_CODES)).toHaveLength(38);
  });

  it('every error code has an HTTP status mapping', () => {
    for (const code of Object.values(ERROR_CODES)) {
      expect(ERROR_HTTP_STATUS[code]).toBeDefined();
    }
  });

  it('includes v2.0.0 agent error codes', () => {
    expect(ERROR_CODES.AGENT_NOT_FOUND).toBe('AGENT_NOT_FOUND');
    expect(ERROR_CODES.AGENT_NOT_ACTIVE).toBe('AGENT_NOT_ACTIVE');
    expect(ERROR_CODES.AGENT_TRANSFER_IN_PROGRESS).toBe('AGENT_TRANSFER_IN_PROGRESS');
  });

  it('includes v2.0.0 conversation error codes', () => {
    expect(ERROR_CODES.CONVERSATION_SEALED).toBe('CONVERSATION_SEALED');
    expect(ERROR_CODES.CONVERSATION_NOT_FOUND).toBe('CONVERSATION_NOT_FOUND');
  });

  it('includes v2.0.0 billing error codes', () => {
    expect(ERROR_CODES.BILLING_RECIPIENTS_INVALID).toBe('BILLING_RECIPIENTS_INVALID');
    expect(ERROR_CODES.OWNERSHIP_MISMATCH).toBe('OWNERSHIP_MISMATCH');
  });
});
