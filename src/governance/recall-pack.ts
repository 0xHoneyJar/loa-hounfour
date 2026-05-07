/**
 * `RecallPack` — output container for the recall machinery.
 *
 * Carries the assembled bundle (items + redaction summary +
 * exclusion summary) plus a content-addressed `pack_hash`. The
 * sub-component shapes (items, redactions, exclusions) are inlined
 * as anonymous `Type.Object` per the locked W4 de-scope decision —
 * promoting them to standalone `$id`-bearing schemas can land
 * strict-additively in v8.5.x or v8.6.0 if a consumer surfaces a
 * concrete need.
 *
 * **Hash domain**: `pack_hash` is the SHA-256 over the NFC-normalized
 * RFC 8785 canonical JSON of the pack contents *minus* the
 * `pack_hash` field itself. Computed via `safeCanonicalize` so the
 * 100KB normative payload cap (per the v8.5.0 hashing-spec freeze)
 * applies; consumers using the helper get correct behavior. Hounfour
 * does NOT verify the hash — `validate(RecallPackSchema, payload)`
 * accepts any well-formed `^sha256:[0-9a-f]{64}$` literal and
 * surfaces the obligation in the unverified-obligations manifest.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md
 * @since v8.5.0 (PR-A2.3)
 */
import { Type, type Static } from '@sinclair/typebox';

const RecallItemFields = Type.Object(
  {
    item_id: Type.String({
      minLength: 1,
      description: 'Consumer-side identifier for the recalled artifact.',
    }),
    item_type: Type.String({
      minLength: 1,
      description: 'Consumer-defined artifact category (e.g., "message", "claim", "credential").',
    }),
    payload_ref: Type.String({
      minLength: 1,
      description:
        'Consumer-side reference to the payload bytes. Hounfour does not dereference; the consumer resolves it against its own object store.',
    }),
    recorded_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the artifact was originally recorded.',
    }),
  },
  {
    additionalProperties: false,
    description:
      'Inline RecallItem shape. Sub-components are inlined within RecallPack per the locked v8.5.0 de-scope decision; promoting to a standalone $id can land strict-additively in v8.5.x or v8.6.0.',
  },
);

const RedactionSummaryFields = Type.Object(
  {
    total_redacted: Type.Integer({
      minimum: 0,
      description: 'Count of items redacted from the recall pack.',
    }),
    redaction_categories: Type.Array(Type.String({ minLength: 1 }), {
      description: 'Consumer-defined category names for the redactions applied.',
    }),
  },
  {
    additionalProperties: false,
    description: 'Inline RedactionSummary shape.',
  },
);

const ExclusionSummaryFields = Type.Object(
  {
    total_excluded: Type.Integer({
      minimum: 0,
      description: 'Count of items excluded from the recall pack (e.g., privileged + legal-hold).',
    }),
    exclusion_categories: Type.Array(Type.String({ minLength: 1 }), {
      description: 'Consumer-defined category names for the exclusions applied.',
    }),
  },
  {
    additionalProperties: false,
    description: 'Inline ExclusionSummary shape.',
  },
);

export const RecallPackSchema = Type.Object(
  {
    pack_id: Type.String({
      format: 'uuid',
      description: 'Stable opaque identifier for this pack (UUID v4).',
    }),
    recall_request_ref: Type.String({
      format: 'uuid',
      description: 'FK to RecallRequest.request_id; the request that produced this pack.',
    }),
    items: Type.Array(RecallItemFields, {
      description: 'Per-item inline records (see RecallItem inline shape above).',
    }),
    redactions: RedactionSummaryFields,
    exclusions: ExclusionSummaryFields,
    pack_hash: Type.String({
      pattern: '^sha256:[0-9a-f]{64}$',
      description:
        'SHA-256 hex digest (lowercase) of safeCanonicalize(pack-minus-pack_hash). NFC + RFC 8785 + 100KB cap per the hashing-spec freeze. Library does NOT verify; consumer-side reconciliation is required.',
    }),
    created_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the pack was assembled.',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Hounfour contract version this pack was authored against.',
    }),
  },
  {
    $id: 'RecallPack',
    additionalProperties: false,
    description:
      'Output container for the recall machinery: items + redaction summary + exclusion summary + content-addressed pack_hash. Sub-component shapes inlined per the locked v8.5.0 de-scope decision. Hash verification is a consumer obligation surfaced via the unverified-obligations manifest (integrity_deferred).',
  },
);

export type RecallPack = Static<typeof RecallPackSchema>;
