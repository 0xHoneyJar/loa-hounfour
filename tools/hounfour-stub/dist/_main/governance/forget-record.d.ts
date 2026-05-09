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
import { type Static } from '@sinclair/typebox';
export declare const ForgetRecordSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    forget_scope: import("@sinclair/typebox").TLiteral<"pii_only">;
    forget_id: import("@sinclair/typebox").TString;
    subject_agent_id: import("@sinclair/typebox").TString;
    authorized_by_signer_id: import("@sinclair/typebox").TString;
    recorded_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    forget_scope: import("@sinclair/typebox").TLiteral<"agent_full">;
    forget_id: import("@sinclair/typebox").TString;
    subject_agent_id: import("@sinclair/typebox").TString;
    authorized_by_signer_id: import("@sinclair/typebox").TString;
    recorded_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    forget_scope: import("@sinclair/typebox").TLiteral<"pii_and_link_to_key">;
    forget_id: import("@sinclair/typebox").TString;
    subject_agent_id: import("@sinclair/typebox").TString;
    authorized_by_signer_id: import("@sinclair/typebox").TString;
    recorded_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    forget_scope: import("@sinclair/typebox").TLiteral<"crypto_full_destruction">;
    legal_mandate_reference: import("@sinclair/typebox").TString;
    forget_id: import("@sinclair/typebox").TString;
    subject_agent_id: import("@sinclair/typebox").TString;
    authorized_by_signer_id: import("@sinclair/typebox").TString;
    recorded_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>]>;
export type ForgetRecord = Static<typeof ForgetRecordSchema>;
//# sourceMappingURL=forget-record.d.ts.map