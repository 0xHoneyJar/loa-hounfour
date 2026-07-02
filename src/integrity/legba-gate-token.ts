/**
 * `GateTokenSchema` — the ed25519-signed key between Legba gates
 * (Legba ladder cycle 1; loa-freeside PRD G-1, SDD §3.2).
 *
 * Spans propose, gates validate, tokens carry custody. A span with index
 * > 0 MUST refuse to open without a cryptographically valid token from
 * gate index-1 of the same run (LG-3, the turnstile). Tokens chain via
 * `prev_token_hash`; the run receipt is the hash of the token-hash
 * sequence.
 *
 * **Turnstile predicate (split form — serial path must work)**: across
 * segments, `gate_index == next_span_index - 1` with `wave_number` 0;
 * within a DAG fan-out segment, wave advancement is
 * `wave_number > prior.wave_number` at the same `gate_index` (LG-9 —
 * tokens are wave-level under Kahn-wave parallel fan-out, issued when a
 * whole wave drains, never per-item). Only `verdict: "pass"` opens a
 * span; a fail-token is TERMINAL (receipt closes `blocked_at_gate_N`) —
 * provable refusal beats a silent halt.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/GateToken.constraints.json`):
 *   - `gatekeeper_key_id` = sha256(gatekeeper_id || ':' || key_version)
 *     (LT-1, LOCAL `signer_key_id_matches_derivation` pattern reuse).
 *   - `replay_seed` = sha256(span_log_head || gatekeeper signature over
 *     span_log_head) (LT-2, runtime-deferred) — unpredictable to the
 *     worker, reproducible by any verifier holding the token.
 *   - `prev_token_hash` chain validity; genesis anchor at gate 0
 *     (LT-3, library; LG-3b).
 *   - Ed25519 `signature` over the RFC 8785 canonical JSON of
 *     all-other-fields (LT-4, runtime-deferred; consumer-side
 *     verification per hounfour NF-1 posture).
 *
 * @since Legba cycle 1
 */
import { Type, type Static } from '@sinclair/typebox';
import { ED25519_SIGNATURE_PATTERN } from '../governance/signature-envelope.js';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN, SHA256_HEX_BARE_PATTERN } from './sha256-pattern.js';

export const GateTokenSchema = Type.Object(
  {
    token_kind: Type.Literal('legba_gate_token', {
      description: 'Discriminator literal pinning the GateToken shape.',
    }),
    contract_version: Type.Literal('8.8.0', {
      description:
        'Hounfour contract version. Pinned for the Legba cycle-1 ship ' +
        'line; the merge train assigns the final literal.',
    }),
    run_id: Type.String({
      minLength: 1,
      description:
        'Composition run identifier. Forged/replayed-token defense binds ' +
        'signature verification to run_id + gate_index + wave_number.',
    }),
    gate_index: Type.Integer({
      minimum: 0,
      description: 'Zero-based gate position (gate N closes span N).',
    }),
    wave_number: Type.Integer({
      minimum: 0,
      description:
        'Wave ordinal within a DAG fan-out segment (LG-9). Serial ' +
        'execution uses 0. A token is issued only when its whole wave ' +
        'has drained.',
    }),
    prev_token_hash: Type.String({
      pattern: SHA256_HEX_PATTERN,
      description:
        'sha256:<64-hex> of the previous token\'s canonical form; gate 0 ' +
        'anchors the chain with the genesis literal (LG-3b — the run ' +
        'receipt binds the anchor so verifiers agree on the first link).',
    }),
    span_log_head: Type.String({
      pattern: SHA256_HEX_BARE_PATTERN,
      description:
        'The closed span\'s final record_hash. The gate replays the span ' +
        'chain and MUST recompute this head (check `chain`).',
    }),
    span_move_count: Type.Integer({
      minimum: 0,
      description: 'Move count of the closed span (cheap census check).',
    }),
    artifact_hashes: Type.Array(
      Type.String({ pattern: SHA256_HEX_PATTERN }),
      {
        description:
          'Content-addressed ids of the claimed handover objects ' +
          '(handoff envelope ids). Phantom artifacts fail check ' +
          '`cas_complete`.',
      },
    ),
    verdict: Type.Union([Type.Literal('pass'), Type.Literal('fail')], {
      description:
        'Gate verdict. Only `pass` opens the next span; `fail` is ' +
        'terminal and provable (the refusal enters the chain and the ' +
        'receipt closes blocked_at_gate_N).',
    }),
    checks: Type.Object(
      {
        chain: Type.Boolean(),
        cas_complete: Type.Boolean(),
        replay_sample: Type.Union(
          [Type.Literal('pass'), Type.Literal('fail'), Type.Literal('degraded')],
          {
            description:
              '`degraded` = ≥3 environment-divergence downgrades drawn in ' +
              'one gate (loud, audited; visible to turnstile + receipt).',
          },
        ),
        artifact_shape: Type.Boolean(),
      },
      {
        additionalProperties: false,
        description: 'Named results of the four deterministic gate checks.',
      },
    ),
    replay_seed: Type.String({
      pattern: SHA256_HEX_BARE_PATTERN,
      description:
        'sha256(span_log_head || gatekeeper_sig(span_log_head)) — the ' +
        'worker cannot predict the sample (it cannot compute the ' +
        'gatekeeper\'s signature); any verifier reproduces it from the ' +
        'token (LT-2). Kept explicit for audit readability.',
    }),
    gatekeeper_key_id: Type.String({
      pattern: SHA256_HEX_BARE_PATTERN,
      description:
        'Derived sha256 hex (bare form) of `gatekeeper_id || ":" || ' +
        'key_version` — the hounfour signer-key-id derivation, verified ' +
        'by the LOCAL builtin (LT-1). Keys resolve through the loa ' +
        'trust-store, never bare manifest publication.',
    }),
    key_version: Type.Integer({
      minimum: 1,
      description:
        'Gatekeeper key version (1-indexed). Mid-run rotation creates a ' +
        'named activation boundary; the receipt binds the key set.',
    }),
    ts: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description: 'ISO 8601 UTC token issuance time (Z suffix).',
    }),
    signature: Type.String({
      pattern: ED25519_SIGNATURE_PATTERN,
      description:
        'Ed25519 signature (unpadded base64url, 86 chars after the ' +
        '"ed25519:" prefix) over the RFC 8785 canonical JSON of ' +
        'all-other-fields. Hounfour does NOT verify; consumer-side ' +
        'verification per NF-1.',
    }),
  },
  {
    $id: 'GateToken',
    additionalProperties: false,
    'x-cross-field-validated': true,
    'x-crypto-bearing': true,
    'x-chain-bearing': true,
    'x-canonical-size-cap-bytes': 4096,
    description:
      'Ed25519-signed Legba gate token — the key between gates. ' +
      'Crypto-bearing + chain-bearing (prev_token_hash) + ' +
      'canonical-size-capped. Cycle-1 transport: embedded at the handoff ' +
      'envelope\'s `verdict.gate_token` (schema-legal — the envelope ' +
      'verdict object is construct-shaped); first-class envelope field ' +
      'at construct-handoff v1.2 in the turnstile rung.',
  },
);

export type GateToken = Static<typeof GateTokenSchema>;
