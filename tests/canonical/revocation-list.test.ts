/**
 * PR-A4.4 (FR-G4) — Schema-shape unit tests for `RevocationListSchema`,
 * `RevocationReasonSchema`, `QuorumSignatureEntrySchema`,
 * `RevocationListEntrySchema`, and the inline cross-field validator
 * covering the library-evaluable RL-N invariants (RL-1, RL-5, RL-7,
 * RL-9, RL-10, RL-12).
 *
 * The vector runner at `tests/vectors/revocation-list-vectors.test.ts`
 * walks `vectors/RevocationList/v8.7.0/{valid,invalid,invalid-cross-field}`
 * and exercises the two-layer validation contract per the cycle-005 +
 * PR-A4.1/A4.2/A4.3 vector-runner discipline.
 *
 * **RL-8 is an explicit non-constraint** per the PR-A3.8 anti-finding-
 * rotation lesson — empty revoked_keys is admissible at any envelope
 * (genesis OR continuation page with no new revocations). The
 * vector-runner valid fixture set includes `rl-004-continuation-no-
 * new-revocations.json` to lock this in.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RevocationListSchema,
  RevocationReasonSchema,
  RevocationListEntrySchema,
  QuorumSignatureEntrySchema,
  validateRevocationList,
} from '../../src/canonical/index.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const REASONS = [
  'compromise',
  'rotation',
  'governance_action',
  'timeout',
  'manual',
] as const;

// Public-key identifiers: 43-char unpadded base64url with `ed25519-pub:`
// prefix (32-byte Ed25519 public key per RFC 4648 §5). Distinct from
// signature pattern (86 chars, `ed25519:` prefix, 64-byte signature).
// iter-1 MEDIUM mitigation: pattern alignment to v8.6.0 precedent.
const KEY_PRIMARY = 'ed25519-pub:' + 'A'.repeat(43);
const KEY_OTHER_1 = 'ed25519-pub:' + 'B'.repeat(43);
const KEY_OTHER_2 = 'ed25519-pub:' + 'C'.repeat(43);
const KEY_OTHER_3 = 'ed25519-pub:' + 'D'.repeat(43);
const SIG_SAMPLE = 'ed25519:' + 'E'.repeat(86);
const SIG_QUORUM_1 = 'ed25519:' + 'F'.repeat(86);
const SIG_QUORUM_2 = 'ed25519:' + 'G'.repeat(86);

function baseEntry(keyId: string, reason: (typeof REASONS)[number] = 'compromise'): {
  key_id: string;
  reason: string;
  revoked_at: string;
  revocation_evidence_hash: string | null;
} {
  return {
    key_id: keyId,
    reason,
    revoked_at: '2026-04-01T00:00:00Z',
    revocation_evidence_hash: null,
  };
}

function baseEnvelope(
  revoked: ReadonlyArray<unknown> = [],
): Record<string, unknown> {
  return {
    envelope_kind: 'revocation_list',
    contract_version: '8.7.0',
    cluster_id: 'cluster-test',
    list_id: 'rl-test-001',
    issued_at: '2026-05-01T00:00:00Z',
    valid_from: '2026-05-01T00:00:00Z',
    valid_until: null,
    max_staleness_seconds: null,
    nonce: 1,
    prev_envelope_hash: null,
    next_page_hash: null,
    revoked_keys: revoked,
    signer_key_id: KEY_PRIMARY,
    signature: SIG_SAMPLE,
    quorum_signatures: null,
    root_of_trust_id: null,
  };
}

describe('RevocationReasonSchema (FR-G4)', () => {
  it('locks 5 members per the v8.7.0 ship line', () => {
    for (const r of REASONS) {
      expect(Value.Check(RevocationReasonSchema, r)).toBe(true);
    }
  });

  it('rejects out-of-vocab labels', () => {
    expect(Value.Check(RevocationReasonSchema, 'deprecated')).toBe(false);
    expect(Value.Check(RevocationReasonSchema, 'Compromise')).toBe(false);
    expect(Value.Check(RevocationReasonSchema, '')).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 convention', () => {
    expect(RevocationReasonSchema.$id).toBe('RevocationReason');
  });
});

describe('QuorumSignatureEntrySchema (FR-G4)', () => {
  it('admits a well-formed entry', () => {
    expect(
      Value.Check(QuorumSignatureEntrySchema, {
        signer_key_id: KEY_PRIMARY,
        signature: SIG_SAMPLE,
      }),
    ).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(
      Value.Check(QuorumSignatureEntrySchema, {
        signer_key_id: KEY_PRIMARY,
        signature: SIG_SAMPLE,
        extra: 'no',
      }),
    ).toBe(false);
  });

  it('rejects signer_key_id that does not match ed25519 pattern', () => {
    expect(
      Value.Check(QuorumSignatureEntrySchema, {
        signer_key_id: 'not-ed25519',
        signature: SIG_SAMPLE,
      }),
    ).toBe(false);
  });
});

describe('RevocationListEntrySchema (FR-G4)', () => {
  it('admits a minimal well-formed entry', () => {
    expect(Value.Check(RevocationListEntrySchema, baseEntry(KEY_PRIMARY))).toBe(
      true,
    );
  });

  it('admits a sha256 revocation_evidence_hash', () => {
    const e = baseEntry(KEY_PRIMARY);
    e.revocation_evidence_hash =
      'sha256:' + '0'.repeat(64);
    expect(Value.Check(RevocationListEntrySchema, e)).toBe(true);
  });

  it('rejects malformed revocation_evidence_hash', () => {
    const e = baseEntry(KEY_PRIMARY);
    e.revocation_evidence_hash = 'not-sha256';
    expect(Value.Check(RevocationListEntrySchema, e)).toBe(false);
  });

  it('rejects malformed key_id', () => {
    const e = baseEntry('not-ed25519');
    expect(Value.Check(RevocationListEntrySchema, e)).toBe(false);
  });

  it('rejects malformed revoked_at', () => {
    const e = baseEntry(KEY_PRIMARY);
    e.revoked_at = 'yesterday';
    expect(Value.Check(RevocationListEntrySchema, e)).toBe(false);
  });

  it('rejects additional properties', () => {
    const e = { ...baseEntry(KEY_PRIMARY), extra: 1 } as unknown;
    expect(Value.Check(RevocationListEntrySchema, e)).toBe(false);
  });
});

describe('RevocationListSchema structural (FR-G4)', () => {
  it('admits a minimal genesis envelope (empty revoked_keys, null prev_envelope_hash)', () => {
    expect(Value.Check(RevocationListSchema, baseEnvelope())).toBe(true);
  });

  it('admits an empty revoked_keys at non-genesis (RL-8 explicit non-constraint)', () => {
    const env = baseEnvelope();
    env.prev_envelope_hash = 'sha256:' + '1'.repeat(64);
    env.nonce = 42;
    expect(Value.Check(RevocationListSchema, env)).toBe(true);
  });

  it('admits a non-empty revoked_keys envelope', () => {
    expect(
      Value.Check(RevocationListSchema, baseEnvelope([baseEntry(KEY_OTHER_1)])),
    ).toBe(true);
  });

  it('admits revoked_keys up to maxItems boundary (4096)', () => {
    const entries = Array.from({ length: 4096 }, (_, i) => {
      const e = baseEntry(KEY_OTHER_1);
      // Each key_id must be distinct for RL-1 + pubkey-pattern-valid.
      // 43-char unpadded base64url payload.
      const idx = i.toString().padStart(43, '0').slice(-43);
      e.key_id = 'ed25519-pub:' + idx;
      return e;
    });
    expect(Value.Check(RevocationListSchema, baseEnvelope(entries))).toBe(true);
  });

  it('rejects revoked_keys with 4097 entries (maxItems exceeded)', () => {
    const entries = Array.from({ length: 4097 }, () => baseEntry(KEY_OTHER_1));
    expect(Value.Check(RevocationListSchema, baseEnvelope(entries))).toBe(
      false,
    );
  });

  it('rejects envelope_kind mismatch', () => {
    const env = baseEnvelope();
    env.envelope_kind = 'subscription_pool_state';
    expect(Value.Check(RevocationListSchema, env)).toBe(false);
  });

  it('rejects contract_version mismatch', () => {
    const env = baseEnvelope();
    env.contract_version = '8.6.0';
    expect(Value.Check(RevocationListSchema, env)).toBe(false);
  });

  it('rejects additional properties on the envelope', () => {
    const env = { ...baseEnvelope(), extra: 'no' };
    expect(Value.Check(RevocationListSchema, env)).toBe(false);
  });

  it('admits null prev_envelope_hash (genesis)', () => {
    const env = baseEnvelope();
    env.prev_envelope_hash = null;
    expect(Value.Check(RevocationListSchema, env)).toBe(true);
  });

  it('admits null next_page_hash (last page)', () => {
    const env = baseEnvelope();
    env.next_page_hash = null;
    expect(Value.Check(RevocationListSchema, env)).toBe(true);
  });

  it('admits null valid_until (open-ended)', () => {
    const env = baseEnvelope();
    env.valid_until = null;
    expect(Value.Check(RevocationListSchema, env)).toBe(true);
  });

  it('rejects nonce below the minimum', () => {
    const env = baseEnvelope();
    env.nonce = -1;
    expect(Value.Check(RevocationListSchema, env)).toBe(false);
  });

  it('rejects nonce above Number.MAX_SAFE_INTEGER', () => {
    const env = baseEnvelope();
    env.nonce = 9_007_199_254_740_992;
    expect(Value.Check(RevocationListSchema, env)).toBe(false);
  });

  it('admits quorum_signatures at the 32-signer maxItems boundary', () => {
    const quorum = Array.from({ length: 32 }, (_, i) => ({
      signer_key_id:
        'ed25519-pub:' + i.toString().padStart(43, '0').slice(-43),
      signature: SIG_QUORUM_1,
    }));
    const env = baseEnvelope();
    env.quorum_signatures = quorum;
    expect(Value.Check(RevocationListSchema, env)).toBe(true);
  });

  it('rejects quorum_signatures with 33 entries (maxItems exceeded)', () => {
    const quorum = Array.from({ length: 33 }, () => ({
      signer_key_id: KEY_PRIMARY,
      signature: SIG_QUORUM_1,
    }));
    const env = baseEnvelope();
    env.quorum_signatures = quorum;
    expect(Value.Check(RevocationListSchema, env)).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 convention', () => {
    expect(RevocationListSchema.$id).toBe('RevocationList');
  });

  it('carries x-crypto-bearing:true', () => {
    expect(
      (RevocationListSchema as Record<string, unknown>)['x-crypto-bearing'],
    ).toBe(true);
  });

  it('carries x-chain-bearing:true', () => {
    expect(
      (RevocationListSchema as Record<string, unknown>)['x-chain-bearing'],
    ).toBe(true);
  });
});

describe('validateRevocationList — cross-field tier (FR-G4)', () => {
  it('passes a structurally and cross-field-valid genesis envelope', () => {
    const result = validate(RevocationListSchema, baseEnvelope(), {
      acceptDeferred: true,
    });
    if (!result.valid) {
      throw new Error('errors: ' + JSON.stringify(result.errors));
    }
    expect(result.valid).toBe(true);
  });

  it('flags RL-1 when two revoked_keys share a key_id', () => {
    const env = baseEnvelope([
      baseEntry(KEY_OTHER_1),
      baseEntry(KEY_OTHER_1),
    ]);
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-1'))).toBe(true);
  });

  it('flags RL-5 when signer_key_id is self-revoked', () => {
    const env = baseEnvelope([baseEntry(KEY_PRIMARY)]);
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-5'))).toBe(true);
    expect(result.errors.some((e) => e.includes(KEY_PRIMARY))).toBe(true);
  });

  it('flags RL-7 when revoked_at is after issued_at', () => {
    const entry = baseEntry(KEY_OTHER_1);
    entry.revoked_at = '2027-01-01T00:00:00Z';
    const env = baseEnvelope([entry]);
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-7'))).toBe(true);
  });

  it('flags RL-9 when valid_until is before valid_from', () => {
    const env = baseEnvelope();
    env.valid_from = '2026-05-01T00:00:00Z';
    env.valid_until = '2026-04-01T00:00:00Z';
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-9'))).toBe(true);
  });

  it('flags RL-10 when valid_from is after issued_at', () => {
    const env = baseEnvelope();
    env.valid_from = '2027-01-01T00:00:00Z';
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-10'))).toBe(true);
  });

  it('flags RL-12 when quorum_signatures is non-null but primary is absent', () => {
    const env = baseEnvelope();
    env.quorum_signatures = [
      { signer_key_id: KEY_OTHER_1, signature: SIG_QUORUM_1 },
      { signer_key_id: KEY_OTHER_2, signature: SIG_QUORUM_2 },
    ];
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-12'))).toBe(true);
  });

  it('flags RL-12 when quorum_signatures has duplicate signers', () => {
    const env = baseEnvelope();
    env.quorum_signatures = [
      { signer_key_id: KEY_PRIMARY, signature: SIG_QUORUM_1 },
      { signer_key_id: KEY_OTHER_1, signature: SIG_QUORUM_2 },
      { signer_key_id: KEY_OTHER_1, signature: SIG_QUORUM_2 },
    ];
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-12'))).toBe(true);
  });

  it('passes when quorum_signatures is non-null AND primary is in the set AND all distinct', () => {
    const env = baseEnvelope();
    env.quorum_signatures = [
      { signer_key_id: KEY_PRIMARY, signature: SIG_QUORUM_1 },
      { signer_key_id: KEY_OTHER_1, signature: SIG_QUORUM_2 },
      { signer_key_id: KEY_OTHER_2, signature: SIG_SAMPLE },
    ];
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(true);
  });

  it('passes RL-8 explicit non-constraint: empty revoked_keys at non-genesis', () => {
    const env = baseEnvelope();
    env.prev_envelope_hash = 'sha256:' + '1'.repeat(64);
    env.nonce = 42;
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(true);
  });

  it('accumulates multiple RL-N errors in a single pass', () => {
    const a = baseEntry(KEY_OTHER_1);
    a.revoked_at = '2027-01-01T00:00:00Z'; // RL-7
    const b = baseEntry(KEY_OTHER_1); // RL-1 duplicate
    const env = baseEnvelope([a, b]);
    env.valid_from = '2027-06-01T00:00:00Z'; // RL-10
    const result = validate(RevocationListSchema, env, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('RL-1'))).toBe(true);
    expect(result.errors.some((e) => e.includes('RL-7'))).toBe(true);
    expect(result.errors.some((e) => e.includes('RL-10'))).toBe(true);
  });
});

describe('validateRevocationList — defensive contract (FR-G4)', () => {
  it('does not throw on null input', () => {
    const result = validateRevocationList(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('structural shape precondition');
  });

  it('does not throw on array input', () => {
    const result = validateRevocationList([]);
    expect(result.valid).toBe(false);
  });

  it('does not throw on missing revoked_keys', () => {
    const result = validateRevocationList({ signer_key_id: KEY_PRIMARY });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('revoked_keys'))).toBe(true);
  });

  it('does not throw on non-array quorum_signatures', () => {
    const result = validateRevocationList({
      revoked_keys: [],
      issued_at: '2026-05-01T00:00:00Z',
      valid_from: '2026-05-01T00:00:00Z',
      signer_key_id: KEY_PRIMARY,
      quorum_signatures: 'not-an-array',
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('quorum_signatures must be null')),
    ).toBe(true);
  });
});

describe('RevocationList published JSON Schema $id contract', () => {
  it('the published JSON Schema $id is the canonical versioned URI', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'revocation-list.schema.json',
    );
    const generated = JSON.parse(readFileSync(schemaPath, 'utf8')) as {
      $id: string;
    };
    expect(generated.$id).toBe(
      'https://schemas.0xhoneyjar.com/loa-hounfour/8.7.0/revocation-list',
    );
  });

  it('the published JSON Schema carries zero $ref values', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'revocation-list.schema.json',
    );
    const raw = readFileSync(schemaPath, 'utf8');
    expect(raw).not.toContain('"$ref"');
  });

  it('the published JSON Schema carries x-crypto-bearing AND x-chain-bearing', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'revocation-list.schema.json',
    );
    const generated = JSON.parse(readFileSync(schemaPath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(generated['x-crypto-bearing']).toBe(true);
    expect(generated['x-chain-bearing']).toBe(true);
  });

  it('the cross-field validator registry key matches the TypeBox $id', async () => {
    const { getCrossFieldValidatorSchemas } = await import(
      '../../src/validators/index.js'
    );
    const registered = getCrossFieldValidatorSchemas();
    expect(registered).toContain(RevocationListSchema.$id);
    expect(RevocationListSchema.$id).toBe('RevocationList');
  });
});
