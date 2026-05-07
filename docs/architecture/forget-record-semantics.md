# `ForgetRecord` Semantics

> Status: normative for v8.5.0
> Schema: [`src/governance/forget-record.ts`](../../src/governance/forget-record.ts)
> Constraint file: [`constraints/ForgetRecord.constraints.json`](../../constraints/ForgetRecord.constraints.json)

`ForgetRecord` is the v8.5.0 first-class forgetting primitive. It is
**distinct from `Sanction`/revocation** — revocation flips a signal on
an existing record while preserving content; forgetting destroys the
content while leaving a tombstone marker. The two primitives are
complementary, not interchangeable.

This document covers (1) the forgetting-vs-revocation distinction,
(2) the four-variant `forget_scope` discriminator, (3) the H1
mandatory `legal_mandate_reference` field on the
`crypto_full_destruction` variant, (4) the verifiability truth table
across the four scopes, (5) industry alignment, and (6) the audit-
defensibility caveat.

## 1. Forgetting vs Revocation

| | Revocation (`Sanction`) | Forgetting (`ForgetRecord`) |
|---|---|---|
| Original record | Stays; signal flips | Content destroyed; tombstone marker remains |
| Driver | Authority-internal | Often subject-driven or jurisdiction-driven (GDPR Article 17, CCPA, HIPAA) |
| Audit-chain interaction | Extends chain forward | Requires tombstone hashes / chain-substitution to preserve continuity (ADR-005, ADR-006) |
| Required fields | Authority, target, reason code, optional grace period | Legal basis, subject of erasure, what replaces the chain link, who authorized, **`forget_scope`** discriminator |
| Lifecycle | Once revoked, stays revoked | Once forgotten, the *fact* of forgetting persists; the content is irretrievable |

## 2. The four-variant `forget_scope` discriminator

`ForgetRecord` is a TypeBox discriminated union over `forget_scope`:

| Variant | Effect on PII | Effect on identity-key binding | Effect on key material | Past-signature verifiability |
|---|---|---|---|---|
| `pii_only` | Redacted | Preserved | Preserved | ✓ verifies (preserved binding) |
| `agent_full` | Destroyed | Tombstoned (hash-reference) | Preserved on `SignerEntry` | ✓ verifies (anonymous via tombstone) |
| `pii_and_link_to_key` | Destroyed | Severed | Preserved as anonymous public key | ✓ verifies anonymously |
| `crypto_full_destruction` | Destroyed | Severed | **Destroyed** | ✗ **breaks audit non-repudiation** |

`pii_and_link_to_key` is the **GDPR default** for "right to be
forgotten" cases that do not legally compel key destruction. It
delivers the user-facing erasure (PII destroyed, identity-key binding
severed) while preserving the cryptographic evidence chain (signatures
made by the anonymized key still verify against the anonymous public
key). Default-preserve audit non-repudiation across `pii_only`,
`agent_full`, and `pii_and_link_to_key`.

`crypto_full_destruction` is **explicitly exceptional**. It is the
only variant that breaks audit non-repudiation, and exists for
jurisdictions / legal mandates that require destruction of the key
material itself (not just the binding). The schema docstring marks it
as "use only when legal compliance overrides audit-defensibility";
ADR-010 (Class-vs-Policy Boundary) carries the same caveat.

### 2.1 H1 mandatory `legal_mandate_reference`

The `crypto_full_destruction` variant **requires** a
`legal_mandate_reference: Type.String({ minLength: 8 })` field —
non-empty string identifying the legal/regulatory mandate that
compels the destruction. Examples:

- `"GDPR-Article-17-Erasure-Order-2026-04-15"`
- `"Court-Order-XYZ-Case-12345"`
- `"HIPAA-Destruction-Notice-DOC-7890"`

This is enforced **structurally** via the TypeBox discriminated
union: the `crypto_full_destruction` variant declares the field as
required and the other three variants have `additionalProperties:
false` so passing the field on the wrong variant fails schema
validation. No runtime check is needed; the discriminator carries the
constraint.

The minimum length of 8 is a structural floor — it forces a
non-trivial reference rather than a single-character placeholder.
Hounfour does **not** parse the reference grammar; consumer-side
audit tooling should match against the consumer's own mandate
catalog.

## 3. Verifiability truth table

For each `forget_scope` value, the table records which post-
forgetting verifications remain valid. The default scope
(`pii_and_link_to_key`) preserves all cryptographic evidence; only
`crypto_full_destruction` breaks the audit chain.

