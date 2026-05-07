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
import { type Static } from '@sinclair/typebox';
export declare const AssertionSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"candidate">;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"admitted">;
    signatures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"superseded">;
    signatures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"challenged">;
    signatures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"revoked">;
    signatures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"forgotten">;
    signatures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"escrow">;
    signatures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TLiteral<"archived">;
    signatures: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        envelope_id: import("@sinclair/typebox").TString;
        signature_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"authorization">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"dev_signature">]>;
        key_ref: import("@sinclair/typebox").TString;
        signed_payload_hash: import("@sinclair/typebox").TString;
        signature_value: import("@sinclair/typebox").TString;
        signed_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>>;
    assertion_id: import("@sinclair/typebox").TString;
    body_hash: import("@sinclair/typebox").TString;
    provenance: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tool_output">, import("@sinclair/typebox").TLiteral<"acknowledged_judgment">, import("@sinclair/typebox").TLiteral<"claim_reference">, import("@sinclair/typebox").TLiteral<"artifact_reference">, import("@sinclair/typebox").TLiteral<"external_reference">, import("@sinclair/typebox").TLiteral<"derived_inference">]>;
        artifact_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        claim_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        output_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        source: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            agent_id: import("@sinclair/typebox").TString;
            display_name: import("@sinclair/typebox").TString;
            agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
            capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            trust_scopes: import("@sinclair/typebox").TObject<{
                scopes: import("@sinclair/typebox").TObject<{
                    billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                    composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                }>;
                default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
                match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
                precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }>;
            delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
            max_delegation_depth: import("@sinclair/typebox").TInteger;
            governance_weight: import("@sinclair/typebox").TNumber;
            metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
            contract_version: import("@sinclair/typebox").TString;
        }>>;
        justification: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        external_uri: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        inference_basis: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    privacy_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"participants_only">, import("@sinclair/typebox").TLiteral<"controller_only">, import("@sinclair/typebox").TLiteral<"compliance_only">]>;
    risk_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"routine">, import("@sinclair/typebox").TLiteral<"elevated">, import("@sinclair/typebox").TLiteral<"high">, import("@sinclair/typebox").TLiteral<"severe">]>;
    recall_scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    assertion_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"attestation">, import("@sinclair/typebox").TLiteral<"observation">, import("@sinclair/typebox").TLiteral<"assessment">, import("@sinclair/typebox").TLiteral<"consent">, import("@sinclair/typebox").TLiteral<"delegation">, import("@sinclair/typebox").TLiteral<"commitment">, import("@sinclair/typebox").TLiteral<"disclosure">, import("@sinclair/typebox").TString]>;
    confidence: import("@sinclair/typebox").TNumber;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>]>;
export type Assertion = Static<typeof AssertionSchema>;
//# sourceMappingURL=assertion.d.ts.map