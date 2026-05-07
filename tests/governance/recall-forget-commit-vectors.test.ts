/**
 * Per-schema vector runner for the v8.5.0 PR-A2.3 schemas — recall
 * machinery + Forget/Commit/Estate + Assertion family.
 *
 * Walks every fixture under `vectors/<Schema>/{valid,invalid}/` and
 * asserts that:
 *   - valid fixtures pass `assertStructurallyValid` (shape-only — for
 *     crypto-bearing schemas the helper passes `{ acceptDeferred: true }`
 *     internally so the safe-by-default fail-closed path doesn't trip
 *     on shape-correct payloads).
 *   - invalid fixtures fail validation with at least one error.
 *
 * **Variant-aware crypto-bearing (J3)**: AssertionSchema is variant-aware
 * — the `candidate` variant is shape-only and NOT crypto-bearing, while
 * the other 7 variants ARE. Fixtures whose case name starts with
 * `candidate-` are filtered out of the crypto-bearing-fails-by-default
 * check; non-candidate Assertion fixtures and all RecallReceipt /
 * CommitmentRoot fixtures DO run the safe-by-default check.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/forget-record-semantics.md
 * @since v8.5.0 (PR-A2.3)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ReceiptDetailLevelSchema,
  SurfaceContextSchema,
  RecallRequestSchema,
  RecallPackSchema,
  RecallReceiptSchema,
  ForgetRecordSchema,
  CommitmentTypeSchema,
  CommitmentRootSchema,
  AgentEstateStatusSchema,
  AgentEstateSchema,
  PrivacyScopeSchema,
  RiskLevelSchema,
  AssertionStatusSchema,
  AssertionClassSchema,
  AssertionSchema,
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
  ReceiptDetailLevel: ReceiptDetailLevelSchema,
  SurfaceContext: SurfaceContextSchema,
  RecallRequest: RecallRequestSchema,
  RecallPack: RecallPackSchema,
  RecallReceipt: RecallReceiptSchema,
  ForgetRecord: ForgetRecordSchema,
  CommitmentType: CommitmentTypeSchema,
  CommitmentRoot: CommitmentRootSchema,
  AgentEstateStatus: AgentEstateStatusSchema,
  AgentEstate: AgentEstateSchema,
  PrivacyScope: PrivacyScopeSchema,
  RiskLevel: RiskLevelSchema,
  AssertionStatus: AssertionStatusSchema,
  AssertionClass: AssertionClassSchema,
  Assertion: AssertionSchema,
};

// Top-level x-crypto-bearing schemas (RecallReceipt + CommitmentRoot).
// AssertionSchema is variant-aware — handled separately below.
const TOP_LEVEL_CRYPTO_BEARING = new Set(['RecallReceipt', 'CommitmentRoot']);

// Schemas with constraint-layer-only invalids (the partial-anchor case for
// CommitmentRoot is structurally valid; the constraint check rejects it).
// Skipped from the schema-layer "invalid" sweep so the test stays accurate.
const CONSTRAINT_ONLY_INVALID_FIXTURES: Record<string, Set<string>> = {
  CommitmentRoot: new Set(['partial-anchor']),
};

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
  describe(`PR-A2.3 vectors — ${schemaName}`, () => {
    const valid = loadFixtures(schemaName, 'valid');
    const invalid = loadFixtures(schemaName, 'invalid');

    it('has at least one valid fixture', () => {
      expect(valid.length).toBeGreaterThan(0);
    });

    it.each(valid.map((f) => [f.name, f.data]))(
      'valid/%s — passes assertStructurallyValid',
      (_name, data) => {
        assertStructurallyValid(schema, data);
      },
    );

    if (TOP_LEVEL_CRYPTO_BEARING.has(schemaName)) {
      it('has at least one valid fixture exercising the G1 safe-by-default check', () => {
        expect(valid.length).toBeGreaterThan(0);
      });

      it.each(valid.map((f) => [f.name, f.data]))(
        'valid/%s — assertCryptoBearingFailsByDefault (G1 safe-by-default)',
        (_name, data) => {
          assertCryptoBearingFailsByDefault(schema, data);
        },
      );
    }

    if (schemaName === 'Assertion') {
      // Variant-aware crypto-bearing (J3): the candidate variant is shape-
      // only and NOT crypto-bearing — it MUST pass validate() without
      // acceptDeferred. The other 7 variants carry signatures[] and ARE
      // crypto-bearing — they MUST fail validate() without acceptDeferred.
      const candidates = valid.filter((f) => f.name.startsWith('candidate-'));
      const cryptoBearingVariants = valid.filter((f) => !f.name.startsWith('candidate-'));

      it('has at least one candidate-variant fixture', () => {
        expect(candidates.length).toBeGreaterThan(0);
      });
      it('has at least one crypto-bearing-variant fixture', () => {
        expect(cryptoBearingVariants.length).toBeGreaterThan(0);
      });

      it.each(candidates.map((f) => [f.name, f.data]))(
        'valid/%s — candidate variant validates WITHOUT acceptDeferred (J3 shape-only branch)',
        (_name, data) => {
          const result = validate(schema, data);
          expect(result.valid).toBe(true);
        },
      );

      it.each(cryptoBearingVariants.map((f) => [f.name, f.data]))(
        'valid/%s — crypto-bearing variant fails closed without acceptDeferred (J3 safe-by-default)',
        (_name, data) => {
          assertCryptoBearingFailsByDefault(schema, data);
        },
      );
    }

    if (invalid.length > 0) {
      const constraintOnly = CONSTRAINT_ONLY_INVALID_FIXTURES[schemaName] ?? new Set<string>();
      const schemaLayerInvalids = invalid.filter((f) => !constraintOnly.has(f.name));
      if (schemaLayerInvalids.length > 0) {
        it.each(schemaLayerInvalids.map((f) => [f.name, f.data]))(
          'invalid/%s — fails schema validation',
          (_name, data) => {
            const result = validate(schema, data, { acceptDeferred: true });
            expect(result.valid).toBe(false);
            if (!result.valid) {
              expect(result.errors.length).toBeGreaterThan(0);
            }
          },
        );
      }
    }
  });
}
