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
import * as rootIndex from '../../src/index.js';
import * as governance from '../../src/governance/index.js';
import * as economy from '../../src/economy/index.js';
import * as core from '../../src/core/index.js';
import * as commons from '../../src/commons/index.js';
import { RULE_4_CRYPTO_BEARING_NAMES } from '../../scripts/check-class-policy-boundary.js';

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
 * Walk every public-API subpath (root + governance + economy + core +
 * commons) for entries flagged `'x-crypto-bearing': true`. Returns the
 * source-side flag and the generated-JSON-Schema flag for each.
 *
 * Prior versions narrowed to `src/governance/` only — that drifted out
 * from under the determinism contract because future crypto-bearing
 * schemas could land in any module. The full-surface enumeration here
 * de-duplicates by `$id` (TypeBox barrel re-exports surface the same
 * schema multiple times) so the property test remains
 * package-wide rather than subpath-local.
 */
function pascalToKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function collectCryptoBearingSchemas(): CryptoBearingSchema[] {
  const seenIds = new Set<string>();
  const out: CryptoBearingSchema[] = [];

  // All public-API surfaces. Adding a new module here when a new subpath
  // ships is the explicit registration point for the determinism contract.
  const surfaces = [rootIndex, governance, economy, core, commons];

  for (const ns of surfaces) {
    for (const value of Object.values(ns)) {
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
      if (seenIds.has(schema.$id)) continue;
      seenIds.add(schema.$id);

      const fileName = `${pascalToKebab(schema.$id)}.schema.json`;
      const filePath = join(generatedSchemasDir, fileName);
      let fromGenerated = false;
      let generatedFileMissing = false;
      try {
        const content = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<
          string,
          unknown
        >;
        fromGenerated = content['x-crypto-bearing'] === true;
      } catch {
        // F4 mitigation: distinguish "generated file missing" from
        // "file present without flag". Missing-file is treated as a
        // structural failure with an explicit error message rather
        // than silently rolled into fromGenerated=false.
        generatedFileMissing = true;
      }
      if (generatedFileMissing) {
        throw new Error(
          `crypto-bearing-flag-determinism: schema ${schema.$id} declared 'x-crypto-bearing': true in source ` +
            `but the generated file is missing at ${filePath}. Run ` +
            `'npm run schema:generate' and re-run the test. (Silent absence is the failure mode this assertion is designed to catch.)`,
        );
      }
      out.push({ $id: schema.$id, fromSource, fromGenerated });
    }
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
      // Pattern {86} per F2 reconciliation — exactly 86 unpadded base64url chars.
      signature_value:
        'ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      signed_at: '2026-05-06T00:00:00Z',
      contract_version: '8.5.0',
    };
    // Default call must fail closed.
    const defaultResult = validate(SignatureEnvelopeSchema, validShape);
    expect(defaultResult.valid).toBe(false);
    if (!defaultResult.valid) {
      // F7: match against the literal token at start-of-string, not substring.
      expect(defaultResult.errors.some((e) => e.startsWith('CRYPTO_DEFERRED:'))).toBe(true);
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

  it('structural lint RULE-4 list is set-equal to the discovered crypto-bearing schemas', () => {
    // F3 mitigation: import the actual RULE_4_CRYPTO_BEARING_NAMES from the
    // lint script and assert SET-EQUALITY (both directions) with the schemas
    // discovered via TypeBox source inspection. This is the round-trip the
    // determinism contract requires — a hard-coded local list could drift
    // forever without surfacing the divergence.
    const schemas = collectCryptoBearingSchemas();
    const discoveredIdents = new Set(schemas.map((s) => `${s.$id}Schema`));
    const lintIdents = new Set(RULE_4_CRYPTO_BEARING_NAMES);

    // Schemas in TypeBox but not watched by the lint:
    const lintMissing = [...discoveredIdents].filter((i) => !lintIdents.has(i));
    expect(
      lintMissing,
      `These schemas are crypto-bearing in TypeBox but RULE_4_CRYPTO_BEARING_NAMES ` +
        `in scripts/check-class-policy-boundary.ts does not list them: ${lintMissing.join(', ')}. ` +
        `Add them to RULE_4_CRYPTO_BEARING_NAMES so the lint catches assertValid() ` +
        `calls against them.`,
    ).toEqual([]);

    // Identifiers watched by the lint but not actually crypto-bearing:
    // (PR-A2.2 lands SignatureEnvelope. RecallReceipt + CommitmentRoot +
    // Assertion are forward-looking entries for PR-A2.3 — the lint pre-arms
    // for them. Those are accepted here; we only require that every
    // DISCOVERED schema is watched. Strict set-equality lands once PR-A2.3
    // ships those schemas.)
    const sourceMissing = [...lintIdents].filter((i) => !discoveredIdents.has(i));
    const knownForwardLooking = new Set([
      'RecallReceiptSchema',
      'CommitmentRootSchema',
      'AssertionSchema',
    ]);
    const unexpected = sourceMissing.filter((i) => !knownForwardLooking.has(i));
    expect(
      unexpected,
      `These identifiers are watched by RULE-4 but are not present in any ` +
        `module's exported schemas: ${unexpected.join(', ')}. Either remove ` +
        `them from RULE_4_CRYPTO_BEARING_NAMES (if the schema was renamed/dropped) ` +
        `or update the knownForwardLooking allowlist if they are intentionally ` +
        `pre-armed for an upcoming PR.`,
    ).toEqual([]);
  });
});
