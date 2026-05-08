/**
 * `EpicCheckpointSchema` — durable EPIC progress checkpoint
 * (FR-B8, v8.6.0).
 *
 * Captures the current execution state of an EPIC: its canonical-run
 * pointer, current phase, last completed gate, in-progress tool
 * call (with input hash for idempotent retry), and retry counter.
 *
 * The `canonical_run_id` field references a known `CanonicalRunSchema`
 * instance per consumer-side registry resolution (manifest emits
 * `CANONICAL_RUN_REF_CONTEXT_DEFERRED` when the consumer hasn't
 * supplied registry context — runtime-deferred per NF-1).
 *
 * @see SDD §3.10 — FR-B8 spec
 * @since v8.6.0 — FR-B8 (PR-A3.5)
 */
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';

export const EpicCheckpointSchema = Type.Object(
  {
    envelope_kind: Type.Literal('epic_checkpoint'),
    contract_version: Type.Literal('8.6.0'),
    ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
    cluster_id: Type.String({ minLength: 1 }),
    epic_id: Type.String({ minLength: 1 }),
    canonical_run_id: Type.String({ minLength: 1 }),
    current_phase: Type.String({ minLength: 1 }),
    last_completed_gate: Type.String({ minLength: 1 }),
    in_progress_tool_call: Type.Object(
      {
        tool_id: Type.String({ minLength: 1 }),
        input_hash: Type.String({
          pattern: '^[A-Fa-f0-9]{64}$',
          description:
            '64-hex sha256 of the tool-call inputs canonical form, used ' +
            'for idempotent retry detection.',
        }),
        start_ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
      },
      { additionalProperties: false },
    ),
    retry_count: Type.Integer({ minimum: 0 }),
  },
  {
    $id: 'EpicCheckpoint',
    additionalProperties: false,
    description:
      'Durable EPIC progress checkpoint. canonical_run_id resolves ' +
      'against a known CanonicalRunSchema instance via consumer-side ' +
      'registry; manifest surfaces the lookup obligation when registry ' +
      'context is absent.',
  },
);
export type EpicCheckpoint = Static<typeof EpicCheckpointSchema>;
