/**
 * PR-C5 (FR-C5) — Vector-fixture conformance runner for
 * `AgentIdentityBindingSchema`.
 *
 *   - valid/: pass Value.Check AND validate() (structural + AIB-1..3).
 *   - invalid/: fail Value.Check AND validate().
 *   - invalid-cross-field/: pass Value.Check, fail validate() with the
 *     AIB rule id named in the fixture file name.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentIdentityBindingSchema } from '../../src/governance/agent-identity-binding.js';
import { validate } from '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS = join(__dirname, '..', '..', 'vectors', 'AgentIdentityBinding', 'v8.8.0');

function list(bucket: string): string[] {
  return readdirSync(join(VECTORS, bucket)).filter((f) => f.endsWith('.json')).sort();
}

function load(bucket: string, name: string): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(join(VECTORS, bucket, name), 'utf8')) as Record<string, unknown>;
  expect(typeof raw._comment).toBe('string');
  const { _comment, ...data } = raw;
  void _comment;
  return data;
}

describe('AgentIdentityBinding vector fixtures (FR-C5 / PR-C5)', () => {
  const valid = list('valid');
  const invalid = list('invalid');
  const crossField = list('invalid-cross-field');

  it('publishes the SDD §0 cardinality (>=4 valid, >=6 invalid)', () => {
    expect(valid.length).toBeGreaterThanOrEqual(4);
    expect(invalid.length + crossField.length).toBeGreaterThanOrEqual(6);
    expect(invalid.length).toBeGreaterThanOrEqual(6);
  });

  it('covers every profile in valid/', () => {
    const profiles = new Set(valid.map((f) => load('valid', f).profile));
    expect([...profiles].sort()).toEqual(['a2a-agent-card', 'directory-identity', 'verifiable-credential']);
  });

  it('covers the SDD §4 invalid set (three mismatches, two blocks, missing block, bad card_url)', () => {
    expect(crossField.filter((f) => f.includes('-profile-with-') && !f.includes('two-blocks') && !f.includes('all-three')).length).toBeGreaterThanOrEqual(3);
    expect(crossField.some((f) => f.includes('two-blocks'))).toBe(true);
    expect(crossField.some((f) => f.includes('missing-block'))).toBe(true);
    expect(invalid.some((f) => f.includes('bad-card-url'))).toBe(true);
    expect(invalid.some((f) => f.includes('card-url-did-scheme'))).toBe(true);
    expect(invalid.some((f) => f.includes('card-url-trailing-garbage'))).toBe(true);
    expect(invalid.some((f) => f.includes('card-url-dot-host'))).toBe(true);
    expect(valid.some((f) => f.includes('card-url-https-accepted'))).toBe(true);
  });

  describe('valid/ — structural and validate()', () => {
    for (const f of valid) {
      it(`accepts ${f}`, () => {
        const data = load('valid', f);
        expect(Value.Check(AgentIdentityBindingSchema, data)).toBe(true);
        const r = validate(AgentIdentityBindingSchema, data);
        expect(r.errors ?? []).toEqual([]);
        expect(r.valid).toBe(true);
      });
    }
  });

  describe('invalid/ — structural rejection', () => {
    for (const f of invalid) {
      it(`rejects ${f}`, () => {
        const data = load('invalid', f);
        expect(Value.Check(AgentIdentityBindingSchema, data)).toBe(false);
        expect(validate(AgentIdentityBindingSchema, data).valid).toBe(false);
      });
    }
  });

  describe('invalid-cross-field/ — structural pass, cross-field rejection', () => {
    for (const f of crossField) {
      it(`rejects ${f} with its AIB rule id`, () => {
        const data = load('invalid-cross-field', f);
        expect(Value.Check(AgentIdentityBindingSchema, data)).toBe(true);
        const r = validate(AgentIdentityBindingSchema, data);
        expect(r.valid).toBe(false);
        const rule = /^aib(\d)-/.exec(f)?.[1];
        expect(rule).toBeDefined();
        expect(r.errors!.every((e) => e.startsWith(`AIB-${rule}:`))).toBe(true);
      });
    }

    it('passes structurally when cross-field validation is disabled', () => {
      for (const f of crossField) {
        expect(validate(AgentIdentityBindingSchema, load('invalid-cross-field', f), { crossField: false }).valid).toBe(true);
      }
    });
  });

  it('documents that the JSON Schema shape alone does not enforce AIB-1..3', () => {
    const d = String((AgentIdentityBindingSchema as Record<string, unknown>).description);
    expect(d).toContain('JSON Schema alone does NOT enforce AIB-1..3');
  });

  it('does not require acceptDeferred (schema is not x-crypto-bearing; AIB-4 is a deferred constraint)', () => {
    const data = load('valid', 'aib-002-a2a-card-full.json');
    expect((AgentIdentityBindingSchema as Record<string, unknown>)['x-crypto-bearing']).toBeUndefined();
    expect(validate(AgentIdentityBindingSchema, data).valid).toBe(true);
  });
});
