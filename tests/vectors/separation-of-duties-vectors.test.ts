/**
 * PR-C3 (FR-C3) — Vector-fixture conformance runner for
 * `IrreversibleActionAttestationSchema` and
 * `SharedSurfaceDeclarationSchema`.
 *
 * Walks `vectors/<Schema>/v8.8.0/{valid,invalid,invalid-cross-field}`
 * and asserts the two-layer validator topology: valid fixtures pass
 * both tiers; invalid fixtures fail the structural tier;
 * invalid-cross-field fixtures pass the structural tier and are
 * rejected by the cross-field tier with the expected rule id.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import type { TSchema } from '@sinclair/typebox';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IrreversibleActionAttestationSchema } from '../../src/governance/irreversible-action-attestation.js';
import { SharedSurfaceDeclarationSchema } from '../../src/governance/shared-surface-declaration.js';
import { validate } from '../../src/validators/index.js';
import { assertCryptoBearingFailsByDefault } from '../../src/test-infrastructure/crypto-bearing-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function root(schemaName: string): string {
  return join(__dirname, '..', '..', 'vectors', schemaName, 'v8.8.0');
}

function list(schemaName: string, bucket: string): string[] {
  return readdirSync(join(root(schemaName), bucket))
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function load(schemaName: string, bucket: string, name: string): unknown {
  const raw = JSON.parse(
    readFileSync(join(root(schemaName), bucket, name), 'utf8'),
  ) as Record<string, unknown>;
  const { _comment, ...data } = raw;
  void _comment;
  return data;
}

/** Expected rule ids per cross-field fixture, keyed by filename prefix. */
function expectedRules(prefix: string, file: string): string[] {
  const head = file.split('-rejected')[0];
  const ids = [...head.matchAll(new RegExp(`${prefix.toLowerCase()}(\\d+)`, 'g'))].map(
    (m) => `${prefix}-${m[1]}`,
  );
  return ids;
}

interface Suite {
  name: string;
  schema: TSchema;
  prefix: string;
  cryptoBearing: boolean;
  keyOrder: string[];
}

const SUITES: Suite[] = [
  {
    name: 'IrreversibleActionAttestation',
    schema: IrreversibleActionAttestationSchema,
    prefix: 'IAA',
    cryptoBearing: true,
    keyOrder: [
      'envelope_kind',
      'contract_version',
      'attestation_id',
      'action_kind',
      'target',
      'proposal',
      'execution',
      'separation_of_duties',
    ],
  },
  {
    name: 'SharedSurfaceDeclaration',
    schema: SharedSurfaceDeclarationSchema,
    prefix: 'SSD',
    cryptoBearing: false,
    keyOrder: [
      'surface_id',
      'kind',
      'locator',
      'owner_agent_id',
      'writer_agent_ids',
      'reader_agent_ids',
      'single_writer',
      'audit_trail_id',
      'retention',
      'declared_at',
      'declared_by',
      'contract_version',
    ],
  },
];

