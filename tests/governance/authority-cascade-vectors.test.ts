/**
 * Per-schema vector runner for the v8.5.0 authority-cascade primitives.
 *
 * Walks every fixture under `vectors/<Schema>/{valid,invalid}/` and
 * asserts that:
 *   - valid fixtures pass `assertStructurallyValid` (shape-only — for
 *     crypto-bearing schemas this passes `{ acceptDeferred: true }`
 *     internally so the safe-by-default fail-closed path doesn't
 *     trip on shape-correct payloads).
 *   - invalid fixtures fail validation with at least one error.
 *
 * For the SignatureEnvelope schema (the only crypto-bearing one in
 * PR-A2.2) we also assert the safe-by-default semantics:
 * `assertCryptoBearingFailsByDefault` must reject every shape-correct
 * fixture when called without `{ acceptDeferred: true }`.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/authority-cascade.md
 * @since v8.5.0 (PR-A2.2)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KeyringSchema,
  SignerEntrySchema,
  SignerCompetenceRuleSchema,
  SignerCompetenceResultSchema,
  SignatureEnvelopeSchema,
  SignerTypeSchema,
  SignatureTypeSchema,
  SignerStatusSchema,
  PolicyDecisionOutcomeSchema,
} from '../../src/governance/index.js';
import { validate } from '../../src/validators/index.js';
import {
  assertStructurallyValid,
  assertCryptoBearingFailsByDefault,
} from '../../src/test-infrastructure/crypto-bearing-helpers.js';
import type { TSchema } from '@sinclair/typebox';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const vectorsRoot = join(repoRoot, 'vectors');

const SCHEMAS: Record<string, TSchema> = {
  Keyring: KeyringSchema,
  SignerEntry: SignerEntrySchema,
  SignerCompetenceRule: SignerCompetenceRuleSchema,
  SignerCompetenceResult: SignerCompetenceResultSchema,
  SignatureEnvelope: SignatureEnvelopeSchema,
  SignerType: SignerTypeSchema,
  SignatureType: SignatureTypeSchema,
  SignerStatus: SignerStatusSchema,
  PolicyDecisionOutcome: PolicyDecisionOutcomeSchema,
};

const CRYPTO_BEARING = new Set(['SignatureEnvelope']);

function loadFixtures(schema: string, intent: 'valid' | 'invalid'): { name: string; data: unknown }[] {
  const dir = join(vectorsRoot, schema, intent);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      name: f.replace(/\.json$/, ''),
      data: JSON.parse(readFileSync(join(dir, f), 'utf-8')),
    }));
}

for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
  describe(`authority-cascade vectors — ${schemaName}`, () => {
    const valid = loadFixtures(schemaName, 'valid');
    const invalid = loadFixtures(schemaName, 'invalid');

    it('has at least one valid fixture', () => {
      expect(valid.length).toBeGreaterThan(0);
    });

    it.each(valid.map((f) => [f.name, f.data]))(
      'valid/%s — passes assertStructurallyValid',
      (_name, data) => {
        // assertStructurallyValid handles the crypto-bearing
        // acceptDeferred flag internally, so this is uniform across
        // crypto-bearing and non-crypto-bearing schemas.
        assertStructurallyValid(schema, data);
      },
    );

    if (CRYPTO_BEARING.has(schemaName)) {
      it.each(valid.map((f) => [f.name, f.data]))(
        'valid/%s — assertCryptoBearingFailsByDefault (G1 safe-by-default)',
        (_name, data) => {
          assertCryptoBearingFailsByDefault(schema, data);
        },
      );
    }

    if (invalid.length > 0) {
      it.each(invalid.map((f) => [f.name, f.data]))(
        'invalid/%s — fails validation',
        (_name, data) => {
          const result = validate(schema, data, { acceptDeferred: true });
          expect(result.valid).toBe(false);
          if (!result.valid) {
            expect(result.errors.length).toBeGreaterThan(0);
          }
        },
      );
    }
  });
}
