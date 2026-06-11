/**
 * `SpanMoveSchema` — one event in a Legba span's hash-chained move log
 * (Legba ladder cycle 1; loa-freeside PRD G-1, SDD §3.1).
 *
 * A span is the nondeterministic agent work between two gates. Every
 * state mutation appends exactly one chained move record (LG-1); flipping
 * any byte of history changes the span head (LG-2). Moves are either
 * `re_executable` (allowlisted tool calls — input/output content-addressed
 * and replayable from CAS) or `attestable` (model emissions and hash-only
 * tools — provably *said*, never provably *correct*).
 *
 * **Schema-level invariants** (constraint file
 * `constraints/SpanMove.constraints.json`):
 *   - `seq` strictly monotonic per span (LM-1, library).
 *   - `prev_hash` MUST equal the prior move's `record_hash`; the first
 *     move uses the genesis anchor (LM-2, library).
 *   - `record_hash` = sha256 of the RFC 8785 canonical JSON of the record
 *     with the `record_hash` key ABSENT — omitted before canonicalization,
 *     not empty or null (LM-3, library).
 *   - `env_fingerprint` REQUIRED iff `determinism` is `re_executable`
 *     (LM-4, library; LG-4b — environment divergence at replay downgrades
 *     the challenge to attestable, never reports fraud).
 *   - Canonical form ≤ 4096 bytes (LM-5, LOCAL `canonical_size_cap`);
 *     producers MUST refuse loudly at record time (`LEGBA_MOVE_TOO_LARGE`),
 *     never truncate.
 *
 * **Canonical byte composition for `input_hash`/`output_hash`** (one rule,
 * cross-implementation): file inputs hash raw file bytes; structured tool
 * args hash the RFC 8785 canonical JSON bytes of the args object;
 * multi-input moves hash `sha256(JCS(sorted hash list))`.
 *
 * @since Legba cycle 1 (vectors gate the contract_version bump per LG-8)
 */
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN, SHA256_HEX_BARE_PATTERN } from './sha256-pattern.js';

/** Genesis anchor literal shared by span chains and the token chain (LG-3b). */
export const LEGBA_GENESIS_ANCHOR =
  'sha256:0000000000000000000000000000000000000000000000000000000000000000' as const;

export const SpanMoveSchema = Type.Object(
  {
    move_kind: Type.Literal('legba_span_move', {
      description: 'Discriminator literal pinning the SpanMove shape.',
    }),
    contract_version: Type.Literal('8.8.0', {
      description:
        'Hounfour contract version. Pinned for the Legba cycle-1 ship ' +
        'line; the merge train assigns the final literal.',
    }),
    run_id: Type.String({
      minLength: 1,
      description:
        'Composition run identifier (consumer-shaped). Binds the move to ' +
        'one run; tokens and the receipt carry the same id.',
    }),
    span_index: Type.Integer({
      minimum: 0,
      description: 'Zero-based segment index within the run.',
    }),
    seq: Type.Integer({
      minimum: 0,
      description:
        'Strictly monotonic move sequence within the span (LM-1). Gaps ' +
        'and repeats are chain violations.',
    }),
    prev_hash: Type.String({
      pattern: SHA256_HEX_PATTERN,
      description:
        'sha256:<64-hex> of the prior move\'s canonical form; the first ' +
        'move of a span carries the genesis anchor ' +
        '(LEGBA_GENESIS_ANCHOR). LM-2 verifies chain continuity.',
    }),
    kind: Type.Union([Type.Literal('tool'), Type.Literal('emission')], {
      description:
        'Event class: a tool invocation or a model emission (narration, ' +
        'judgment, verdict).',
    }),
    determinism: Type.Union(
      [Type.Literal('re_executable'), Type.Literal('attestable')],
      {
        description:
          'Verification regime (LG-5). `re_executable` REQUIRES the tool ' +
          'to be content-recording allowlisted (replay needs retention); ' +
          'unlisted and nondeterministic tools are `attestable` by ' +
          'construction. Misclassification is the substrate\'s main ' +
          'integrity lie — the determinism manifest lint owns it.',
      },
    ),
    tool: Type.Optional(
      Type.String({
        minLength: 1,
        description: 'Tool name for kind=tool (per the determinism manifest).',
      }),
    ),
    label: Type.Optional(
      Type.String({
        minLength: 1,
        description: 'Emission label for kind=emission.',
      }),
    ),
    input_hash: Type.String({
      pattern: SHA256_HEX_BARE_PATTERN,
      description:
        'Bare 64-hex sha256 over the canonical input bytes (composition ' +
        'rule in the schema header). CAS reference (`x-cas-reference`).',
    }),
    output_hash: Type.String({
      pattern: SHA256_HEX_BARE_PATTERN,
      description:
        'Bare 64-hex sha256 over the canonical output bytes. CAS ' +
        'reference; re-execution divergence on an allowlisted ' +
        're_executable move is a machine-detectable fraud proof (LG-4).',
    }),
    env_fingerprint: Type.Optional(
      Type.String({
        pattern: SHA256_HEX_BARE_PATTERN,
        description:
          'Bare 64-hex sha256 of the tool version + environment manifest ' +
          '(LG-4b). REQUIRED when determinism=re_executable (LM-4); ' +
          'replay under a divergent environment downgrades to attestable ' +
          'for that challenge — never false fraud.',
      }),
    ),
    ts: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC, microsecond precision, Z suffix (no offset form) — ' +
        'format pinned because ts participates in the canonical bytes.',
    }),
    record_hash: Type.String({
      pattern: SHA256_HEX_BARE_PATTERN,
      description:
        'Bare 64-hex sha256 of the RFC 8785 canonical JSON of this record ' +
        'with the record_hash key ABSENT (LM-3). The span head is the ' +
        'final move\'s record_hash.',
    }),
  },
  {
    $id: 'SpanMove',
    additionalProperties: false,
    'x-cross-field-validated': true,
    'x-chain-bearing': true,
    'x-cas-reference': true,
    'x-canonical-size-cap-bytes': 4096,
    description:
      'One hash-chained move in a Legba span log. Chain-bearing ' +
      '(prev_hash/record_hash intra-span chain), CAS-referencing ' +
      '(input/output hashes), canonical-size-capped at 4 KB. Not ' +
      'crypto-bearing: moves are not individually signed — the gate ' +
      'token signs the span head (GateToken).',
  },
);

export type SpanMove = Static<typeof SpanMoveSchema>;
