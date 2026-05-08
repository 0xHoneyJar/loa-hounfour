/**
 * `PhaseCompletionEnvelopeTier1Schema` — agent-emission envelope
 * (FR-B2, v8.6.0).
 *
 * Two-tier envelope shape: Tier-1 is the agent's signed emission;
 * Tier-2 (`PhaseCompletionEnvelopeSchema`) is the cluster-wrapped
 * ingestion that carries Tier-1 inside `ingested_emission`. Each tier
 * carries its own `additionalProperties: false` so the wire shape is
 * strict at every layer.
 *
 * **Strict-additive contract**: `payload` is `Type.Record(string,
 * unknown)` because consumer policy dictates the per-phase shape
 * (gate outcomes, attestations, etc.); hounfour does not freeze the
 * payload sub-shape (per ADR-010 — class-vs-policy boundary).
 *
 * **Crypto-bearing**: validates with `'x-crypto-bearing': true` so the
 * default `validate()` call returns `{ valid: false, errors:
 * ['CRYPTO_DEFERRED'] }`. Consumers MUST opt in via
 * `{ acceptDeferred: true }` to acknowledge that hounfour does NOT
 * verify `agent_signature`; downstream consumer-side verification is
 * required (see existing `SignatureEnvelope` precedent).
 *
 * @see SDD §3.4 — FR-B2 schema spec
 * @see PRD FR-B2 — PhaseCompletionEnvelope requirements
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
import { Type, type Static } from '@sinclair/typebox';
import { ED25519_SIGNATURE_PATTERN, ED25519_PUBKEY_PATTERN } from '../governance/signature-envelope.js';
import { BASE64URL_NONCE_PATTERN } from '../governance/nonce-pattern.js';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';

export const PhaseCompletionEnvelopeTier1Schema = Type.Object(
  {
    envelope_kind: Type.Literal('phase_completion_tier1', {
      description:
        'Discriminator literal pinning the Tier-1 shape. The Tier-2 ' +
        'wrapper uses the literal "phase_completion".',
    }),
    contract_version: Type.Literal('8.6.0', {
      description:
        'Hounfour contract version this envelope was authored against. ' +
        'Pinned to "8.6.0" for the cycle-005 ship line.',
    }),
    agent_id: Type.String({
      minLength: 1,
      description:
        'Stable agent identifier (consumer-shaped — hounfour does not ' +
        'freeze the namespace).',
    }),
    agent_signature: Type.String({
      pattern: ED25519_SIGNATURE_PATTERN,
      description:
        'Ed25519 signature value (unpadded base64url, 86 chars after ' +
        'the "ed25519:" prefix) over the RFC 8785 canonical-JSON of ' +
        'all-other-fields. Hounfour does NOT verify; consumer-side ' +
        'verification is required per NF-1.',
    }),
    agent_key_pubkey: Type.String({
      pattern: ED25519_PUBKEY_PATTERN,
      description:
        'Ed25519 public key identifier of the signer (32-byte key → ' +
        '43 unpadded base64url chars per RFC 4648 §5).',
    }),
    payload: Type.Record(Type.String(), Type.Unknown(), {
      description:
        'Consumer-shaped payload (phase outcomes, gate decisions, ' +
        'attestations). Hounfour does NOT freeze the sub-shape per ' +
        'ADR-010 — class-vs-policy boundary.',
    }),
    nonce: Type.String({
      pattern: BASE64URL_NONCE_PATTERN,
      description:
        '128-bit nonce as 22-char unpadded base64url. Used by the FR-C1 ' +
        'replay-detection builtin (`nonce_unique_per_signer_window`) ' +
        'with a 5-minute sliding window per signer.',
    }),
    sequence: Type.String({
      pattern: '^[0-9]+$',
      description:
        'String-encoded ≥0 integer (CT-03; consumer parses to BigInt ' +
        'post-validation). Monotonically increasing per (signer, ' +
        'key_version) tuple per FR-C2.',
    }),
    timestamp: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at agent emission (Z suffix; non-UTC ' +
        'offsets NOT accepted per cross-runner serialization variance).',
    }),
  },
  {
    $id: 'PhaseCompletionEnvelopeTier1',
    additionalProperties: false,
    'x-crypto-bearing': true,
    description:
      'Agent-emission Tier-1 phase-completion envelope. Wrapped by ' +
      'Tier-2 PhaseCompletionEnvelopeSchema for cluster ingestion. ' +
      'Crypto-bearing: validate() requires { acceptDeferred: true } ' +
      'to receive shape-only valid:true.',
  },
);

export type PhaseCompletionEnvelopeTier1 = Static<
  typeof PhaseCompletionEnvelopeTier1Schema
>;
