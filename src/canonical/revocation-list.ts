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
 * at least m-of-n signatures against the canonical-form payload
 * before trusting the list. Single-signer mode (`quorum_signatures:
 * null`) remains valid for clusters that don't need quorum; multi-
 * signer is opt-in. Hounfour ships the shape; `m` and `n` are
 * consumer-policy values surfaced via the protocol doc.
 *
 * Layer 2 — Root-of-trust binding: when `root_of_trust_id` is
 * non-null, consumer policy specifies a root-of-trust registry that
 * authorizes successor lists. Recovery procedure (consumer-side per
 * ADR-010): operators present compromise evidence; root-of-trust
 * authority publishes a successor list with the compromised
 * `signer_key_id` in `revoked_keys[]` and `prev_envelope_hash`
 * referencing the LAST-KNOWN-GOOD list. Fork reconciliation across
 * divergent chains is consumer policy; fully-shaped fork-
 * reconciliation envelopes are deferred to v8.8.0 (BL-6).
 *
 * **Schema-level invariants** (constraint file
 * `constraints/RevocationList.constraints.json` — RL-1..RL-12, with
 * RL-8 as an explicit non-constraint to prevent finding-rotation
 * per the PR-A3.8 lesson):
 *   - RL-1: `revoked_keys[*].key_id` distinct (LOCAL
 *     `array_field_distinct`; fourth use site after CRS-4, ISSA-2,
 *     SPS-2).
 *   - RL-2: `nonce` monotonic per `cluster_id` (consumer-state;
 *     manifest `REVOCATION_LIST_NONCE_MONOTONICITY_CONTEXT_DEFERRED`).
 *   - RL-3: `prev_envelope_hash` chain integrity (consumer-state;
 *     manifest `REVOCATION_LIST_CHAIN_CONTEXT_DEFERRED`).
 *   - RL-4: `signer_key_id` derives `signature` (consumer-state;
 *     manifest `REVOCATION_LIST_SIGNER_DERIVATION_CONTEXT_DEFERRED`).
 *   - RL-5: `signer_key_id` NOT in `revoked_keys[*].key_id` (LOCAL
 *     `field_not_in_array_field`; self-revocation lock per the
 *     anti-finding-rotation pre-emptive lock).
 *   - RL-6: `nonce` unique per signer window (consumer-state;
 *     manifest `REVOCATION_LIST_NONCE_WINDOW_CONTEXT_DEFERRED`).
 *   - RL-7: `revoked_keys[*].revoked_at` at-or-before `issued_at`
 *     (LOCAL `iso8601_ge_field` reused from PR-A4.3).
 *   - RL-8: NON-CONSTRAINT — empty `revoked_keys` admissible at
 *     non-genesis envelopes (no new revocations since predecessor).
 *     Explicit non-constraint documentation prevents bridge from
 *     surfacing this as a defect per the PR-A3.8 lesson.
 *   - RL-9: `valid_from` at-or-before `valid_until` when both
 *     non-null (LOCAL `iso8601_ge_field`).
 *   - RL-10: `valid_from` at-or-before `issued_at` (LOCAL
 *     `iso8601_ge_field`).
 *   - RL-11: `next_page_hash` chain integrity (consumer-state;
 *     manifest `REVOCATION_LIST_PAGINATION_CONTEXT_DEFERRED`).
 *   - RL-12: when `quorum_signatures` non-null,
 *     `quorum_signatures[*].signer_key_id` distinct AND
 *     `signer_key_id` is one of them (LOCAL `array_field_distinct`
 *     + NEW LOCAL `field_in_array_field`).
 *
 * **Anti-finding-rotation pre-emptive locks** (per PR-A3.8 lesson):
 * RL-8 documented non-constraint; RL-5 self-revocation lock;
 * `revoked_keys` maxItems 4096 (DoS guard); `quorum_signatures`
 * maxItems 32 (DoS guard); `revocation_evidence_hash` optional
 * (consumer policy decides); `valid_until: null` admissible (open-
 * ended validity); `next_page_hash: null` admissible (last page in
 * chain); `root_of_trust_id` optional with bootstrap pattern
 * documented in the protocol doc.
 *
 * **`$id` convention** (mirrors CanonicalRun / PhaseKind /
 * ClusterRunSeries / InterSeriesScopingArtifact /
 * SubscriptionPoolState precedent): the TypeBox-internal `$id`
 * values declared in this file (`'RevocationList'`,
 * `'RevocationReason'`, `'RevocationListEntry'`,
 * `'QuorumSignatureEntry'`) are short tokens used by the TypeBox
 * type system for self-reference within the runtime. They are
 * **overridden at JSON Schema generation time** by
 * `scripts/generate-schemas.ts` (line ~607) to the canonical
 * versioned URI form. Standalone JSON Schema consumers only ever
 * see the URI form. The nested-`$id` values on sub-schemas are
 * stripped by `scripts/schema-postprocess.ts#stripNestedIds`.
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.4
 * @see ADR-010 — class-vs-policy boundary (consumer-side
 *      signature/chain verification; hounfour ships shape + manifest
 *      reason codes).
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import {
  ED25519_SIGNATURE_PATTERN,
  ED25519_PUBKEY_PATTERN,
} from '../governance/signature-envelope.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
import { arrayFieldDistinct } from '../constraints/builtins/cluster-run-series-local.js';
import { iso8601GeField } from '../constraints/builtins/subscription-pool-state-local.js';
import {
  fieldNotInArrayField,
  fieldInArrayField,
} from '../constraints/builtins/revocation-list-local.js';

