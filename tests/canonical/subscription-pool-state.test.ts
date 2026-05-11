/**
 * PR-A4.3 (FR-G3) — Schema-shape unit tests for
 * `SubscriptionPoolStateSchema`, `SubscriptionAccountEntrySchema`,
 * `SubscriptionAccountStateSchema`, `RateEnvelopeSchema`, and the
 * inline cross-field validator covering SPS-1 (bigint-safe
 * consumed_units ≤ allocated_units), SPS-2 (account_id distinct),
 * and SPS-4 (stable_until ≥ ts via JCS-canonical-form lexicographic
 * comparison).
 *
 * The vector runner at
 * `tests/vectors/subscription-pool-state-vectors.test.ts` walks
 * `vectors/SubscriptionPoolState/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and exercises the two-layer validation contract per the cycle-005
 * + PR-A4.1 + PR-A4.2 vector-runner discipline.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SubscriptionPoolStateSchema,
  SubscriptionAccountStateSchema,
  SubscriptionAccountEntrySchema,
  RateEnvelopeSchema,
  validateSubscriptionPoolState,
} from '../../src/canonical/index.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const STATES = ['healthy', 'rate_limited', 'exhausted'] as const;
const SAMPLE_SIG = 'ed25519:' + 'A'.repeat(86);

function baseRateEnvelope(): { req_per_min: number; req_per_hour: number } {
  return { req_per_min: 60, req_per_hour: 3600 };
}

function baseAccount(
  id: string,
  state: (typeof STATES)[number] = 'healthy',
): {
  account_id: string;
  provider: string;
  state: string;
  stable_until: string;
  rate_envelope: { req_per_min: number; req_per_hour: number };
  thrash_count_24h: number;
  allocated_units: string;
  consumed_units: string;
} {
  return {
    account_id: id,
    provider: 'anthropic',
    state,
    stable_until: '2026-05-09T01:00:00Z',
    rate_envelope: baseRateEnvelope(),
    thrash_count_24h: 0,
    allocated_units: '5000',
    consumed_units: '1000',
  };
}

function baseEnvelope(
  accounts: ReadonlyArray<unknown> = [baseAccount('acct-001')],
): Record<string, unknown> {
  return {
    envelope_kind: 'subscription_pool_state',
    contract_version: '8.7.0',
    ts: '2026-05-09T00:00:00Z',
    cluster_id: 'cluster-test',
    pool_health_id: null,
    accounts,
    pause_resume_pair_id: 'pause-resume-001',
    signer_cluster_id: 'signer-cluster-001',
    signature: SAMPLE_SIG,
  };
}

describe('SubscriptionAccountStateSchema (FR-G3)', () => {
  it('locks 3 members per the v8.7.0 ship line', () => {
    for (const m of STATES) {
      expect(Value.Check(SubscriptionAccountStateSchema, m)).toBe(true);
    }
  });

  it('rejects out-of-vocabulary labels', () => {
    expect(Value.Check(SubscriptionAccountStateSchema, 'unknown')).toBe(false);
    expect(Value.Check(SubscriptionAccountStateSchema, 'Healthy')).toBe(false);
    expect(Value.Check(SubscriptionAccountStateSchema, '')).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 convention', () => {
    expect(SubscriptionAccountStateSchema.$id).toBe('SubscriptionAccountState');
  });
});

describe('RateEnvelopeSchema (FR-G3)', () => {
  it('admits the minimum and maximum boundaries', () => {
    expect(
      Value.Check(RateEnvelopeSchema, { req_per_min: 0, req_per_hour: 0 }),
    ).toBe(true);
    expect(
      Value.Check(RateEnvelopeSchema, {
        req_per_min: 1_000_000,
        req_per_hour: 60_000_000,
      }),
    ).toBe(true);
  });

  it('rejects req_per_min above the locked maximum', () => {
    expect(
      Value.Check(RateEnvelopeSchema, {
        req_per_min: 1_000_001,
        req_per_hour: 0,
      }),
    ).toBe(false);
  });

  it('rejects negative req_per_min', () => {
    expect(
      Value.Check(RateEnvelopeSchema, { req_per_min: -1, req_per_hour: 0 }),
    ).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(
      Value.Check(RateEnvelopeSchema, {
        req_per_min: 0,
        req_per_hour: 0,
        extra: 'no',
      }),
    ).toBe(false);
  });
});

describe('SubscriptionAccountEntrySchema (FR-G3)', () => {
  it('admits a minimal well-formed entry', () => {
    expect(
      Value.Check(SubscriptionAccountEntrySchema, baseAccount('acct-001')),
    ).toBe(true);
  });

  it('rejects empty account_id (minLength: 1)', () => {
    expect(
      Value.Check(SubscriptionAccountEntrySchema, baseAccount('')),
    ).toBe(false);
  });

  it('rejects provider over 64 chars', () => {
    const a = baseAccount('acct-001');
    a.provider = 'p'.repeat(65);
    expect(Value.Check(SubscriptionAccountEntrySchema, a)).toBe(false);
  });

  it('admits provider at exactly 64 chars (boundary)', () => {
    const a = baseAccount('acct-001');
    a.provider = 'p'.repeat(64);
    expect(Value.Check(SubscriptionAccountEntrySchema, a)).toBe(true);
  });

  it('rejects allocated_units with leading minus', () => {
    const a = baseAccount('acct-001');
    a.allocated_units = '-500';
    expect(Value.Check(SubscriptionAccountEntrySchema, a)).toBe(false);
  });

  it('rejects allocated_units with decimal point', () => {
    const a = baseAccount('acct-001');
    a.allocated_units = '500.0';
    expect(Value.Check(SubscriptionAccountEntrySchema, a)).toBe(false);
  });

  it('admits a 50-digit allocated_units value (bigint stress)', () => {
    const a = baseAccount('acct-001');
    a.allocated_units = '1' + '0'.repeat(49);
    a.consumed_units = '9' + '0'.repeat(48);
    expect(Value.Check(SubscriptionAccountEntrySchema, a)).toBe(true);
  });

  it('rejects thrash_count_24h above the 100,000 ceiling', () => {
    const a = baseAccount('acct-001');
    a.thrash_count_24h = 100_001;
    expect(Value.Check(SubscriptionAccountEntrySchema, a)).toBe(false);
  });

  it('rejects additional properties on the account entry', () => {
    const a = { ...baseAccount('acct-001'), extra: 'no' } as unknown;
    expect(Value.Check(SubscriptionAccountEntrySchema, a)).toBe(false);
  });
});

describe('SubscriptionPoolStateSchema structural (FR-G3)', () => {
  it('admits a minimal single-account envelope', () => {
    expect(Value.Check(SubscriptionPoolStateSchema, baseEnvelope())).toBe(true);
  });

  it('rejects empty accounts array (minItems: 1)', () => {
    expect(Value.Check(SubscriptionPoolStateSchema, baseEnvelope([]))).toBe(
      false,
    );
  });

  it('rejects ts with non-Z offset', () => {
    const env = baseEnvelope();
    env.ts = '2026-05-09T00:00:00+02:00';
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(false);
  });

  it('rejects contract_version mismatch (literal pin)', () => {
    const env = baseEnvelope();
    env.contract_version = '8.6.0';
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(false);
  });

  it('rejects envelope_kind mismatch (literal pin)', () => {
    const env = baseEnvelope();
    env.envelope_kind = 'cluster_run_series';
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(false);
  });

  it('rejects additional properties on the envelope', () => {
    const env = { ...baseEnvelope(), extra: 'no' };
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(false);
  });

  it('admits null pool_health_id', () => {
    const env = baseEnvelope();
    env.pool_health_id = null;
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(true);
  });

  it('admits a non-empty string pool_health_id', () => {
    const env = baseEnvelope();
    env.pool_health_id = 'oracle-health-001';
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(true);
  });

  it('rejects empty-string pool_health_id (canonical "no link" is null)', () => {
    const env = baseEnvelope();
    env.pool_health_id = '';
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(false);
  });

  it('rejects malformed signature (missing ed25519: prefix)', () => {
    const env = baseEnvelope();
    env.signature = 'A'.repeat(86);
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(false);
  });

  it('admits accounts at exactly 256 entries (maxItems boundary)', () => {
    const accounts = Array.from({ length: 256 }, (_, i) =>
      baseAccount(`acct-${i.toString().padStart(3, '0')}`),
    );
    const env = baseEnvelope(accounts);
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(true);
  });

  it('rejects accounts with 257 entries (maxItems exceeded)', () => {
    const accounts = Array.from({ length: 257 }, (_, i) =>
      baseAccount(`acct-${i.toString().padStart(3, '0')}`),
    );
    const env = baseEnvelope(accounts);
    expect(Value.Check(SubscriptionPoolStateSchema, env)).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(SubscriptionPoolStateSchema.$id).toBe('SubscriptionPoolState');
  });

  it('carries the x-crypto-bearing extension flag (cycle-005 convention)', () => {
    expect(
      (SubscriptionPoolStateSchema as Record<string, unknown>)[
        'x-crypto-bearing'
      ],
    ).toBe(true);
  });
});

describe('validateSubscriptionPoolState — cross-field tier (FR-G3)', () => {
  it('passes a structurally and cross-field-valid envelope', () => {
    const result = validate(SubscriptionPoolStateSchema, baseEnvelope(), { acceptDeferred: true });
    if (!result.valid) {
      throw new Error('errors: ' + JSON.stringify(result.errors));
    }
    expect(result.valid).toBe(true);
  });

  it('flags SPS-1 when consumed > allocated', () => {
    const acct = baseAccount('acct-001');
    acct.consumed_units = '6000';
    acct.allocated_units = '5000';
    const result = validate(SubscriptionPoolStateSchema, baseEnvelope([acct]), { acceptDeferred: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SPS-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('6000'))).toBe(true);
  });

  it('flags SPS-1 on bigint-stress overrun (50-digit values)', () => {
    const acct = baseAccount('acct-001');
    acct.allocated_units = '1' + '0'.repeat(49);
    acct.consumed_units = '1' + '0'.repeat(50);
    const result = validate(SubscriptionPoolStateSchema, baseEnvelope([acct]), { acceptDeferred: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SPS-1'))).toBe(true);
  });

  it('passes SPS-1 boundary: consumed == allocated', () => {
    const acct = baseAccount('acct-001');
    acct.consumed_units = '5000';
    acct.allocated_units = '5000';
    const result = validate(SubscriptionPoolStateSchema, baseEnvelope([acct]), { acceptDeferred: true });
    expect(result.valid).toBe(true);
  });

  it('flags SPS-2 when two accounts share an id', () => {
    const a = baseAccount('shared');
    const b = baseAccount('shared');
    b.provider = 'openai';
    const result = validate(SubscriptionPoolStateSchema, baseEnvelope([a, b]), { acceptDeferred: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SPS-2'))).toBe(true);
    expect(result.errors.some((e) => e.includes('"shared"'))).toBe(true);
  });

  it('flags SPS-4 when stable_until precedes ts', () => {
    const acct = baseAccount('acct-001');
    acct.stable_until = '2026-05-08T00:00:00Z';
    const env = baseEnvelope([acct]);
    env.ts = '2026-05-09T00:00:00Z';
    const result = validate(SubscriptionPoolStateSchema, env, { acceptDeferred: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SPS-4'))).toBe(true);
  });

  it('passes SPS-4 boundary: stable_until == ts', () => {
    const acct = baseAccount('acct-001');
    acct.stable_until = '2026-05-09T00:00:00Z';
    const env = baseEnvelope([acct]);
    env.ts = '2026-05-09T00:00:00Z';
    const result = validate(SubscriptionPoolStateSchema, env, { acceptDeferred: true });
    expect(result.valid).toBe(true);
  });

  it('accumulates SPS-1 + SPS-4 + SPS-2 errors in a single pass', () => {
    const a = baseAccount('shared');
    a.consumed_units = '9999';
    a.allocated_units = '100';
    const b = baseAccount('shared');
    b.stable_until = '2025-01-01T00:00:00Z';
    const env = baseEnvelope([a, b]);
    const result = validate(SubscriptionPoolStateSchema, env, { acceptDeferred: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('SPS-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('SPS-2'))).toBe(true);
    expect(result.errors.some((e) => e.includes('SPS-4'))).toBe(true);
  });
});

describe('validateSubscriptionPoolState — defensive contract (FR-G3)', () => {
  it('does not throw on null input', () => {
    const result = validateSubscriptionPoolState(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('structural shape precondition');
  });

  it('does not throw on undefined input', () => {
    const result = validateSubscriptionPoolState(undefined);
    expect(result.valid).toBe(false);
  });

  it('does not throw on array input', () => {
    const result = validateSubscriptionPoolState([1, 2, 3]);
    expect(result.valid).toBe(false);
  });

  it('does not throw on missing accounts', () => {
    const result = validateSubscriptionPoolState({});
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('accounts'))).toBe(true);
  });
});

describe('SubscriptionPoolState published JSON Schema $id contract (PR-A4.2 iter-2 pattern)', () => {
  it('the published JSON Schema $id is the canonical versioned URI', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'subscription-pool-state.schema.json',
    );
    const generated = JSON.parse(readFileSync(schemaPath, 'utf8')) as {
      $id: string;
    };
    expect(generated.$id).toBe(
      'https://schemas.0xhoneyjar.com/loa-hounfour/8.7.0/subscription-pool-state',
    );
  });

  it('the published JSON Schema carries zero $ref values (sub-schemas embedded, mirrors CanonicalRun precedent)', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'subscription-pool-state.schema.json',
    );
    const raw = readFileSync(schemaPath, 'utf8');
    expect(raw).not.toContain('"$ref"');
  });

  it('the cross-field validator registry key matches the TypeBox $id (iter-2 MEDIUM mitigation — no two-string drift)', async () => {
    const { getCrossFieldValidatorSchemas } = await import(
      '../../src/validators/index.js'
    );
    const registered = getCrossFieldValidatorSchemas();
    expect(registered).toContain(SubscriptionPoolStateSchema.$id);
    expect(SubscriptionPoolStateSchema.$id).toBe('SubscriptionPoolState');
  });

  it('the published JSON Schema carries x-crypto-bearing:true (consumer-visible flag)', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'subscription-pool-state.schema.json',
    );
    const generated = JSON.parse(readFileSync(schemaPath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(generated['x-crypto-bearing']).toBe(true);
  });
});
