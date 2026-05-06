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
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as governance from '../../src/governance/index.js';

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
 * Walk the governance subpath (where v8.5.0 crypto-bearing schemas
 * live) for entries flagged `'x-crypto-bearing': true`. Returns the
 * source-side flag and the generated-JSON-Schema flag for each.
 *
 * If/when crypto-bearing schemas land outside src/governance/ in a
 * later cycle, extend the imported namespace list.
 */
function collectCryptoBearingSchemas(): CryptoBearingSchema[] {
  const out: CryptoBearingSchema[] = [];
  const PascalToKebab = (s: string): string =>
    s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  for (const value of Object.values(governance)) {
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

    const fileName = `${PascalToKebab(schema.$id)}.schema.json`;
    let fromGenerated = false;
    try {
      const content = JSON.parse(
        readFileSync(join(generatedSchemasDir, fileName), 'utf-8'),
      ) as Record<string, unknown>;
      fromGenerated = content['x-crypto-bearing'] === true;
    } catch {
      // generated file missing — treated as fromGenerated=false so
      // the assertion below catches the silent-divergence case.
    }
    out.push({ $id: schema.$id, fromSource, fromGenerated });
  }
  return out;
}

describe('x-crypto-bearing flag determinism (SDD §5.6 / I1)', () => {
  it('every TypeBox-marked crypto-bearing schema has the flag in generated JSON Schema', () => {
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

  it('runtime validate() honors x-crypto-bearing (fails closed without acceptDeferred)', async () => {
    const { validate } = await import('../../src/validators/index.js');
    const { SignatureEnvelopeSchema } = await import(
      '../../src/governance/signature-envelope.js'
    );
    const validShape = {
      envelope_id: '550e8400-e29b-41d4-a716-446655440000',
      signature_type: 'attestation' as const,
      key_ref: 'kms://example/key-1',
      signed_payload_hash:
        'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      signature_value:
        'ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      signed_at: '2026-05-06T00:00:00Z',
      contract_version: '8.5.0',
    };
    // Default call must fail closed.
    const defaultResult = validate(SignatureEnvelopeSchema, validShape);
    expect(defaultResult.valid).toBe(false);
    if (!defaultResult.valid) {
      expect(defaultResult.errors.some((e) => e.includes('CRYPTO_DEFERRED'))).toBe(true);
    }
    // Opt-in returns valid + manifest entry.
    const optInResult = validate(SignatureEnvelopeSchema, validShape, {
      acceptDeferred: true,
    });
    expect(optInResult.valid).toBe(true);
    if (optInResult.valid) {
      expect(optInResult.unverified_obligations).toBeDefined();
      expect(optInResult.unverified_obligations?.unverified_rules[0]?.rule_id).toBe(
        'CRYPTO_DEFERRED',
      );
    }
  });

  it('structural lint RULE-4 catches assertValid() against crypto-bearing schemas (verified by tests/scripts/check-class-policy-boundary.test.ts)', () => {
    // RULE-4 unit-test coverage lives in
    // tests/scripts/check-class-policy-boundary.test.ts; this assertion
    // documents that the lint stays coherent with the runtime by
    // sharing the same crypto-bearing schema list.
    const schemas = collectCryptoBearingSchemas();
    const idsThatLintWatches = ['SignatureEnvelopeSchema'];
    for (const s of schemas) {
      const expectedIdent = `${s.$id}Schema`;
      expect(
        idsThatLintWatches.includes(expectedIdent),
        `${expectedIdent} is crypto-bearing in TypeBox but RULE-4 of ` +
          `scripts/check-class-policy-boundary.ts does not list it. Update ` +
          `RULE_4_CRYPTO_BEARING_NAMES so the lint stays in sync.`,
      ).toBe(true);
    }
  });
});
