/**
 * `EscalationEnvelopeSchema` — operator-bound escalation event with
 * SLA + idempotency surface (FR-B5, v8.6.0).
 *
 * Severity-to-channel routing is consumer-side per ADR-010 — hounfour
 * declares the shape (severity enum, idempotency key, evidence hashes,
 * SLA seconds), the consumer dispatches to the appropriate channel
 * (digest / Telegram / email / SMS / auto-execute). The escalation
 * surface is intentionally minimal so consumer implementations can
 * compose richer policy without schema-side coupling.
 *
 * @see SDD §3.7 — FR-B5 spec
 * @since v8.6.0 — FR-B5 (PR-A3.5)
 */
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';

export const EscalationSeveritySchema = Type.Union(
  [
    Type.Literal('info'),
    Type.Literal('warn'),
    Type.Literal('critical'),
    Type.Literal('panic'),
  ],
  {
    $id: 'EscalationSeverity',
    description:
      'Four-level escalation severity enum. info → digest channel, ' +
      'warn → Telegram, critical → email, panic → SMS + auto-execute. ' +
      'The severity-to-channel mapping is consumer-side policy per ADR-010; ' +
      'the schema declares only the four legal severity levels.',
  },
);
export type EscalationSeverity = Static<typeof EscalationSeveritySchema>;

export const EscalationEnvelopeSchema = Type.Object(
  {
    envelope_kind: Type.Literal('escalation'),
    contract_version: Type.Literal('8.6.0'),
    escalation_id: Type.String({ minLength: 1 }),
    ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
    cluster_id: Type.String({ minLength: 1 }),
    severity: EscalationSeveritySchema,
    reason_class: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1, maxLength: 4096 }),
    attached_evidence_hashes: Type.Array(Type.String({ pattern: SHA256_HEX_PATTERN })),
    expected_response_sla_seconds: Type.Integer({ minimum: 0 }),
    idempotency_key: Type.String({
      pattern: '^[A-Fa-f0-9]{64}$',
      description: '64-hex sha256 idempotency key (no `sha256:` prefix).',
    }),
  },
  {
    $id: 'EscalationEnvelope',
    additionalProperties: false,
    description:
      'Operator-bound escalation event. Severity-to-channel routing ' +
      '(info → digest, warn → Telegram, critical → email, panic → SMS + ' +
      'auto-execute) is consumer-side policy per ADR-010 and explicitly ' +
      'NOT in this schema.',
  },
);
export type EscalationEnvelope = Static<typeof EscalationEnvelopeSchema>;
