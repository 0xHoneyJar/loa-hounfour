/**
 * PR-A3.4 (FR-B2) — Tests for `signer_key_id_matches_derivation` LOCAL builtin.
 *
 * @see src/constraints/builtins/signer-key-id-matches-derivation.ts
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  evaluateSignerKeyIdMatchesDerivation,
  deriveSignerKeyId,
} from '../../src/constraints/builtins/signer-key-id-matches-derivation.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

describe('deriveSignerKeyId', () => {
  it('produces the canonical sha256 of cluster_id || ":" || key_version', () => {
    const expected = sha256Hex('cluster-1:7');
    expect(deriveSignerKeyId('cluster-1', '7')).toBe(expected);
  });

  it('colon delimiter is byte-stable (ASCII 0x3A)', () => {
    expect(deriveSignerKeyId('a', 'b')).toBe(sha256Hex('a:b'));
  });

  it('handles empty cluster_id (still produces stable hash)', () => {
    expect(deriveSignerKeyId('', '1')).toBe(sha256Hex(':1'));
  });
});

describe('evaluateSignerKeyIdMatchesDerivation (standalone)', () => {
  describe('Happy path', () => {
    it('passes when key_id matches sha256_hex(cluster_id||":"||version)', () => {
      const cid = 'cluster-1';
      const kv = '7';
      const kid = deriveSignerKeyId(cid, kv);
      const result = evaluateSignerKeyIdMatchesDerivation(
        { cid, kv, kid },
        'cid',
        'kv',
        'kid',
      );
      expect(result.valid).toBe(true);
      expect(result.diagnostic).toBeUndefined();
    });

    it('case-insensitive: uppercase asserted key_id matches lowercase derivation', () => {
      const cid = 'cluster-1';
      const kv = '7';
      const kid = deriveSignerKeyId(cid, kv).toUpperCase();
      const result = evaluateSignerKeyIdMatchesDerivation(
        { cid, kv, kid },
        'cid',
        'kv',
        'kid',
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('SIGNER_KEY_ID_MISMATCH', () => {
    it('fires when asserted key_id is wrong', () => {
      const result = evaluateSignerKeyIdMatchesDerivation(
        {
          cid: 'cluster-1',
          kv: '7',
          kid: '0000000000000000000000000000000000000000000000000000000000000000',
        },
        'cid',
        'kv',
        'kid',
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SIGNER_KEY_ID_MISMATCH');
      expect(result.diagnostic?.signer_cluster_id).toBe('cluster-1');
      expect(result.diagnostic?.signer_key_version).toBe('7');
      expect(result.diagnostic?.derived_key_id).toBe(deriveSignerKeyId('cluster-1', '7'));
    });

    it('fires when cluster_id changed but key_id stayed', () => {
      const kid = deriveSignerKeyId('cluster-1', '7');
      const result = evaluateSignerKeyIdMatchesDerivation(
        { cid: 'cluster-2', kv: '7', kid }, // cluster-2 with cluster-1's key_id
        'cid',
        'kv',
        'kid',
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SIGNER_KEY_ID_MISMATCH');
    });

    it('fires when key_version changed but key_id stayed', () => {
      const kid = deriveSignerKeyId('cluster-1', '7');
      const result = evaluateSignerKeyIdMatchesDerivation(
        { cid: 'cluster-1', kv: '8', kid }, // version 8 with version 7's key_id
        'cid',
        'kv',
        'kid',
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SIGNER_KEY_ID_MISMATCH');
    });
  });

  describe('SIGNER_KEY_ID_INVALID_INPUT', () => {
    it('rejects null record', () => {
      const result = evaluateSignerKeyIdMatchesDerivation(null, 'cid', 'kv', 'kid');
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SIGNER_KEY_ID_INVALID_INPUT');
    });

    it('rejects array record', () => {
      const result = evaluateSignerKeyIdMatchesDerivation([], 'cid', 'kv', 'kid');
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SIGNER_KEY_ID_INVALID_INPUT');
    });

    it('rejects record missing cluster_id field', () => {
      const result = evaluateSignerKeyIdMatchesDerivation(
        { kv: '7', kid: 'abc' },
        'cid',
        'kv',
        'kid',
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SIGNER_KEY_ID_INVALID_INPUT');
    });

    it('rejects non-string fields', () => {
      const result = evaluateSignerKeyIdMatchesDerivation(
        { cid: 'cluster-1', kv: 7 as unknown as string, kid: 'abc' },
        'cid',
        'kv',
        'kid',
      );
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('SIGNER_KEY_ID_INVALID_INPUT');
    });
  });
});

describe('signer_key_id_matches_derivation (constraint-DSL wrapper)', () => {
  it('returns true on matching derivation', () => {
    const cid = 'cluster-1';
    const kv = '7';
    const kid = deriveSignerKeyId(cid, kv);
    const data = { record: { cid, kv, kid } };
    const result = evaluateConstraint(
      data,
      "signer_key_id_matches_derivation(record, 'cid', 'kv', 'kid')",
    );
    expect(result).toBe(true);
  });

  it('returns false on mismatching derivation', () => {
    const data = {
      record: {
        cid: 'cluster-1',
        kv: '7',
        kid: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    };
    const result = evaluateConstraint(
      data,
      "signer_key_id_matches_derivation(record, 'cid', 'kv', 'kid')",
    );
    expect(result).toBe(false);
  });
});
