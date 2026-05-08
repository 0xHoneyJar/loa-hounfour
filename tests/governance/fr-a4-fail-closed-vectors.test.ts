/**
 * PR-A3.2 (FR-A4) — Cross-product fixture matrix for `validate()`'s
 * `failClosed` opt-in on `x-chain-bearing` schemas.
 *
 * Walks `vectors/OrgRepresentativeDelegation/v8.6.0-fail-closed/*.json` (12
 * fixtures: 2 modes × 3 chain-context shapes × 2 record kinds) and asserts
 * the expected `validate()` outcome per fixture.
 *
 * Each fixture is a self-describing case file:
 *   {
 *     case_id, description, validate_options, data,
 *     expected: { valid: true,  ord3_reason: '...' }
 *           OR { valid: false, error_prefix: 'CHAIN_CONTEXT_DEFERRED:' }
 *   }
 *
 * @see MIGRATION.md v8.5.x → v8.6.0 §FR-A4 — opt-in contract documentation
 *      and the v9.0.0 default-flip forward-pointer
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OrgRepresentativeDelegationSchema } from '../../src/governance/org-representative-delegation.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(
  __dirname,
  '..',
  '..',
  'vectors',
  'OrgRepresentativeDelegation',
  'v8.6.0-fail-closed',
);

interface FailClosedCase {
  case_id: string;
  description: string;
  validate_options: {
    failClosed?: boolean;
    chainContext?: { granted_by_chain_records?: unknown };
    acceptDeferred?: boolean;
    now?: string;
  };
  data: unknown;
  expected:
    | { valid: true; ord3_reason: string }
    | { valid: false; error_prefix: string };
}

function loadCases(): FailClosedCase[] {
  const files = readdirSync(FIXTURES_ROOT).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => JSON.parse(readFileSync(join(FIXTURES_ROOT, f), 'utf8')) as FailClosedCase);
}

describe('FR-A4 fail-closed cross-product matrix', () => {
  const cases = loadCases();

  it('publishes exactly 12 fixtures (2 modes × 3 contexts × 2 record kinds)', () => {
    expect(cases.length).toBe(12);
  });

  for (const c of cases) {
    it(`${c.case_id}: ${c.description.slice(0, 80)}…`, () => {
      const result = validate(
        OrgRepresentativeDelegationSchema,
        c.data,
        c.validate_options,
      );
      if (c.expected.valid === true) {
        expect(result.valid).toBe(true);
        if (result.valid !== true) return;
        const manifest = result.unverified_obligations;
        expect(manifest, 'manifest must be emitted on the valid path').toBeDefined();
        const ord3Entry = manifest!.unverified_rules.find((r) => r.rule_id === 'ORD-3');
        expect(ord3Entry, 'ORD-3 entry must be present').toBeDefined();
        expect(ord3Entry!.reason).toBe(c.expected.ord3_reason);
      } else {
        expect(result.valid).toBe(false);
        if (result.valid !== false) return;
        expect(result.errors.length).toBeGreaterThan(0);
        const matched = result.errors.some((e) => e.startsWith(c.expected.error_prefix));
        expect(matched, `expected an error starting with "${c.expected.error_prefix}"; got ${JSON.stringify(result.errors)}`).toBe(true);
      }
    });
  }
});

describe('FR-A4 default-path parity (NFR-1: v8.5.x behavior unchanged)', () => {
  it('omits failClosed flag entirely → identical manifest reason to v8.5.x default', () => {
    const data = JSON.parse(readFileSync(
      join(FIXTURES_ROOT, '..', 'valid', 'canonical-001-genesis-grant.json'),
      'utf8',
    ));
    const result = validate(OrgRepresentativeDelegationSchema, data);
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const ord3 = result.unverified_obligations?.unverified_rules.find((r) => r.rule_id === 'ORD-3');
    expect(ord3?.reason).toBe('context_absent');
  });

  it('failClosed: false (explicit) is identical to absent flag', () => {
    const data = JSON.parse(readFileSync(
      join(FIXTURES_ROOT, '..', 'valid', 'canonical-001-genesis-grant.json'),
      'utf8',
    ));
    const a = validate(OrgRepresentativeDelegationSchema, data, { failClosed: false });
    const b = validate(OrgRepresentativeDelegationSchema, data);
    if (a.valid !== true || b.valid !== true) {
      expect.fail('both calls must return valid: true');
      return;
    }
    const aReason = a.unverified_obligations?.unverified_rules.find((r) => r.rule_id === 'ORD-3')?.reason;
    const bReason = b.unverified_obligations?.unverified_rules.find((r) => r.rule_id === 'ORD-3')?.reason;
    expect(aReason).toBe(bReason);
    expect(aReason).toBe('context_absent');
  });
});

describe('FR-A3 ORD-5 vocabulary-drift surfacing at validate() time', () => {
  function loadGenesis() {
    return JSON.parse(readFileSync(
      join(FIXTURES_ROOT, '..', 'valid', 'canonical-001-genesis-grant.json'),
      'utf8',
    ));
  }

  it('canonical capability_scope key emits NO ORD-5 manifest entry', () => {
    const data = loadGenesis();
    const result = validate(OrgRepresentativeDelegationSchema, data);
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const ord5 = result.unverified_obligations?.unverified_rules.find((r) => r.rule_id === 'ORD-5');
    expect(ord5).toBeUndefined();
  });

  it('non-canonical capability_scope key emits one ORD-5 manifest entry per drift key', () => {
    const data = loadGenesis();
    data.capability_scope = { 'governance': 'vote-and-propose', 'custom_scope': 'arbitrary' };
    const result = validate(OrgRepresentativeDelegationSchema, data);
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const ord5Entries = result.unverified_obligations?.unverified_rules.filter((r) => r.rule_id === 'ORD-5') ?? [];
    expect(ord5Entries.length).toBe(1);
    expect(ord5Entries[0].reason).toBe('vocabulary_drift');
    expect(ord5Entries[0].evaluator).toBe('library');
    expect(ord5Entries[0].evaluation_note).toContain('custom_scope');
  });

  it('two non-canonical capability_scope keys emit two ORD-5 manifest entries', () => {
    const data = loadGenesis();
    data.capability_scope = { 'foo': 'bar', 'baz': 'qux' };
    const result = validate(OrgRepresentativeDelegationSchema, data);
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const ord5Entries = result.unverified_obligations?.unverified_rules.filter((r) => r.rule_id === 'ORD-5') ?? [];
    expect(ord5Entries.length).toBe(2);
    const driftKeys = ord5Entries.map((e) => {
      const match = e.evaluation_note.match(/key "([^"]+)"/);
      return match?.[1];
    }).sort();
    expect(driftKeys).toEqual(['baz', 'foo']);
  });

  it('ORD-5 surfacing co-exists with ORD-3 manifest emission', () => {
    const data = loadGenesis();
    data.capability_scope = { 'drift_key': 'value' };
    const result = validate(OrgRepresentativeDelegationSchema, data);
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const ruleIds = (result.unverified_obligations?.unverified_rules ?? []).map((r) => r.rule_id).sort();
    expect(ruleIds).toContain('ORD-3');
    expect(ruleIds).toContain('ORD-5');
  });

  it('valid: false path (failClosed + chain absent) does NOT emit ORD-5 manifest (errors path takes precedence)', () => {
    const data = loadGenesis();
    data.capability_scope = { 'drift_key': 'value' };
    const result = validate(OrgRepresentativeDelegationSchema, data, { failClosed: true });
    expect(result.valid).toBe(false);
    if (result.valid !== false) return;
    expect(result.errors.some((e) => e.startsWith('CHAIN_CONTEXT_DEFERRED:'))).toBe(true);
  });
});
