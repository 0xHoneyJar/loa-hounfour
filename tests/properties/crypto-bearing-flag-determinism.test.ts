/**
 * Determinism contract for the `x-crypto-bearing` schema flag.
 *
 * v8.5.0 introduces a class of schemas (SignatureEnvelope, RecallReceipt,
 * CommitmentRoot, Assertion-with-signatures) whose `validate()` default
 * behavior changes — the helper fails closed unless the consumer opts
 * in via `{ acceptDeferred: true }`. The flag that drives that behavior
 * is `x-crypto-bearing: true` in the TypeBox source's options object.
 *
 * Four surfaces independently observe the flag:
 *
 *   1. TypeBox source — the literal `'x-crypto-bearing': true` in the
 *      schema definition's options.
 *   2. Generated JSON Schema — the `x-crypto-bearing` keyword on the
 *      emitted file under `schemas/`.
 *   3. Runtime `validate()` — the function inspects the flag at call
 *      time and returns `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }`
 *      when the consumer hasn't passed `{ acceptDeferred: true }`.
 *   4. Structural lint — `scripts/check-class-policy-boundary.ts` RULE-4
 *      reads the flag to decide whether `assertValid()` calls in test
 *      files are policy violations.
 *
 * The four surfaces MUST agree. Silent divergence on any one of them
 * is a structural bug — for instance, a schema marked crypto-bearing
 * in TypeBox but missing the keyword in the generated JSON Schema
 * would let downstream cross-language runners accept payloads that
 * the TS runtime rejects.
 *
 * @see SDD §5.6 — Crypto-bearing flag determinism property test (I1)
 * @since v8.5.0 (PR-A2.1 lands skip-mode; PR-A2.2 unskips)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schemaModule from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const generatedSchemasDir = join(repoRoot, 'schemas');

interface CryptoBearingSchema {
  /** TypeBox $id (PascalCase). */
  $id: string;
  /** Flag value as observed in TypeBox source. */
  fromSource: boolean;
  /** Flag value as observed in generated JSON Schema. */
  fromGenerated: boolean;
}

/**
 * Walk the public API surface for schemas that carry the
 * `x-crypto-bearing` flag in their TypeBox options. Returns a tuple
 * of the source-side flag and the generated-JSON-Schema flag for
 * each candidate.
 *
 * Source: enumerate every export that looks like a Schema (object
 * with `$id`) and inspect its options.
 * Generated: for each $id, find the corresponding schemas/<kebab>.schema.json
 * and read its top-level `x-crypto-bearing` keyword.
 */
function collectCryptoBearingSchemas(): CryptoBearingSchema[] {
  const out: CryptoBearingSchema[] = [];
  const generatedFiles = new Set(
    readdirSync(generatedSchemasDir).filter((f) => f.endsWith('.schema.json')),
  );

  for (const [, value] of Object.entries(schemaModule)) {
    if (
      value === null ||
      typeof value !== 'object' ||
      !('$id' in value) ||
      typeof (value as Record<string, unknown>).$id !== 'string'
    ) {
      continue;
    }
    const schema = value as Record<string, unknown> & { $id: string };
    const fromSource = schema['x-crypto-bearing'] === true;
    if (!fromSource) continue;

    // Convert PascalCase $id → kebab-case file name.
    const kebab = schema.$id.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const fileName = `${kebab}.schema.json`;
    let fromGenerated = false;
    if (generatedFiles.has(fileName)) {
      const content = JSON.parse(readFileSync(join(generatedSchemasDir, fileName), 'utf-8')) as Record<
        string,
        unknown
      >;
      fromGenerated = content['x-crypto-bearing'] === true;
    }
    out.push({ $id: schema.$id, fromSource, fromGenerated });
  }
  return out;
}

describe('x-crypto-bearing flag determinism (SDD §5.6 / I1)', () => {
  // Until PR-A2.2 marks SignatureEnvelope / RecallReceipt / CommitmentRoot /
  // Assertion-with-signatures as crypto-bearing, no schemas carry the flag
  // and the property test has no input. The test ships in skip-mode in
  // PR-A2.1 so the file is wired up; PR-A2.2 (a) introduces the first
  // crypto-bearing schemas, (b) flips `it.skip` to `it`, and (c) extends
  // the determinism check to the runtime `validate()` and lint surfaces.
  it.skip('every TypeBox-marked crypto-bearing schema has the flag in generated JSON Schema', () => {
    const schemas = collectCryptoBearingSchemas();
    expect(schemas.length).toBeGreaterThan(0);
    for (const s of schemas) {
      expect(
        s.fromGenerated,
        `${s.$id}: TypeBox source carries x-crypto-bearing but generated JSON Schema does not. ` +
          `This is the silent-divergence failure mode the determinism contract is designed to catch.`,
      ).toBe(true);
    }
  });

  it.skip('runtime validate() honors x-crypto-bearing (fails closed without acceptDeferred)', () => {
    // PR-A2.2 fills this in: for each crypto-bearing schema, calling
    // validate(Schema, payload) without { acceptDeferred: true } must
    // return { valid: false, errors: [{ code: 'CRYPTO_DEFERRED', ... }] }.
    expect.fail('Unskip in PR-A2.2 once SignatureEnvelopeSchema is registered.');
  });

  it.skip('structural lint RULE-4 detects assertValid() against crypto-bearing schemas', () => {
    // PR-A2.2 fills this in: a synthetic test file calling
    // assertValid(SignatureEnvelopeSchema, ...) must be flagged by
    // scripts/check-class-policy-boundary.ts; assertStructurallyValid()
    // must NOT be flagged.
    expect.fail('Unskip in PR-A2.2 once RULE-4 fixtures land.');
  });

  it('skip-mode placeholder runs without throwing (smoke)', () => {
    // Sanity check: the test file loads without import errors. The
    // collector itself runs even though the assertion is skipped.
    const schemas = collectCryptoBearingSchemas();
    expect(Array.isArray(schemas)).toBe(true);
    // Pre-PR-A2.2 expectation: no crypto-bearing schemas yet.
    expect(schemas).toEqual([]);
  });
});
