/**
 * `RevocationListSchema` — revoked signing key list (FR-G4, v8.7.0).
 *
 * The single shape for revoked-signing-key lists. Cluster verifiers
 * MUST consult this list before accepting any envelope signed under
 * a listed key. The list itself is signed and chained to prevent
 * quiet replacement.
 *
 * **Crypto-bearing AND chain-bearing**: full FR-A5 (ed25519 pattern
 * alignment) + FR-C1 (`nonce_unique_per_signer_window`) + FR-C2
 * (`sequence_monotonic_per_cluster`) + FR-C3 (`chain_validator_prev_hash`)
 * discipline applies. Default validation mode is shape-only (manifest
 * emits the `*_CONTEXT_DEFERRED` reasons per RL-2/3/4/6); fail-closed
 * is opt-in via `validate(..., { failClosed: true })` per cycle-005
 * FR-A4. Default-flip is v9.0.0 work.
 *
 * **Signed-payload boundary**: the `signature` field signs the
 * JCS-canonical-form bytes of the envelope payload with the
 * `signature` AND `quorum_signatures` fields OMITTED. Each entry in
 * `quorum_signatures[]` (when non-null) signs the SAME bytes as
 * `signature` does. See `docs/revocation-list-protocol.md` for the
 * step-by-step signing/verification procedure (consumer-implementer
 * guide; non-normative shape supplement).
 *
 * **Signer-compromise recovery (two layers)**:
 *
 * Layer 1 — Quorum signatures (consumer-policy m-of-n): when
 * `quorum_signatures` is non-null, cluster verifiers MUST validate
 * ≥ m-of-n signatures against the canonical-form payload before
 * trusting the list. Single-signer mode (`quorum_signatures: null`)
 * remains valid for clusters that don't need quorum; multi-signer
 * is opt-in. Hounfour ships the shape; `m` and `n` are consumer-
 * policy values.
 *
 * Layer 2 — Root-of-trust binding: when `root_of_trust_id` is
 * non-null, consumer policy specifies a root-of-trust registry that
 * authorizes successor lists. Recovery procedure (consumer-side per
 * ADR-010): operators present compromise evidence; root-of-trust
 * authority publishes a successor list with the compromised
 * `signer_key_id` in `revoked_keys[]` and `prev_envelope_hash`
 * referencing the LAST-KNOWN-GOOD list (NOT the malicious one).
 * Fork reconciliation across divergent chains is consumer policy;
 * fully-shaped fork-reconciliation envelopes are deferred to v8.8.0
 * (BL-6).
 *
 * **Schema-level invariants** (constraint file
 * `constraints/RevocationList.constraints.json` — RL-1..RL-12, with
 * RL-8 as an explicit non-constraint to prevent finding-rotation):
 *   - RL-1: `revoked_keys[*].key_id` distinct (LOCAL).
 *   - RL-2: `nonce` monotonic per `cluster_id` (consumer-state).
 *   - RL-3: `prev_envelope_hash` chain integrity (consumer-state).
 *   - RL-4: `signer_key_id` derives `signature` (consumer-state).
 *   - RL-5: `signer_key_id` NOT in `revoked_keys[*].key_id` (LOCAL;
 *     self-revocation lock).
 *   - RL-6: `nonce` unique per signer window (consumer-state).
 *   - RL-7: `revoked_keys[*].revoked_at ≤ issued_at` (LOCAL).
 *   - RL-8: NON-CONSTRAINT — empty `revoked_keys` admissible at
 *     non-genesis envelopes (no new revocations since predecessor).
 *   - RL-9: `valid_from ≤ valid_until` when both non-null (LOCAL).
 *   - RL-10: `valid_from ≤ issued_at` (LOCAL).
 *   - RL-11: `next_page_hash` chain integrity (consumer-state).
 *   - RL-12: when `quorum_signatures` non-null, `signer_key_id` is
 *     one of them; entries distinct (LOCAL).
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.4
 * @see ADR-010 — class-vs-policy boundary.
 * @since v8.7.0 — FR-G4.
 */
import { type Static } from '@sinclair/typebox';
/**
 * @internal
 * Stub placeholder — replaced with full schema body in PR-A4.4.
 * Validating any payload against this returns `false`.
 */
export declare const RevocationListSchema: import("@sinclair/typebox").TNever;
export type RevocationList = Static<typeof RevocationListSchema>;
//# sourceMappingURL=revocation-list.d.ts.map