for (const suite of SUITES) {
  describe(`${suite.name} vector fixtures (FR-C3 / PR-C3)`, () => {
    const valid = list(suite.name, 'valid');
    const invalid = list(suite.name, 'invalid');
    const crossField = list(suite.name, 'invalid-cross-field');

    it('publishes ≥4 valid, ≥6 invalid and ≥4 invalid-cross-field fixtures', () => {
      expect(valid.length).toBeGreaterThanOrEqual(4);
      expect(invalid.length).toBeGreaterThanOrEqual(6);
      expect(crossField.length).toBeGreaterThanOrEqual(4);
    });

    describe('valid/', () => {
      for (const f of valid) {
        it(`Value.Check passes ${f}`, () => {
          const data = load(suite.name, 'valid', f);
          const ok = Value.Check(suite.schema, data);
          if (!ok) {
            const errs = [...Value.Errors(suite.schema, data)].slice(0, 3);
            throw new Error(JSON.stringify(errs.map((e) => [e.path, e.message])));
          }
        });

        it(`validate() passes ${f}`, () => {
          const data = load(suite.name, 'valid', f);
          const result = validate(suite.schema, data, { acceptDeferred: true });
          if (!result.valid) throw new Error(JSON.stringify(result.errors));
        });

        it(`top-level keys follow the canonical field order ${f}`, () => {
          const data = load(suite.name, 'valid', f) as Record<string, unknown>;
          const keys = Object.keys(data);
          expect(keys).toEqual(suite.keyOrder.filter((k) => k in data));
          expect(JSON.stringify(JSON.parse(JSON.stringify(data)))).toBe(
            JSON.stringify(data),
          );
        });

        if (suite.cryptoBearing) {
          it(`fails closed with CRYPTO_DEFERRED without acceptDeferred ${f}`, () => {
            assertCryptoBearingFailsByDefault(
              suite.schema,
              load(suite.name, 'valid', f),
            );
          });
        } else {
          it(`validate() passes without acceptDeferred (not crypto-bearing) ${f}`, () => {
            expect(validate(suite.schema, load(suite.name, 'valid', f)).valid).toBe(true);
          });
        }
      }
    });

    describe('invalid/ — structural rejection', () => {
      for (const f of invalid) {
        it(`Value.Check fails ${f}`, () => {
          expect(Value.Check(suite.schema, load(suite.name, 'invalid', f))).toBe(false);
        });

        it(`validate() fails ${f}`, () => {
          const result = validate(suite.schema, load(suite.name, 'invalid', f), {
            acceptDeferred: true,
          });
          expect(result.valid).toBe(false);
        });
      }
    });

    describe('invalid-cross-field/ — cross-field rejection', () => {
      for (const f of crossField) {
        it(`Value.Check passes (structural) ${f}`, () => {
          expect(Value.Check(suite.schema, load(suite.name, 'invalid-cross-field', f))).toBe(true);
        });

        it(`validate() rejects with exactly the named ${suite.prefix} rules ${f}`, () => {
          const expected = expectedRules(suite.prefix, f);
          expect(expected.length).toBeGreaterThan(0);
          const result = validate(suite.schema, load(suite.name, 'invalid-cross-field', f), {
            acceptDeferred: true,
          });
          expect(result.valid).toBe(false);
          if (result.valid) return;
          const observed = [
            ...new Set(
              result.errors
                .map((e) => new RegExp(`^(${suite.prefix}-\\d+):`).exec(e)?.[1])
                .filter((x): x is string => x !== undefined),
            ),
          ].sort();
          expect(observed).toEqual([...expected].sort());
        });

        it(`cross-field rejection does not depend on acceptDeferred ${f}`, () => {
          const result = validate(suite.schema, load(suite.name, 'invalid-cross-field', f));
          expect(result.valid).toBe(false);
          if (result.valid) return;
          expect(result.errors.some((e) => e.startsWith('CRYPTO_DEFERRED:'))).toBe(false);
        });
      }
    });
  });
}

describe('separation-of-duties vector coverage required by SDD §2', () => {
  const iaa = list('IrreversibleActionAttestation', 'invalid-cross-field');
  const ssd = list('SharedSurfaceDeclaration', 'invalid-cross-field');
  it('covers same-actor, same-key and execution-before-proposal', () => {
    expect(iaa.some((f) => f.startsWith('iaa1-same-actor'))).toBe(true);
    expect(iaa.some((f) => f.startsWith('iaa2-same-signer-key'))).toBe(true);
    expect(iaa.some((f) => f.startsWith('iaa3-execution-before-proposal'))).toBe(true);
  });
  it('covers owner-not-writer and single-writer-with-two-writers', () => {
    expect(ssd.some((f) => f.startsWith('ssd1-owner-not-writer'))).toBe(true);
    expect(ssd.some((f) => f.startsWith('ssd2-single-writer-with-two-writers'))).toBe(true);
  });
});
