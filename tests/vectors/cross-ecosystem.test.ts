/**
 * Cross-ecosystem vector test harness (S4-T6).
 *
 * Reads all JSON files from vectors/cross-ecosystem/ and validates:
 * - valid:true vectors pass schema validation + cross-field validation
 * - valid:false vectors fail validation with expected errors
 *
 * Supports vector file formats:
 * - completion-valid.json / completion-invalid.json: request/result pairs or single-schema data
 * - billing-ensemble.json / billing-attribution.json: ensemble request/result pairs or single-schema data
 * - event-economy-flow.json / event-saga.json: multi-step event flows
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { CompletionRequestSchema } from '../../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../../src/schemas/model/completion-result.js';
import { EnsembleRequestSchema } from '../../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../../src/schemas/model/ensemble/ensemble-result.js';
import { DomainEventSchema } from '../../src/schemas/domain-event.js';
import { type TSchema } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VECTORS_DIR = join(import.meta.dirname!, '../../vectors/cross-ecosystem');

function loadVectorFiles(): Array<{ filename: string; data: Record<string, unknown> }> {
  const files = readdirSync(VECTORS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((filename) => {
    const raw = readFileSync(join(VECTORS_DIR, filename), 'utf-8');
    return { filename, data: JSON.parse(raw) };
  });
}

function getSchema(schemaName: string): TSchema {
  const schemas: Record<string, TSchema> = {
    CompletionRequest: CompletionRequestSchema,
    CompletionResult: CompletionResultSchema,
    EnsembleRequest: EnsembleRequestSchema,
    EnsembleResult: EnsembleResultSchema,
    DomainEvent: DomainEventSchema,
  };
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Unknown schema: ${schemaName}`);
  return schema;
}

// ---------------------------------------------------------------------------
// Load all vector files
// ---------------------------------------------------------------------------

const vectorFiles = loadVectorFiles();

// ---------------------------------------------------------------------------
// Completion Valid Vectors
// ---------------------------------------------------------------------------

describe('Cross-ecosystem: completion-valid.json', () => {
  const file = vectorFiles.find((f) => f.filename === 'completion-valid.json');
  if (!file) {
    it.skip('completion-valid.json not found', () => {});
    return;
  }

  const vectors = (file.data as { vectors: Array<Record<string, unknown>> }).vectors;

  for (const vector of vectors) {
    const id = vector.id as string;

    it(`${id}: request validates against CompletionRequest`, () => {
      const result = validate(CompletionRequestSchema, vector.request);
      expect(result.valid).toBe(true);
    });

    it(`${id}: result validates against CompletionResult`, () => {
      const result = validate(CompletionResultSchema, vector.result);
      expect(result.valid).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Completion Invalid Vectors
// ---------------------------------------------------------------------------

describe('Cross-ecosystem: completion-invalid.json', () => {
  const file = vectorFiles.find((f) => f.filename === 'completion-invalid.json');
  if (!file) {
    it.skip('completion-invalid.json not found', () => {});
    return;
  }

  const vectors = (file.data as { vectors: Array<Record<string, unknown>> }).vectors;

  for (const vector of vectors) {
    const id = vector.id as string;
    const schemaName = vector.schema as string;
    const expectedErrors = vector.expected_errors as string[];

    it(`${id}: fails validation against ${schemaName}`, () => {
      const schema = getSchema(schemaName);
      const result = validate(schema, vector.data);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        // At least one expected error substring should match
        const allErrors = result.errors.join(' ');
        for (const expected of expectedErrors) {
          expect(allErrors).toContain(expected);
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Billing Ensemble Vectors
// ---------------------------------------------------------------------------

describe('Cross-ecosystem: billing-ensemble.json', () => {
  const file = vectorFiles.find((f) => f.filename === 'billing-ensemble.json');
  if (!file) {
    it.skip('billing-ensemble.json not found', () => {});
    return;
  }

  const vectors = (file.data as { vectors: Array<Record<string, unknown>> }).vectors;

  for (const vector of vectors) {
    const id = vector.id as string;

    if (vector.valid === true) {
      it(`${id}: request validates against EnsembleRequest`, () => {
        const result = validate(EnsembleRequestSchema, vector.request);
        expect(result.valid).toBe(true);
      });

      it(`${id}: result validates against EnsembleResult`, () => {
        const result = validate(EnsembleResultSchema, vector.result);
        expect(result.valid).toBe(true);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Billing Attribution Vectors
// ---------------------------------------------------------------------------

describe('Cross-ecosystem: billing-attribution.json', () => {
  const file = vectorFiles.find((f) => f.filename === 'billing-attribution.json');
  if (!file) {
    it.skip('billing-attribution.json not found', () => {});
    return;
  }

  const vectors = (file.data as { vectors: Array<Record<string, unknown>> }).vectors;

  for (const vector of vectors) {
    const id = vector.id as string;

    if (vector.valid === false) {
      const schemaName = vector.schema as string;
      const expectedErrors = vector.expected_errors as string[];

      it(`${id}: fails validation against ${schemaName}`, () => {
        const schema = getSchema(schemaName);
        const result = validate(schema, vector.data);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          const allErrors = result.errors.join(' ');
          for (const expected of expectedErrors) {
            expect(allErrors).toContain(expected);
          }
        }
      });
    } else {
      it(`${id}: request validates against EnsembleRequest`, () => {
        const result = validate(EnsembleRequestSchema, vector.request);
        expect(result.valid).toBe(true);
      });

      it(`${id}: result validates against EnsembleResult`, () => {
        const result = validate(EnsembleResultSchema, vector.result);
        expect(result.valid).toBe(true);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Event Economy Flow Vectors
// ---------------------------------------------------------------------------

describe('Cross-ecosystem: event-economy-flow.json', () => {
  const file = vectorFiles.find((f) => f.filename === 'event-economy-flow.json');
  if (!file) {
    it.skip('event-economy-flow.json not found', () => {});
    return;
  }

  const vectors = (file.data as { vectors: Array<Record<string, unknown>> }).vectors;

  for (const vector of vectors) {
    const id = vector.id as string;
    const steps = vector.steps as Array<{ event: Record<string, unknown>; schema: string; valid: boolean }>;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      it(`${id} step ${i + 1}: ${step.valid ? 'validates' : 'fails'} against ${step.schema}`, () => {
        const schema = getSchema(step.schema);
        const result = validate(schema, step.event);
        expect(result.valid).toBe(step.valid);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Event Saga Vectors
// ---------------------------------------------------------------------------

describe('Cross-ecosystem: event-saga.json', () => {
  const file = vectorFiles.find((f) => f.filename === 'event-saga.json');
  if (!file) {
    it.skip('event-saga.json not found', () => {});
    return;
  }

  const vectors = (file.data as { vectors: Array<Record<string, unknown>> }).vectors;

  for (const vector of vectors) {
    const id = vector.id as string;
    const steps = vector.steps as Array<{ event: Record<string, unknown>; schema: string; valid: boolean }>;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      it(`${id} step ${i + 1}: ${step.valid ? 'validates' : 'fails'} against ${step.schema}`, () => {
        const schema = getSchema(step.schema);
        const result = validate(schema, step.event);
        expect(result.valid).toBe(step.valid);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Meta: verify we have enough test coverage
// ---------------------------------------------------------------------------

describe('Cross-ecosystem vector coverage', () => {
  it('has at least 6 vector files', () => {
    expect(vectorFiles.length).toBeGreaterThanOrEqual(6);
  });

  it('generates at least 20 test cases from vector files', () => {
    let count = 0;

    for (const file of vectorFiles) {
      const data = file.data as Record<string, unknown>;
      const vectors = data.vectors as Array<Record<string, unknown>> | undefined;
      if (!vectors) continue;

      for (const vector of vectors) {
        if (vector.valid === false) {
          // Invalid vectors produce 1 test each
          count += 1;
        } else if (vector.request && vector.result) {
          // Valid request+result pairs produce 2 tests each
          count += 2;
        } else if (vector.steps) {
          // Flow/saga vectors produce 1 test per step
          count += (vector.steps as unknown[]).length;
        }
      }
    }

    expect(count).toBeGreaterThanOrEqual(20);
  });
});
