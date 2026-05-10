/**
 * `SubscriptionPoolStateSchema` — pool-state snapshot for shared-
 * capacity audits (FR-G3, v8.7.0).
 *
 * Pool-state snapshots for consumers that pool capacity (e.g. shared
 * API budget across EPICs in a series). Pool-capacity audits become
 * deterministic across consumers via this shape rather than per-
 * consumer ad-hoc representations.
 *
 * **Crypto-bearing, NOT chain-bearing**: carries `signer_cluster_id` +
 * `signature` (ed25519 pattern); consumers chain via the
 * `pause_resume_pair_id` idempotency marker rather than a
 * `prev_envelope_hash` chain. Default validation mode is shape-only
 * (manifest emits `SUBSCRIPTION_POOL_STATE_SIGNATURE_VERIFICATION_CONTEXT_DEFERRED`)
 * unless the consumer opts in via `validate(..., { failClosed: true })`
 * per cycle-005 FR-A4. Default-flip to fail-closed is v9.0.0 work.
 *
 * **Financial values**: `accounts[*].allocated_units` and
 * `consumed_units` are string-encoded micro-USD per `^[0-9]+$` per
 * CLAUDE.md financial-value convention. No floating point — bigint-
 * safe comparison via LOCAL helper `string_micro_usd_le`.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/SubscriptionPoolState.constraints.json` —
 * SPS-1..SPS-4):
 *   - SPS-1: `accounts[*].consumed_units ≤ accounts[*].allocated_units`
 *     (LOCAL `string_micro_usd_le`; bigint-safe).
 *   - SPS-2: `accounts[*].account_id` distinct (LOCAL
 *     `array_field_distinct`).
 *   - SPS-3: `signature` matches `signer_cluster_id` derivation
 *     (consumer-state; v8.5.0 `signer_key_id_matches_derivation`).
 *   - SPS-4: `accounts[*].stable_until ≥ ts` (LOCAL `iso8601_ge_field`
 *     with JCS-canonical-form precondition per SDD §2.0.1).
 *
 * **Carry-forward**: this schema was scheduled for v8.7.0 in
 * cycle-005's forward plan as FR-E3. User-confirmed inclusion in
 * cycle-007 scope on 2026-05-10.
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.3
 * @see ADR-010 — class-vs-policy boundary.
 * @since v8.7.0 — FR-G3.
 */
import { type Static } from '@sinclair/typebox';
/**
 * @internal
 * Stub placeholder — replaced with full schema body in PR-A4.3.
 * Validating any payload against this returns `false`.
 */
export declare const SubscriptionPoolStateSchema: import("@sinclair/typebox").TNever;
export type SubscriptionPoolState = Static<typeof SubscriptionPoolStateSchema>;
//# sourceMappingURL=subscription-pool-state.d.ts.map