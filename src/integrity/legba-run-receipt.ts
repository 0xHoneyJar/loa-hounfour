/**
 * `RunReceiptSchema` — a Legba run compiled to one verifiable hash
 * (Legba ladder cycle 1; loa-freeside PRD G-1, SDD §3.3).
 *
 * "Compiled down and verifiable": a multi-hour, thousand-token,
 * irreproducible agentic run reduces to a chain of gate-token hashes and
 * one receipt hash a third party can verify with public keys alone —
 * the strongest verifiability available over nondeterministic workers.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/RunReceipt.constraints.json`):
 *   - `receipt_hash` = sha256 of the RFC 8785 canonical JSON of
 *     `{genesis_anchor, token_hash_sequence, key_set, status}` — the
 *     receipt hash COVERS the key set, binding signer identity; a
 *     mutated key_set breaks the receipt (LR-1, library).
 *   - `genesis_anchor` is the pinned literal — no implementation-
 *     divergent chain roots (LR-2, library; LG-3b).
 *   - `token_hash_sequence` is ordered by (gate_index, wave_number)
 *     (LR-3, library).
 *   - External anchoring: at run close the receipt_hash is emitted into
 *     the loa audit chain via audit_emit — retroactive forgery must
 *     rewrite the independent hash-chained, signed audit log too
 *     (LR-4, runtime-deferred; consumer policy).
 *
 * @since Legba cycle 1
 */
import { Type, type Static } from '@sinclair/typebox';
import { SHA256_HEX_PATTERN, SHA256_HEX_BARE_PATTERN } from './sha256-pattern.js';

export const RunReceiptSchema = Type.Object(
  {
    receipt_kind: Type.Literal('legba_run_receipt', {
      description: 'Discriminator literal pinning the RunReceipt shape.',
    }),
    contract_version: Type.Literal('8.8.0', {
      description:
        'Hounfour contract version. Pinned for the Legba cycle-1 ship ' +
        'line; the merge train assigns the final literal.',
    }),
    run_id: Type.String({
      minLength: 1,
      description: 'Composition run identifier the receipt closes.',
    }),
    genesis_anchor: Type.Literal(
      'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      {
        description:
          'Pinned chain-root literal (the PCE genesis convention). ' +
          'Vectors cover it; implementations cannot diverge on the ' +
          'first link (LG-3b).',
      },
    ),
    token_hash_sequence: Type.Array(
      Type.String({ pattern: SHA256_HEX_PATTERN }),
      {
        minItems: 1,
        description:
          'Ordered token hashes — (gate_index, wave_number) order ' +
          '(LR-3). The full chain, retained for auditability.',
      },
    ),
    key_set: Type.Array(
      Type.Object(
        {
          gatekeeper_key_id: Type.String({ pattern: SHA256_HEX_BARE_PATTERN }),
          key_version: Type.Integer({ minimum: 1 }),
          pubkey: Type.String({
            minLength: 1,
            description:
              'Ed25519 public key (consumer-shaped encoding). MUST match ' +
              'the trust-store-resolved key for the key_id — bare ' +
              'manifest publication is NOT trusted (anti-substitution).',
          }),
        },
        { additionalProperties: false },
      ),
      {
        minItems: 1,
        description:
          'The signing keys this run\'s tokens used. Receipt-bound ' +
          '(covered by receipt_hash): rotation mid-run appends an entry ' +
          'and creates a named activation boundary — tokens signed by a ' +
          'revoked version after the boundary fail verification.',
      },
    ),
    status: Type.Union(
      [
        Type.Literal('passed'),
        Type.String({ pattern: '^blocked_at_gate_[0-9]+$' }),
      ],
      {
        description:
          'Terminal run status. A fail-token terminates the run as ' +
          'blocked_at_gate_N — provable refusal, not silent halt.',
      },
    ),
    receipt_hash: Type.String({
      pattern: SHA256_HEX_BARE_PATTERN,
      description:
        'sha256 (bare hex) of the RFC 8785 canonical JSON of ' +
        '{genesis_anchor, token_hash_sequence, key_set, status} (LR-1). ' +
        'Anchored into the loa audit chain at run close (LR-4).',
    }),
  },
  {
    $id: 'RunReceipt',
    additionalProperties: false,
    'x-cross-field-validated': true,
    'x-chain-bearing': true,
    description:
      'Legba run receipt — the token-hash chain + receipt-bound key set ' +
      'compiled to one verifiable hash. Chain-bearing; not itself ' +
      'crypto-bearing (the tokens it sequences carry the signatures; ' +
      'external anchoring into the loa audit chain provides the ' +
      'tamper-evidence for the receipt itself).',
  },
);

export type RunReceipt = Static<typeof RunReceiptSchema>;