// ed25519 key-id pattern (iter-1 MEDIUM mitigation, three-model
// consensus): public keys and signatures are **DIFFERENT** byte
// shapes. An Ed25519 public key is 32 bytes (43 unpadded base64url
// chars with `ed25519-pub:` prefix per `ED25519_PUBKEY_PATTERN`);
// an Ed25519 signature is 64 bytes (86 unpadded base64url chars
// with `ed25519:` prefix per `ED25519_SIGNATURE_PATTERN`). The
// cycle-005 SDD §3.6 carry-forward aliased these incorrectly with
// a "same byte-shape per FR-A5 alignment" comment — that claim was
// wrong. The v8.6.0 precedent (PhaseCompletionEnvelopeTier1.agent_key_pubkey)
// correctly uses ED25519_PUBKEY_PATTERN for public key identifiers.
// PR-A4.4 iter-1 corrects to the v8.6.0 precedent.

/**
 * `RevocationReasonSchema` — locked 5-member revocation classifier.
 *
 * Promotion to a discriminated union — e.g. `compromise` carries
 * severity, `governance_action` carries proposal_id — is deferred to
 * v8.8.0+ pending consumer-corpus signal. v8.7.0 ships the union of
 * literals.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export const RevocationReasonSchema = Type.Union(
  [
    Type.Literal('compromise'),
    Type.Literal('rotation'),
    Type.Literal('governance_action'),
    Type.Literal('timeout'),
    Type.Literal('manual'),
  ],
  {
    $id: 'RevocationReason',
    description:
      'Locked 5-member revocation classifier. Promotion to a ' +
      'discriminated union carrying per-reason metadata is deferred ' +
      'to v8.8.0+ pending consumer-corpus signal.',
  },
);
export type RevocationReason = Static<typeof RevocationReasonSchema>;

/**
 * `QuorumSignatureEntrySchema` — one entry in
 * `RevocationListSchema.quorum_signatures`. Each entry signs the
 * SAME bytes as the primary `signature` field (per the signed-
 * payload boundary documented in the file-level JSDoc).
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export const QuorumSignatureEntrySchema = Type.Object(
  {
    signer_key_id: Type.String({
      pattern: ED25519_PUBKEY_PATTERN,
      description:
        'ed25519 public-key identifier of this quorum signer. ' +
        'Same byte-shape as the primary signer_key_id per FR-A5.',
    }),
    signature: Type.String({
      pattern: ED25519_SIGNATURE_PATTERN,
      description:
        'ed25519 signature over the JCS-canonical-form payload with ' +
        '`signature` and `quorum_signatures` fields omitted. ' +
        'Verification is consumer-side per ADR-010.',
    }),
  },
  {
    $id: 'QuorumSignatureEntry',
    additionalProperties: false,
    description:
      'One per-signer entry in the optional quorum-of-signatures ' +
      'array. RL-12 cross-field invariant requires the primary ' +
      'signer_key_id to also appear here when the array is non-null.',
  },
);
export type QuorumSignatureEntry = Static<typeof QuorumSignatureEntrySchema>;

/**
 * `RevocationListEntrySchema` — one per-key entry in
 * `RevocationListSchema.revoked_keys`. Hoisted so cross-runner
 * conformance suites can validate per-element shape independently
 * of the parent envelope.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export const RevocationListEntrySchema = Type.Object(
  {
    key_id: Type.String({
      pattern: ED25519_PUBKEY_PATTERN,
      description:
        'ed25519 public-key identifier being revoked. Same byte-' +
        'shape as SignatureEnvelope.signature_value per FR-A5 ' +
        'alignment. Per-list distinctness is RL-1; the revoking ' +
        'envelope MUST NOT include its own signer_key_id (RL-5).',
    }),
    reason: RevocationReasonSchema,
    revoked_at: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at which the key was revoked. RL-7 ' +
        'enforces revoked_at at-or-before issued_at via the LOCAL ' +
        'iso8601_ge_field helper with the fixed-fractional-precision ' +
        'precondition from PR-A4.3 iter-1.',
    }),
    revocation_evidence_hash: Type.Union(
      [Type.String({ pattern: SHA256_HEX_PATTERN }), Type.Null()],
      {
        description:
          'Optional SHA-256 of consumer-policy evidence document — ' +
          'compromise notice, rotation manifest, governance ' +
          'proposal, etc. Null when no evidence is required by ' +
          'consumer policy. Resolution to the evidence body is ' +
          'consumer-state per ADR-010.',
      },
    ),
  },
  {
    $id: 'RevocationListEntry',
    additionalProperties: false,
    description:
      'One per-key entry within a RevocationList. Cross-element ' +
      'invariants — key_id distinctness per RL-1 and revoked_at ' +
      'at-or-before issued_at per RL-7 — live in the cross-field tier.',
  },
);
export type RevocationListEntry = Static<typeof RevocationListEntrySchema>;

export const RevocationListSchema = Type.Object(
  {
    envelope_kind: Type.Literal('revocation_list', {
      description: 'Discriminator pinning this envelope shape.',
    }),
    contract_version: Type.Literal('8.7.0', {
      description:
        'Hounfour contract version. Pinned to "8.7.0" for the cycle-007 ship line.',
    }),
    cluster_id: Type.String({
      minLength: 1,
      description: 'Consumer-shaped cluster identifier.',
    }),
    list_id: Type.String({
      minLength: 1,
      description:
        'Stable opaque list identifier. Consumer-shaped namespace; ' +
        'hounfour does not freeze the registry.',
    }),
    issued_at: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at which this list was issued. ' +
        'RL-7 and RL-10 use this as the upper bound for per-element ' +
        'revoked_at and the envelope valid_from respectively.',
    }),
    valid_from: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'List takes effect at this time. RL-10 enforces ' +
        'valid_from at-or-before issued_at (the list cannot take ' +
        'effect before it is issued).',
    }),
    valid_until: Type.Union(
      [Type.String({ pattern: ISO8601_UTC_PATTERN }), Type.Null()],
      {
        description:
          'Optional expiry. Null means "until superseded by next ' +
          'nonce" — admissible per the anti-finding-rotation ' +
          'lock. RL-9 enforces valid_from at-or-before valid_until ' +
          'when both non-null.',
      },
    ),
    max_staleness_seconds: Type.Union(
      [Type.Integer({ minimum: 1, maximum: 31_536_000 }), Type.Null()],
      {
        description:
          'Verifier freshness policy hint, in seconds (1 second to ' +
          '1 year inclusive). Consumer-side enforcement per ADR-010. ' +
          'Null means consumer-policy default applies; hounfour does ' +
          'not freeze the default.',
      },
    ),
    nonce: Type.Integer({
      minimum: 0,
      maximum: 9_007_199_254_740_991,
      description:
        'Monotonic per cluster_id per the v8.6.0 ' +
        'sequence_monotonic_per_cluster builtin (RL-2; consumer-' +
        'state per ADR-010). Upper bound is Number.MAX_SAFE_INTEGER ' +
        'to keep the integer arithmetic bigint-safe at the JSON ' +
        'boundary.',
    }),
    prev_envelope_hash: Type.Union(
      [Type.String({ pattern: SHA256_HEX_PATTERN }), Type.Null()],
      {
        description:
          'Chain-prev hash; null only for the genesis envelope (the ' +
          'first list in a chain). RL-3 (consumer-state) verifies ' +
          'the chain via the v8.6.0 chain_validator_prev_hash builtin.',
      },
    ),
    next_page_hash: Type.Union(
      [Type.String({ pattern: SHA256_HEX_PATTERN }), Type.Null()],
      {
        description:
          'Pagination forward-link. Null means "this is the last ' +
          'page in the chain at issued_at time" — admissible per the ' +
          'anti-finding-rotation lock. RL-11 (consumer-state) ' +
          'verifies cluster_id continuity across pages.',
      },
    ),
    revoked_keys: Type.Array(RevocationListEntrySchema, {
      minItems: 0,
      maxItems: 4096,
      description:
        'Per-key revocation entries. minItems 0 is admissible ' +
        '(genesis envelope with no revocations yet OR continuation ' +
        'page with no new revocations since predecessor — RL-8 ' +
        'explicit non-constraint). maxItems 4096 is a DoS guard ' +
        'against unbounded single-list growth.',
    }),
    signer_key_id: Type.String({
      pattern: ED25519_PUBKEY_PATTERN,
      description:
        'ed25519 public-key identifier of the primary signer. RL-4 ' +
        '(consumer-state) verifies derivation against signature; ' +
        'RL-5 (LOCAL) enforces this key MUST NOT appear in ' +
        'revoked_keys[*].key_id (self-revocation lock).',
    }),
    signature: Type.String({
      pattern: ED25519_SIGNATURE_PATTERN,
      description:
        'ed25519 signature over the JCS-canonical-form bytes of the ' +
        'envelope with `signature` and `quorum_signatures` fields ' +
        'omitted. See file-level JSDoc and docs/revocation-list-' +
        'protocol.md for the step-by-step procedure.',
    }),
    quorum_signatures: Type.Union(
      [
        Type.Array(QuorumSignatureEntrySchema, { minItems: 1, maxItems: 32 }),
        Type.Null(),
      ],
      {
        description:
          'Optional quorum-of-signatures over the canonical-form ' +
          'payload. Null means single-signer model (signer_key_id + ' +
          'signature). Non-null means consumer-policy m-of-n quorum ' +
          'verification (consumer-side per ADR-010). RL-12: when ' +
          'non-null, quorum_signatures[*].signer_key_id distinct ' +
          'AND signer_key_id is one of them. **minItems 1 (iter-1 ' +
          'MEDIUM mitigation, three-model consensus)**: an empty ' +
          'quorum array is structurally rejected because RL-12 ' +
          'requires the primary signer to appear in the array, ' +
          'which is impossible for an empty array. Consumers that ' +
          'do not want quorum-signature semantics set the field to ' +
          'null; consumers that opt into quorum include at least ' +
          'the primary signer.',
      },
    ),
    root_of_trust_id: Type.Union(
      [Type.String({ minLength: 1, maxLength: 256 }), Type.Null()],
      {
        description:
          'Optional lazy-link to a consumer-state root-of-trust ' +
          'registry. Null means no root-of-trust binding for this ' +
          'list. When non-null, consumer policy specifies recovery ' +
          'procedure if signer_key_id is compromised (see Layer 2 ' +
          'in the file-level JSDoc). Bootstrap pattern is consumer-' +
          'side per docs/revocation-list-protocol.md.',
      },
    ),
  },
  {
    $id: 'RevocationList',
    additionalProperties: false,
    'x-crypto-bearing': true,
    'x-chain-bearing': true,
    description:
      'Cluster verifiers MUST consult before accepting envelopes ' +
      'signed under any listed key. Crypto-bearing AND chain-' +
      'bearing — full FR-A5 + FR-C1 + FR-C2 + FR-C3 discipline ' +
      'applies. Optional quorum-signature + root-of-trust hooks ' +
      'per the signer-compromise recovery doc. Round-trip parse ' +
      'and re-serialize bit-identical: every well-formed payload ' +
      'satisfies JSON.stringify(JSON.parse(s)) equals s when s is ' +
      'itself the JSON-stringified canonical form.',
  },
);
export type RevocationList = Static<typeof RevocationListSchema>;

/**
 * `validateRevocationList` — pure-function evaluator for the cross-
 * field invariants RL-1 (key_id distinct), RL-5 (signer_key_id NOT
 * in revoked_keys), RL-7 (revoked_at at-or-before issued_at), RL-9
 * (valid_from at-or-before valid_until), RL-10 (valid_from at-or-
 * before issued_at), and RL-12 (quorum-signature consistency).
 *
 * **Source of truth** for the library-evaluable RL-N. Registered
 * into the global cross-field validator registry by
 * `src/validators/index.ts`.
 *
 * **Defensive contract** (mirrors CanonicalRun CR-1 plus
 * ClusterRunSeries plus InterSeriesScopingArtifact plus
 * SubscriptionPoolState precedent): the function MUST NOT throw on
 * malformed input.
 *
 * **NOT enforced here** — these are consumer-state per ADR-010 with
 * manifest reason codes:
 *   - RL-2: `nonce` monotonic per `cluster_id`
 *     (`REVOCATION_LIST_NONCE_MONOTONICITY_CONTEXT_DEFERRED`).
 *   - RL-3: `prev_envelope_hash` chain integrity
 *     (`REVOCATION_LIST_CHAIN_CONTEXT_DEFERRED`).
 *   - RL-4: `signer_key_id` derives `signature`
 *     (`REVOCATION_LIST_SIGNER_DERIVATION_CONTEXT_DEFERRED`).
 *   - RL-6: `nonce` unique per signer window
 *     (`REVOCATION_LIST_NONCE_WINDOW_CONTEXT_DEFERRED`).
 *   - RL-11: `next_page_hash` chain integrity
 *     (`REVOCATION_LIST_PAGINATION_CONTEXT_DEFERRED`).
 *
 * **RL-8 is NOT a constraint** — empty `revoked_keys` is admissible
 * at non-genesis envelopes (continuation page with no new
 * revocations since predecessor). The explicit non-constraint
 * documentation prevents the bridge from surfacing this as a defect
 * via the PR-A3.8 finding-rotation pattern.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input without throwing.
 * @returns `{ valid, errors, warnings }` — errors carries RL-N-
 *   tagged strings naming the offending index/value/field for
 *   actionability.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export function validateRevocationList(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        `RL: structural shape precondition failed — input must be a non-null object (RevocationList record); got ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}.`,
      ],
      warnings: [],
    };
  }

  const issuedAt = (data as { issued_at?: unknown }).issued_at;
  const validFrom = (data as { valid_from?: unknown }).valid_from;
  const validUntil = (data as { valid_until?: unknown }).valid_until;
  const signerKeyId = (data as { signer_key_id?: unknown }).signer_key_id;
  const revokedKeys = (data as { revoked_keys?: unknown }).revoked_keys;
  const quorumSignatures = (data as { quorum_signatures?: unknown })
    .quorum_signatures;

  if (!Array.isArray(revokedKeys)) {
    errors.push(
      'RL: structural shape precondition failed — revoked_keys must be an array; the cross-field validator requires the structural tier (Value.Check) to have passed first.',
    );
    return { valid: false, errors, warnings: [] };
  }

  // RL-1: key_id distinct within the list.
  const distinct = arrayFieldDistinct(revokedKeys, 'key_id');
  if (!distinct.valid) {
    for (const dup of distinct.duplicates) {
      errors.push(
        `RL-1: revoked_keys[*].key_id "${dup.value}" appears at indices ${dup.indices.join(', ')} — key_id MUST be distinct within a single revocation list.`,
      );
    }
  }

  // RL-5: signer_key_id MUST NOT appear in revoked_keys[*].key_id
  // (self-revocation lock — prevents the "key revokes itself" trivial bypass).
  const selfCheck = fieldNotInArrayField(
    signerKeyId,
    revokedKeys,
    'key_id',
  );
  if (!selfCheck.valid) {
    errors.push(
      `RL-5: signer_key_id "${signerKeyId as string}" appears in revoked_keys[${selfCheck.matchedIndex}].key_id — a key cannot revoke itself within the envelope it signs. Use a successor key to revoke the predecessor.`,
    );
  }

  // RL-7: per-element revoked_at at-or-before issued_at.
  for (let i = 0; i < revokedKeys.length; i += 1) {
    const entry = revokedKeys[i];
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(
        `RL: revoked_keys[${i}] is ${entry === null ? 'null' : Array.isArray(entry) ? 'array' : typeof entry}, not an object — cross-field validator requires the structural tier to have rejected this element first.`,
      );
      continue;
    }
    const revokedAt = (entry as { revoked_at?: unknown }).revoked_at;
    // iso8601GeField(later, earlier) — for RL-7 we want
    // revoked_at at-or-before issued_at, i.e. issued_at at-or-after
    // revoked_at. Pass field-name labels (PR-A4.4 iter-1 LOW
    // mitigation) so error messages name RL-7 fields rather than the
    // SPS-4 defaults.
    const rl7 = iso8601GeField(issuedAt, revokedAt, 'issued_at', 'revoked_at');
    if (!rl7.valid) {
      errors.push(`RL-7: revoked_keys[${i}] ${rl7.reason}`);
    }
  }

  // RL-9: valid_from at-or-before valid_until when both non-null.
  if (validUntil !== null && validUntil !== undefined) {
    const rl9 = iso8601GeField(
      validUntil,
      validFrom,
      'valid_until',
      'valid_from',
    );
    if (!rl9.valid) {
      errors.push(`RL-9: ${rl9.reason}`);
    }
  }

  // RL-10: valid_from at-or-before issued_at.
  const rl10 = iso8601GeField(issuedAt, validFrom, 'issued_at', 'valid_from');
  if (!rl10.valid) {
    errors.push(`RL-10: ${rl10.reason}`);
  }

  // RL-12: when quorum_signatures non-null,
  // quorum_signatures[*].signer_key_id distinct AND primary
  // signer_key_id is one of them.
  if (quorumSignatures !== null && quorumSignatures !== undefined) {
    if (!Array.isArray(quorumSignatures)) {
      errors.push(
        `RL: structural shape precondition failed — quorum_signatures must be null OR an array; got ${typeof quorumSignatures}.`,
      );
    } else {
      const quorumDistinct = arrayFieldDistinct(
        quorumSignatures,
        'signer_key_id',
      );
      if (!quorumDistinct.valid) {
        for (const dup of quorumDistinct.duplicates) {
          errors.push(
            `RL-12: quorum_signatures[*].signer_key_id "${dup.value}" appears at indices ${dup.indices.join(', ')} — quorum signers MUST be distinct.`,
          );
        }
      }
      const memberCheck = fieldInArrayField(
        signerKeyId,
        quorumSignatures,
        'signer_key_id',
      );
      if (!memberCheck.valid) {
        errors.push(
          `RL-12: primary signer_key_id "${signerKeyId as string}" is not present in quorum_signatures[*].signer_key_id — when quorum_signatures is non-null, the primary signer MUST also appear in the quorum.`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