| Verification | `pii_only` | `agent_full` | `pii_and_link_to_key` (default) | `crypto_full_destruction` (exceptional) |
|---|---|---|---|---|
| `AgentIdentity` record exists | ✓ (PII redacted; shell preserved) | ✗ (tombstoned) | ✗ (tombstoned; PII + binding destroyed) | ✗ (tombstoned + key destroyed) |
| `AgentIdentity.agent_id` resolvable | ✓ | ✓ (resolves to tombstone marker) | ✓ | ✓ |
| `OrgRepresentativeDelegation` chain valid (`is_valid_dag`) | ✓ | ✓ (chain resolves through tombstone) | ✓ | ✓ |
| `granted_by_chain_records` reach genesis | ✓ | ✓ | ✓ | ✓ |
| **Past `SignatureEnvelope` records verify cryptographically** | ✓ | ✓ (key on `SignerEntry` preserved) | ✓ (key preserved as anonymous) | ✗ (key material destroyed) |
| `AuditEntry` hash chain remains continuous | ✓ | ✓ (tombstone substitutes) | ✓ (tombstone substitutes) | ✓ (tombstone substitutes) |
| Past `Assertion.body_hash` valid | ✓ | ✓ | ✓ | ✓ (content-hash; doesn't require key) |
| Past `Assertion.signatures[]` verify | ✓ | ✓ | ✓ (anonymized) | ✗ (key destroyed) |
| Audit can reconstruct *what* the agent did | ✓ | ✓ (action shapes preserved) | ✓ (action shapes preserved) | ✓ (action shapes preserved) |
| Audit can reconstruct *who* the agent was (PII) | ✗ | ✗ | ✗ | ✗ |
| Audit can prove *some entity holding key K* signed past artifacts | ✓ | ✓ | ✓ (entity K anonymized) | ✗ (key destroyed) |

### 3.1 Forgetting and the authority cascade

The cascade survives all four scopes structurally — only the
`crypto_full_destruction` row breaks cryptographic verification:

- `AgentIdentity` tombstoning preserves `agent_id` reference for
  chain resolution under all 4 scopes.
- `OrgRepresentativeDelegation` chain is **never broken** —
  `is_valid_dag` resolves through tombstoned representative records
  for all 4 scopes.
- Past `SignatureEnvelope` records remain verifiable under
  `pii_only` / `agent_full` / `pii_and_link_to_key` — default-preserve
  audit non-repudiation.
- `crypto_full_destruction` is the only variant that breaks the
  cryptographic chain; the structural chain (delegation DAG, audit
  hash chain) still resolves.

## 4. Industry alignment

The four-variant pattern matches the deletion semantics carried by
modern privacy-and-evidence regimes:

- **GDPR Article 17** ("right to be forgotten") — the
  `pii_and_link_to_key` default exactly matches GDPR-aware fintech
  patterns (e.g., Stripe data-deletion): destroy PII + identity-key
  binding, preserve cryptographic evidence anonymously.
- **HL7 FHIR `OperationOutcome`** — healthcare deletion semantics
  similarly distinguish redaction (`pii_only`) from full erasure
  (`crypto_full_destruction`).
- **W3C Verifiable Credentials revocation-list** — deliberately
  excludes erasure as a separate primitive; the spec assumes
  revocation (which `Sanction` carries) and *separately* defers
  erasure to the issuing authority's data-store policy. Hounfour's
  `ForgetRecord` is the schema-level encoding of that authority-policy.

## 5. Audit-defensibility caveat

Default scopes (`pii_only`, `agent_full`, `pii_and_link_to_key`)
preserve audit non-repudiation. Auditors can prove cryptographically
that *some entity holding key K* signed past artifacts — the binding
between key K and the *individual* may be anonymized, but the
signature itself remains verifiable.

`crypto_full_destruction` deliberately removes that property. It is
the right answer when (a) a legal/regulatory mandate compels key
destruction, and (b) the auditor must accept that past
cryptographic evidence is irrecoverable. Consumers using this scope
should ensure (1) the `legal_mandate_reference` carries a precise
citation, (2) the consumer's audit-policy adjudicator has explicitly
authorized the scope for the subject, and (3) downstream verifiers
are notified that signatures previously valid under this key are no
longer cryptographically verifiable.

The `ForgetRecord` constraint file's `FR-2` rule (runtime-deferred,
manifest-emitted) surfaces this consumer obligation: audit-policy
adjudication is consumer-side per ADR-010; the library ships shape
only.

## 6. Cross-references

- [`ADR-010`](../adr/ADR-010-class-vs-policy-boundary.md) — the
  class-vs-policy boundary that constrains hounfour to ship shape;
  the `crypto_full_destruction` caveat lives there as well.
- [`docs/architecture/authority-cascade.md`](authority-cascade.md) —
  the v8.5.0 three-layer authority cascade. `ForgetRecord` interacts
  with Layer 1 (`OrgIdentity` / `OrgRepresentativeDelegation` /
  `SuccessionPolicy`) by tombstoning identity records without
  breaking the chain, and with Layer 2 (`Keyring` / `SignerEntry`)
  by preserving or destroying key material per scope.
- [`docs/architecture/hashing-spec-freeze-v8.5.md`](hashing-spec-freeze-v8.5.md)
  — content-addressed hashes (`pack_hash`, `receipt_hash`,
  `subject_hash`, `body_hash`) survive forgetting because they are
  computed over the canonical-JSON form of the artifact; the artifact
  itself may be tombstoned without invalidating the hash.
- [`docs/migrations/v8.5.0-class-validation-intake.md`](../migrations/v8.5.0-class-validation-intake.md)
  — the v8.5.0 reuse-audit doc that locked the four-variant
  discriminator, including the G2 rename (`including_signing_material`
  → `pii_and_link_to_key` + new `crypto_full_destruction`) and the
  H1 mandatory `legal_mandate_reference` field.
