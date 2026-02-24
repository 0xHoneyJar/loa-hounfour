/**
 * AuditTrail + AuditEntry schemas — append-only hash chain for governed resources.
 *
 * Each entry carries a domain-separated SHA-256 hash linking it to its predecessor,
 * forming a tamper-evident chain. The genesis hash constant anchors new trails.
 *
 * @see SDD §4.3 — AuditTrail (FR-1.3)
 * @see SDD §4.3.1 — Audit Trail Checkpointing (Flatline IMP-003)
 * @since v8.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * SHA-256 of empty string — genesis sentinel for the first entry in a chain.
 *
 * Matches the SCORING_PATH_GENESIS_HASH pattern in `src/governance/scoring-path-hash.ts`.
 */
export const AUDIT_TRAIL_GENESIS_HASH =
  'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Single entry in an audit trail hash chain.
 */
export const AuditEntrySchema = Type.Object(
  {
    entry_id: Type.String({ format: 'uuid' }),
    timestamp: Type.String({ format: 'date-time' }),
    event_type: Type.String({
      minLength: 1,
      pattern: '^[a-z]+\\.[a-z_]+\\.[a-z_]+$',
      description:
        'Dotted event type (e.g., commons.transition.executed). '
        + 'Follows existing EventType pattern from vocabulary/event-types.ts.',
    }),
    actor_id: Type.Optional(
      Type.String({ minLength: 1 }),
    ),
    payload: Type.Optional(
      Type.Unknown({
        description: 'Event-specific data. Schema varies by event_type.',
      }),
    ),
    entry_hash: Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description: 'Domain-separated SHA-256 of this entry (excluding hash fields).',
    }),
    previous_hash: Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description:
        'Hash of the preceding entry. Genesis entry uses AUDIT_TRAIL_GENESIS_HASH.',
    }),
    hash_domain_tag: Type.String({
      minLength: 1,
      description:
        'The exact domain tag used when computing entry_hash. '
        + 'Format: "loa-commons:audit:<schema_$id>:<contract_version>". '
        + 'Persisted at write time so cross-version verification is unambiguous. '
        + '(Flatline SKP-002)',
    }),
  },
  {
    $id: 'AuditEntry',
    additionalProperties: false,
  },
);

export type AuditEntry = Static<typeof AuditEntrySchema>;

/**
 * Append-only audit trail with hash chain integrity.
 *
 * Supports optional checkpointing (Flatline IMP-003) to prevent
 * unbounded growth of the entries array.
 */
export const AuditTrailSchema = Type.Object(
  {
    entries: Type.Array(AuditEntrySchema, {
      description: 'Ordered sequence of audit events. Append-only.',
    }),
    hash_algorithm: Type.Literal('sha256', {
      description: 'Hash function for chain integrity. Fixed to sha256.',
    }),
    genesis_hash: Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description: 'Chain anchor. Must equal AUDIT_TRAIL_GENESIS_HASH for new trails.',
    }),
    integrity_status: Type.Union(
      [
        Type.Literal('verified'),
        Type.Literal('unverified'),
        Type.Literal('quarantined'),
      ],
      {
        description:
          'verified: chain integrity confirmed. '
          + 'unverified: chain not yet checked. '
          + 'quarantined: discontinuity detected, entries after break are suspect.',
      },
    ),
    checkpoint_hash: Type.Optional(
      Type.String({
        pattern: '^sha256:[a-f0-9]{64}$',
        description:
          'Hash of the most recent checkpoint. When present, entries before '
          + 'the checkpoint may be archived. The checkpoint_hash proves continuity '
          + 'with the archived segment without requiring the full history.',
      }),
    ),
    checkpoint_index: Type.Optional(
      Type.Integer({
        minimum: 0,
        description:
          'Index of the last checkpointed entry. Entries at or before this '
          + 'index may be pruned from the entries array after archiving.',
      }),
    ),
  },
  {
    $id: 'AuditTrail',
    additionalProperties: false,
  },
);

export type AuditTrail = Static<typeof AuditTrailSchema>;
