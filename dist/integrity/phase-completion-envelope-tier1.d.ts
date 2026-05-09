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
import { type Static } from '@sinclair/typebox';
export declare const PhaseCompletionEnvelopeTier1Schema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"phase_completion_tier1">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    agent_id: import("@sinclair/typebox").TString;
    agent_signature: import("@sinclair/typebox").TString;
    agent_key_pubkey: import("@sinclair/typebox").TString;
    payload: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
    nonce: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
}>;
export type PhaseCompletionEnvelopeTier1 = Static<typeof PhaseCompletionEnvelopeTier1Schema>;
//# sourceMappingURL=phase-completion-envelope-tier1.d.ts.map