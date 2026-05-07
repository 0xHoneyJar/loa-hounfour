/**
 * `ForgetRecord` — first-class forgetting primitive distinct from
 * `Sanction` / revocation.
 *
 * Discriminated union over `forget_scope`:
 *
 * - `'pii_only'` — PII redacted; identity shell + key + binding preserved.
 *   Past signatures still verify via the preserved binding.
 * - `'agent_full'` — identity tombstoned (hash-reference) + PII destroyed;
 *   key material preserved on the SignerEntry. Past signatures verify
 *   anonymously.
 * - `'pii_and_link_to_key'` — PII destroyed + identity-key binding severed;
 *   anonymous public key preserved so past signatures still verify
 *   anonymously. **GDPR-default for "right to be forgotten" while
 *   preserving audit non-repudiation.**
 * - `'crypto_full_destruction'` — everything including key material
 *   destroyed; **breaks audit non-repudiation**; reserved for legal-
 *   compliance overrides. **Requires** `legal_mandate_reference`
 *   (non-empty string identifying the mandate).
 *
 * The fourth variant's mandatory `legal_mandate_reference` is enforced
 * structurally — the field exists on that variant only, so
 * `additionalProperties: false` rejects payloads that put the field on
 * the wrong variant. Conversely, omitting the field on the
 * `crypto_full_destruction` variant fails the per-variant required-
 * field check. No runtime check is needed; the discriminator carries
 * the constraint.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/forget-record-semantics.md — verifiability truth table
 * @since v8.5.0 (PR-A2.3)
 */
import { Type, type Static } from '@sinclair/typebox';

const ForgetRecordCommonFields = {
  forget_id: Type.String({
    format: 'uuid',
    description: 'Stable opaque identifier for this forget record (UUID v4).',
  }),
  subject_agent_id: Type.String({
    pattern: '^[a-z][a-z0-9_-]{2,63}$',
    description: 'The agent whose data is being forgotten.',
  }),
  authorized_by_signer_id: Type.String({
    pattern: '^[a-z][a-z0-9_-]{2,63}$',
    description: 'The signer that authorized this forget operation.',
  }),
  recorded_at: Type.String({
    format: 'date-time',
    description: 'ISO 8601 timestamp at which the forget operation was recorded.',
  }),
  contract_version: Type.String({
    pattern: '^\\d+\\.\\d+\\.\\d+$',
    description: 'Hounfour contract version this forget record was authored against.',
  }),
};

export const ForgetRecordSchema = Type.Union(
  [
    Type.Object(
      {
        ...ForgetRecordCommonFields,
        forget_scope: Type.Literal('pii_only', {
          description:
            'PII redacted; identity shell + key + binding preserved. Past signatures still verify.',
        }),
      },
      {
        additionalProperties: false,
        description:
          'pii_only variant — PII redacted; identity shell + key + binding preserved. Past signatures still verify.',
      },
    ),
    Type.Object(
      {
        ...ForgetRecordCommonFields,
        forget_scope: Type.Literal('agent_full', {
          description:
            'Identity tombstoned (hash-reference) + PII destroyed; key material preserved on SignerEntry. Past signatures verify anonymously.',
        }),
      },
      {
        additionalProperties: false,
        description:
          'agent_full variant — identity tombstoned + PII destroyed; key material preserved on SignerEntry. Past signatures verify anonymously.',
      },
    ),
    Type.Object(
      {
        ...ForgetRecordCommonFields,
        forget_scope: Type.Literal('pii_and_link_to_key', {
          description:
            'PII destroyed + identity-key binding severed; anonymous public key preserved so past signatures still verify anonymously. GDPR-default scope.',
        }),
      },
      {
        additionalProperties: false,
        description:
          'pii_and_link_to_key variant — PII destroyed + identity-key binding severed; anonymous public key preserved. GDPR-default scope.',
      },
    ),
    Type.Object(
      {
        ...ForgetRecordCommonFields,
        forget_scope: Type.Literal('crypto_full_destruction', {
          description:
            'Everything including key material destroyed; BREAKS audit non-repudiation. Requires legal_mandate_reference.',
        }),
        legal_mandate_reference: Type.String({
          minLength: 8,
          description:
            'Legal/regulatory mandate compelling key destruction (e.g., "GDPR-Article-17-Erasure-Order-2026-04-15"). Required ONLY for crypto_full_destruction scope; minLength 8 forces a non-trivial reference.',
        }),
      },
      {
        additionalProperties: false,
        description:
          'crypto_full_destruction variant — everything destroyed including key material. Breaks audit non-repudiation. Requires legal_mandate_reference (minLength: 8).',
      },
    ),
  ],
  {
    $id: 'ForgetRecord',
    description:
      'First-class forgetting primitive distinct from Sanction/revocation. Four-variant discriminated union over forget_scope. The crypto_full_destruction variant requires a legal_mandate_reference field; the other three variants must NOT carry the field (additionalProperties: false enforces). See docs/architecture/forget-record-semantics.md for the verifiability truth table.',
  },
);

export type ForgetRecord = Static<typeof ForgetRecordSchema>;
