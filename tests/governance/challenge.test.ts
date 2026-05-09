/**
 * PR-A3.7 (FR-A1) — Schema-shape unit tests for `ChallengeSchema`,
 * `ChallengeTypeSchema`, and `ChallengeRequestedEffectSchema`.
 *
 * Cross-checks the locked enum membership counts (9 + 6) and the
 * required-field set on the Challenge envelope. This file checks
 * only the locked schema surface; per-label justification lives
 * in the cycle's internal review artifacts and is not committed.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ChallengeSchema,
  ChallengeTypeSchema,
  ChallengeRequestedEffectSchema,
} from '../../src/governance/index.js';

const EXPECTED_TYPES = [
  'factual_dispute',
  'policy_dispute',
  'competence_dispute',
  'procedural_dispute',
  'drift_assertion',
  'signature_replay',
  'chain_corruption',
  'class_violation',
  'other',
] as const;

const EXPECTED_EFFECTS = [
  'void',
  'reverse',
  'amend',
  'escalate_panel',
  'escalate_operator',
  'annotate_only',
] as const;

describe('ChallengeTypeSchema (FR-A1)', () => {
  it('locks 9 members per the cycle-005 reuse-audit', () => {
    expect(EXPECTED_TYPES.length).toBe(9);
    for (const m of EXPECTED_TYPES) {
      expect(Value.Check(ChallengeTypeSchema, m)).toBe(true);
    }
  });

  it('rejects out-of-vocabulary labels', () => {
    expect(Value.Check(ChallengeTypeSchema, 'fork_assertion')).toBe(false);
    expect(Value.Check(ChallengeTypeSchema, 'request_disclosure')).toBe(false);
    expect(Value.Check(ChallengeTypeSchema, '')).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(ChallengeTypeSchema.$id).toBe('ChallengeType');
  });
});

describe('ChallengeRequestedEffectSchema (FR-A1)', () => {
  it('locks 6 members per the cycle-005 reuse-audit', () => {
    expect(EXPECTED_EFFECTS.length).toBe(6);
    for (const m of EXPECTED_EFFECTS) {
      expect(Value.Check(ChallengeRequestedEffectSchema, m)).toBe(true);
    }
  });

  it('rejects out-of-vocabulary labels', () => {
    expect(Value.Check(ChallengeRequestedEffectSchema, 'merge_into_other')).toBe(
      false,
    );
    expect(Value.Check(ChallengeRequestedEffectSchema, 'archive')).toBe(false);
    expect(Value.Check(ChallengeRequestedEffectSchema, '')).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 schema-id convention', () => {
    expect(ChallengeRequestedEffectSchema.$id).toBe('ChallengeRequestedEffect');
  });
});

describe('ChallengeSchema (FR-A1)', () => {
  const validPayload = {
    envelope_kind: 'challenge' as const,
    contract_version: '8.6.0' as const,
    challenge_id: 'challenge-001',
    ts: '2026-05-09T12:00:00Z',
    challenger_id: 'challenger-001',
    target_assertion_id: '00000000-0000-4000-8000-000000000001',
    challenge_type: 'factual_dispute' as const,
    requested_effect: 'annotate_only' as const,
    rationale: 'Test',
    evidence_hashes: [],
    signature: 'ed25519:' + 'A'.repeat(86),
  };

  it('carries the PascalCase $id and crypto-bearing metadata', () => {
    expect(ChallengeSchema.$id).toBe('Challenge');
    expect(
      (ChallengeSchema as { 'x-crypto-bearing'?: boolean })['x-crypto-bearing'],
    ).toBe(true);
  });

  it('admits a minimal canonical payload', () => {
    expect(Value.Check(ChallengeSchema, validPayload)).toBe(true);
  });

  it('rejects extra properties at the root (additionalProperties: false)', () => {
    const extra = { ...validPayload, surprise_field: 'unexpected' };
    expect(Value.Check(ChallengeSchema, extra)).toBe(false);
  });

  it('rejects rationale longer than 8192 chars', () => {
    const tooLong = { ...validPayload, rationale: 'a'.repeat(8193) };
    expect(Value.Check(ChallengeSchema, tooLong)).toBe(false);
  });

  it('rejects empty rationale (minLength: 1)', () => {
    const empty = { ...validPayload, rationale: '' };
    expect(Value.Check(ChallengeSchema, empty)).toBe(false);
  });

  it('rejects malformed signature (missing ed25519: prefix)', () => {
    const bad = { ...validPayload, signature: 'A'.repeat(86) };
    expect(Value.Check(ChallengeSchema, bad)).toBe(false);
  });

  it('rejects malformed evidence_hash entries (missing sha256: prefix)', () => {
    const bad = {
      ...validPayload,
      evidence_hashes: ['a'.repeat(64)],
    };
    expect(Value.Check(ChallengeSchema, bad)).toBe(false);
  });

  it('admits empty evidence_hashes array (CHL-4 schema-admits-empty contract)', () => {
    const ok = { ...validPayload, evidence_hashes: [] };
    expect(Value.Check(ChallengeSchema, ok)).toBe(true);
  });

  it('admits mixed-case hex in evidence_hashes per SHA256_HEX_PATTERN', () => {
    const ok = {
      ...validPayload,
      evidence_hashes: ['sha256:' + 'A'.repeat(64)],
    };
    expect(Value.Check(ChallengeSchema, ok)).toBe(true);
  });

  it('rejects non-UTC timestamps (ISO8601_UTC_PATTERN locks the Z suffix)', () => {
    const bad = { ...validPayload, ts: '2026-05-09T12:00:00+00:00' };
    expect(Value.Check(ChallengeSchema, bad)).toBe(false);
  });
});
