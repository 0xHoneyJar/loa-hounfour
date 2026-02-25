/**
 * Property-based tests for ReputationEvent discrimination completeness.
 *
 * Verifies:
 * - Exactly one variant matches per valid event (no ambiguity)
 * - model_id roundtrip (encode → decode preserves value)
 * - No payload can match two variants simultaneously (Flatline SKP-002)
 *
 * @see Sprint T1.17 — discrimination completeness property test
 * @since v8.2.0
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  ReputationEventSchema,
  QualitySignalEventSchema,
  TaskCompletedEventSchema,
  CredentialUpdateEventSchema,
  ModelPerformanceEventSchema,
} from '../../src/governance/reputation-event.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const envelopeArb = fc.record({
  event_id: fc.uuid(),
  agent_id: fc.stringMatching(/^[a-z][a-z0-9-]{0,99}$/),
  collection_id: fc.stringMatching(/^[a-z][a-z0-9-]{0,99}$/),
  timestamp: fc.integer({ min: 1704067200000, max: 1830297600000 })
    .map((ms) => new Date(ms).toISOString()),
});

const scoreArb = fc.double({ min: 0, max: 1, noNaN: true });

const qualitySignalArb = envelopeArb.chain((env) =>
  fc.record({
    ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, fc.constant(v)])),
    type: fc.constant('quality_signal' as const),
    score: scoreArb,
  }),
);

const taskCompletedArb = envelopeArb.chain((env) =>
  fc.record({
    ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, fc.constant(v)])),
    type: fc.constant('task_completed' as const),
    task_type: fc.constantFrom('code_review', 'creative_writing', 'analysis', 'summarization', 'general'),
    success: fc.boolean(),
  }),
);

const credentialUpdateArb = envelopeArb.chain((env) =>
  fc.tuple(fc.uuid()).map(([credId]) => ({
    ...env,
    type: 'credential_update' as const,
    credential_id: credId,
    action: 'issued' as const,
  })),
);

const modelPerformanceArb = envelopeArb.chain((env) =>
  fc.record({
    ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, fc.constant(v)])),
    type: fc.constant('model_performance' as const),
    model_id: fc.stringMatching(/^[a-z][a-z0-9-]{0,49}$/),
    provider: fc.constantFrom('openai', 'anthropic', 'google', 'meta'),
    pool_id: fc.stringMatching(/^pool-[a-z]{1,20}$/),
    task_type: fc.constantFrom('code_review', 'creative_writing', 'analysis', 'summarization', 'general', 'unspecified'),
    quality_observation: fc.record({
      score: scoreArb,
    }),
  }),
);

const anyValidEventArb = fc.oneof(
  qualitySignalArb,
  taskCompletedArb,
  credentialUpdateArb,
  modelPerformanceArb,
);

const schemas = [
  { name: 'quality_signal', schema: QualitySignalEventSchema },
  { name: 'task_completed', schema: TaskCompletedEventSchema },
  { name: 'credential_update', schema: CredentialUpdateEventSchema },
  { name: 'model_performance', schema: ModelPerformanceEventSchema },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReputationEvent discrimination properties', () => {
  it('exactly one variant matches per valid event', () => {
    fc.assert(
      fc.property(anyValidEventArb, (event) => {
        const matches = schemas.filter(({ schema }) => Value.Check(schema, event));
        expect(matches).toHaveLength(1);
        expect(matches[0].name).toBe(event.type);
      }),
      { numRuns: 500 },
    );
  });

  it('union accepts every valid variant event', () => {
    fc.assert(
      fc.property(anyValidEventArb, (event) => {
        expect(Value.Check(ReputationEventSchema, event)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('model_id roundtrip — encode/decode preserves value', () => {
    fc.assert(
      fc.property(modelPerformanceArb, (event) => {
        // Encode to JSON and decode back
        const json = JSON.stringify(event);
        const decoded = JSON.parse(json);
        expect(decoded.model_id).toBe(event.model_id);
        expect(decoded.provider).toBe(event.provider);
        expect(decoded.quality_observation.score).toBe(event.quality_observation.score);
        expect(Value.Check(ModelPerformanceEventSchema, decoded)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('no payload can match two variants simultaneously (negative discrimination)', () => {
    // Attempt cross-variant payloads: take each variant's payload and try to
    // force-fit it as another variant by changing the type discriminator.
    fc.assert(
      fc.property(anyValidEventArb, (event) => {
        const originalType = event.type;
        const otherTypes = ['quality_signal', 'task_completed', 'credential_update', 'model_performance']
          .filter((t) => t !== originalType);

        for (const otherType of otherTypes) {
          const mutated = { ...event, type: otherType };
          const matchingSchema = schemas.find((s) => s.name === otherType)!;
          // Changing only the type discriminator should NOT make it valid
          // for the other variant's schema (due to additionalProperties: false
          // and differing required fields).
          expect(Value.Check(matchingSchema.schema, mutated)).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });
});
