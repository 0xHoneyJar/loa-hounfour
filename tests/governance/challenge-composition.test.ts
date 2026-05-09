/**
 * PR-A3.7 (FR-A1) — Composition test for the Challenge layer's
 * lazy-link to the v8.5.0 Assertion substrate.
 *
 * The composition shape (per SDD §1.5 / §3.14):
 *   - `Challenge.target_assertion_id: string` is a lazy-link
 *     reference to `Assertion.assertion_id` — no schema-level
 *     shape import.
 *   - When an `Assertion` has `status: 'challenged'`, a parallel
 *     `Challenge` envelope is authored against it. Both records
 *     validate independently; the linkage is the string equality
 *     `Challenge.target_assertion_id === Assertion.assertion_id`.
 *   - Hounfour does NOT emit a manifest entry for a missing target
 *     assertion (consumer-state per ADR-010 / CHL-2).
 *
 * This test exercises the round-trip:
 *   1. An Assertion with `status: 'challenged'` validates via
 *      acceptDeferred.
 *   2. A Challenge envelope authored against the same
 *      `assertion_id` validates via acceptDeferred.
 *   3. The string equality Challenge.target_assertion_id ===
 *      Assertion.assertion_id holds at the consumer-side join.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AssertionSchema,
  ChallengeSchema,
} from '../../src/governance/index.js';
import { validate } from '../../src/validators/index.js';
import '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadJson(path: string): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const { _comment: _ignored, ...rest } = raw;
  return rest;
}

const repoRoot = join(__dirname, '..', '..');
const challengedAssertionPath = join(
  repoRoot,
  'vectors',
  'Assertion',
  'valid',
  'challenged-with-signatures.json',
);

describe('Challenge ↔ Assertion composition (FR-A1 / PR-A3.7)', () => {
  it('a challenged Assertion fixture validates structurally', () => {
    const data = loadJson(challengedAssertionPath);
    expect(Value.Check(AssertionSchema, data)).toBe(true);
  });

  it('a parallel Challenge envelope keyed to the Assertion validates via acceptDeferred', () => {
    const assertion = loadJson(challengedAssertionPath) as {
      assertion_id: string;
      status: string;
    };
    expect(assertion.status).toBe('challenged');

    const challenge = {
      envelope_kind: 'challenge' as const,
      contract_version: '8.6.0' as const,
      challenge_id: 'challenge-composition-001',
      ts: '2026-05-09T12:00:00Z',
      challenger_id: 'challenger-composition-001',
      target_assertion_id: assertion.assertion_id,
      challenge_type: 'factual_dispute' as const,
      requested_effect: 'annotate_only' as const,
      rationale:
        'Composition test: a Challenge envelope authored against a v8.5.0 Assertion record with status=challenged.',
      evidence_hashes: [
        'sha256:' +
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ],
      signature: 'ed25519:' + 'A'.repeat(86),
    };

    expect(Value.Check(ChallengeSchema, challenge)).toBe(true);

    const result = validate(ChallengeSchema, challenge, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(true);
  });

  it('the consumer-side join is the string equality Challenge.target_assertion_id === Assertion.assertion_id', () => {
    const assertion = loadJson(challengedAssertionPath) as {
      assertion_id: string;
    };
    const target_assertion_id = assertion.assertion_id;

    const challenge = {
      envelope_kind: 'challenge' as const,
      contract_version: '8.6.0' as const,
      challenge_id: 'challenge-composition-002',
      ts: '2026-05-09T12:00:00Z',
      challenger_id: 'challenger-composition-002',
      target_assertion_id,
      challenge_type: 'policy_dispute' as const,
      requested_effect: 'escalate_panel' as const,
      rationale:
        'Composition test: lazy-link join asserted at the consumer side.',
      evidence_hashes: [],
      signature: 'ed25519:' + 'B'.repeat(86),
    };

    expect(challenge.target_assertion_id).toBe(assertion.assertion_id);
    expect(Value.Check(ChallengeSchema, challenge)).toBe(true);
  });

  it('hounfour does NOT emit a manifest entry for missing target assertions (CHL-2 lock-de-scope)', () => {
    // Per CHL-2 evaluation_note: assertion-store lookup is consumer-side;
    // the library does not surface MISSING_TARGET_ASSERTION manifest
    // entries. validate() with acceptDeferred over a Challenge whose
    // target_assertion_id points at a never-recorded assertion still
    // yields valid:true because the lookup is out-of-scope for the
    // library evaluator.
    const challenge = {
      envelope_kind: 'challenge' as const,
      contract_version: '8.6.0' as const,
      challenge_id: 'challenge-composition-003',
      ts: '2026-05-09T12:00:00Z',
      challenger_id: 'challenger-composition-003',
      target_assertion_id: '00000000-0000-4000-8000-deadbeefdead',
      challenge_type: 'chain_corruption' as const,
      requested_effect: 'escalate_operator' as const,
      rationale:
        'Composition test: target assertion is intentionally never recorded; library still admits the Challenge envelope per CHL-2 lock-de-scope.',
      evidence_hashes: [],
      signature: 'ed25519:' + 'C'.repeat(86),
    };
    const result = validate(ChallengeSchema, challenge, {
      acceptDeferred: true,
    });
    expect(result.valid).toBe(true);
    if (result.valid !== true) return;
    const manifest = result.unverified_obligations;
    // iter-1 mitigation: ChallengeSchema is x-crypto-bearing, so the
    // deferred path MUST emit a manifest. A silent undefined here would
    // be a green-light placebo (the very failure mode this test is
    // designed to catch).
    expect(
      manifest,
      'manifest must be emitted on the acceptDeferred path for an x-crypto-bearing schema',
    ).toBeDefined();
    const reasons = manifest!.unverified_rules.map((r) => r.reason);
    // Manifest carries crypto_deferred (FR-A1 x-crypto-bearing) but MUST
    // NOT carry any manifest-entry shaped like a missing-target lookup —
    // assertion-store lookup is consumer-state per CHL-2 / ADR-010.
    expect(reasons).toContain('crypto_deferred');
    for (const reason of reasons) {
      expect(reason).not.toContain('missing_target');
      expect(reason).not.toContain('target_assertion');
    }
  });
});
