/**
 * `Assertion` — signed-observation-with-lifecycle envelope.
 *
 * **Distinct from `Claim`** (the smaller evidentiary primitive used
 * inside `PanelDecisionArtifact`). `Assertion` is the assertion-
 * store record: a signed claim with an explicit lifecycle
 * (`AssertionStatus`), a privacy classification, a risk level,
 * and a class (illocutionary force).
 *
 * **Status discriminator (F3 fold)**: `Assertion` is a discriminated
 * union over `status`. Pre-admission `CandidateAssertion` is folded
 * as the `'candidate'` variant — no separate `$id` — because it
 * differs from post-admission `Assertion` only by absence of
 * `signatures[]`. The fold reduces total `$id` count by 1.
 *
 * **Variant-aware crypto-bearing (J3)**: per the discriminator-
 * conditional metadata below, `'candidate'` is shape-only (NOT
 * crypto-bearing — `validate(AssertionSchema, candidate)` returns
 * `valid: true` without `acceptDeferred`); the other 7 statuses
 * carry `signatures: Array(SignatureEnvelope, { minItems: 1 })`
 * and ARE crypto-bearing (`validate()` defaults to
 * `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` unless
 * `{ acceptDeferred: true }` is passed). The runtime inspects the
 * payload's `status` field after structural validation to decide
 * which branch applies.
 *
 * Per-status state-machine rules (A1 / A2 / A3) live in
 * `constraints/Assertion.constraints.json`:
 *
 * - A1: `status == 'admitted'` → `signatures.length >= 1` (structural;
 *   the schema's variant carries the `minItems` invariant directly).
 * - A2: `status == 'forgotten'` → references a `forget_record_id`
 *   (consumer-side correlation; the assertion-store row carries the
 *   reference outside the hounfour-typed envelope).
 * - A3: state-transition validity (e.g. `'candidate'` → `'admitted'`,
 *   never `'admitted'` → `'candidate'`) — runtime-deferred,
 *   manifest-emitted.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see ClaimGroundingSchema — extended in PR-A2.3 with substrate-agnostic provenance members
 * @see SignatureEnvelopeSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AssertionClassSchema } from './assertion-class.js';
import { ClaimGroundingSchema } from './panel-decision-artifact.js';
import { PrivacyScopeSchema } from './privacy-scope.js';
import { RiskLevelSchema } from './risk-level.js';
import { SignatureEnvelopeSchema } from './signature-envelope.js';
import { SurfaceContextSchema } from './surface-context.js';

const AssertionCommonFields = {
  assertion_id: Type.String({
    format: 'uuid',
    description: 'Stable opaque identifier for this assertion (UUID v4).',
  }),
  body_hash: Type.String({
    pattern: '^sha256:[0-9a-f]{64}$',
    description:
      'SHA-256 hex digest (lowercase) of safeCanonicalize(assertion-body). NFC + RFC 8785 + 100KB cap per the hashing-spec freeze. The body is the assertion content the signer commits to.',
  }),
  provenance: Type.Array(ClaimGroundingSchema, {
    description:
      'Per-grounding provenance records describing how the assertion content was sourced. ClaimGrounding is EXTENDED in PR-A2.3 with 1-2 substrate-agnostic discriminator members.',
  }),
  privacy_scope: PrivacyScopeSchema,
  risk_level: RiskLevelSchema,
  recall_scope: SurfaceContextSchema,
  assertion_class: AssertionClassSchema,
  confidence: Type.Number({
    minimum: 0,
    maximum: 1,
    description: 'Signer-asserted confidence in the assertion content; 0..1 inclusive.',
  }),
  created_at: Type.String({
    format: 'date-time',
    description: 'ISO 8601 timestamp at which the assertion was created.',
  }),
  contract_version: Type.String({
    pattern: '^\\d+\\.\\d+\\.\\d+$',
    description: 'Hounfour contract version this assertion was authored against.',
  }),
};

const SignaturesArrayField = {
  signatures: Type.Array(SignatureEnvelopeSchema, {
    minItems: 1,
    description:
      'At least one SignatureEnvelope. Each envelope carries the signed_payload_hash committing to body_hash + the rest of the assertion fields (consumer-side reconstruction).',
  }),
};

const CandidateAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    status: Type.Literal('candidate', {
      description: 'Pre-admission; no signatures required. The only NON-crypto-bearing variant.',
    }),
  },
  {
    additionalProperties: false,
    description:
      'candidate variant — pre-admission; no signatures[]. NOT crypto-bearing — validate() returns { valid: true } without acceptDeferred.',
  },
);

const AdmittedAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    ...SignaturesArrayField,
    status: Type.Literal('admitted', {
      description: 'Signed and accepted. Crypto-bearing — signatures[] required (A1).',
    }),
  },
  {
    additionalProperties: false,
    'x-crypto-bearing': true,
    description: 'admitted variant — signatures[] required (A1). Crypto-bearing.',
  },
);

const SupersededAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    ...SignaturesArrayField,
    status: Type.Literal('superseded', {
      description: 'Replaced by a newer admitted assertion; original signatures preserved for audit.',
    }),
  },
  {
    additionalProperties: false,
    'x-crypto-bearing': true,
    description: 'superseded variant — original signatures preserved. Crypto-bearing.',
  },
);

const ChallengedAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    ...SignaturesArrayField,
    status: Type.Literal('challenged', {
      description: 'Under formal challenge; signatures still meaningful for audit chain.',
    }),
  },
  {
    additionalProperties: false,
    'x-crypto-bearing': true,
    description: 'challenged variant — signatures preserved. Crypto-bearing.',
  },
);

const RevokedAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    ...SignaturesArrayField,
    status: Type.Literal('revoked', {
      description: 'Invalidated by sanction; original signatures preserved for audit chain.',
    }),
  },
  {
    additionalProperties: false,
    'x-crypto-bearing': true,
    description: 'revoked variant — signatures preserved. Crypto-bearing.',
  },
);

const ForgottenAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    ...SignaturesArrayField,
    status: Type.Literal('forgotten', {
      description: 'Subject of a ForgetRecord. References forget_record_id consumer-side (A2).',
    }),
  },
  {
    additionalProperties: false,
    'x-crypto-bearing': true,
    description:
      'forgotten variant — signatures preserved when forget_scope ∈ {pii_only, agent_full, pii_and_link_to_key}; absent only when forget_scope == crypto_full_destruction (consumer-side state). Crypto-bearing.',
  },
);

const EscrowAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    ...SignaturesArrayField,
    status: Type.Literal('escrow', {
      description: 'Awaiting reveal / unsealing; signatures present but content covered.',
    }),
  },
  {
    additionalProperties: false,
    'x-crypto-bearing': true,
    description: 'escrow variant — signatures present; content covered by escrow policy. Crypto-bearing.',
  },
);

const ArchivedAssertionVariant = Type.Object(
  {
    ...AssertionCommonFields,
    ...SignaturesArrayField,
    status: Type.Literal('archived', {
      description: 'Moved to cold storage; signatures preserved for provenance.',
    }),
  },
  {
    additionalProperties: false,
    'x-crypto-bearing': true,
    description: 'archived variant — signatures preserved. Crypto-bearing.',
  },
);

export const AssertionSchema = Type.Union(
  [
    CandidateAssertionVariant,
    AdmittedAssertionVariant,
    SupersededAssertionVariant,
    ChallengedAssertionVariant,
    RevokedAssertionVariant,
    ForgottenAssertionVariant,
    EscrowAssertionVariant,
    ArchivedAssertionVariant,
  ],
  {
    $id: 'Assertion',
    description:
      'Signed-observation-with-lifecycle envelope. 8-variant status-discriminated union. CandidateAssertion folded as status:candidate (F3 fold). Variant-aware crypto-bearing (J3): candidate is NOT crypto-bearing; the other 7 variants ARE — validate() inspects payload status to apply the safe-by-default branch. State-machine rules (A1/A2/A3) live in constraints/Assertion.constraints.json.',
  },
);

export type Assertion = Static<typeof AssertionSchema>;
