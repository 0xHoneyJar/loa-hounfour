/**
 * PanelDecisionArtifact — deliberation input.
 *
 * Captures the proposed action, trust context (routing decision + scope),
 * a grounded claim DAG, the deliberation question, and a per-dimension
 * scoring rubric. Cross-field invariants — DAG validity, grounding
 * type-specific field requirements, and confidence-vs-routing coupling —
 * live in `constraints/PanelDecisionArtifact.constraints.json`.
 *
 * @see SDD section 3.3.1 — Required fields and cross-field constraints
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-A1)
 */
import { type Static } from '@sinclair/typebox';
/**
 * Provenance information for a single Claim.
 *
 * The `type` literal selects which auxiliary fields are semantically
 * required. Cross-field rules live in `PanelDecisionArtifact.constraints.json`:
 *
 * - `tool_output`         → `output_hash` matches `^sha256:[a-f0-9]{64}$` (length 71). Rule PDA-3.
 * - `acknowledged_judgment` → `source` is non-null AND `justification.length > 0`. Rule PDA-5.
 * - `claim_reference`     → `claim_id` references a sibling claim (DAG edge). Rule lands with the constraint file in PR-A1.4.
 * - `artifact_reference`  → `artifact_id` references a parent artifact (DAG edge). Rule lands with the constraint file in PR-A1.4.
 * - `external_reference`  → `external_uri` carries the off-protocol reference (URL / DOI / chain-transaction id). Substrate-agnostic; consumer parses the URI grammar. **Added v8.5.0 (PR-A2.3) — strict-additive discriminator extension folded from Eileen's 11-member `ProvenanceSourceType`.**
 * - `derived_inference`   → `inference_basis` lists the claim_ids the inference draws from (DAG edges). Substrate-agnostic; consumer enforces basis-set validity. **Added v8.5.0 (PR-A2.3) — strict-additive discriminator extension folded from Eileen's 11-member `ProvenanceSourceType`.**
 *
 * The original four-type set was **deliberate and closed for v8.4.0**. The
 * v8.5.0 EXTEND lands two new substrate-agnostic discriminator members
 * (`external_reference`, `derived_inference`) with their corresponding
 * optional auxiliary fields (`external_uri`, `inference_basis`); existing
 * v7.x consumers compile unchanged because the new members are additive on
 * the discriminator union and the new fields are optional. Cross-field
 * rules for the new members may land in cycle-005 alongside the
 * Challenge layer.
 *
 * The schema declares the surface; cross-field enforcement is the constraint
 * file's job (and is what `'x-cross-field-validated': true` advertises).
 */
export declare const ClaimGroundingSchema: import("@sinclair/typebox").TObject<{
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
}>;
export type ClaimGrounding = Static<typeof ClaimGroundingSchema>;
/**
 * Single grounded claim within a PanelDecisionArtifact claim DAG.
 *
 * `confidence: 'speculative'` triggers cross-field rule PDA-4: the artifact's
 * `trust_context.routing_decision` MUST be `'panel'`. Speculative claims
 * cannot ride an `auto-honor` or `auto-reject` routing path.
 */
export declare const ClaimSchema: import("@sinclair/typebox").TObject<{
    claim_id: import("@sinclair/typebox").TString;
    grounding: import("@sinclair/typebox").TObject<{
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
    }>;
    confidence: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high_confidence">, import("@sinclair/typebox").TLiteral<"plausible">, import("@sinclair/typebox").TLiteral<"speculative">]>;
}>;
export type Claim = Static<typeof ClaimSchema>;
/**
 * Action proposed for deliberation. `payload` is intentionally
 * untyped (consumer-defined shape) so the deliberation primitive
 * generalises across action types.
 */
export declare const ProposedActionSchema: import("@sinclair/typebox").TObject<{
    action_type: import("@sinclair/typebox").TString;
    target_id: import("@sinclair/typebox").TString;
    payload: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
}>;
export type ProposedAction = Static<typeof ProposedActionSchema>;
/**
 * Trust context: who/what is asking, by what route, and why.
 *
 * `routing_decision` is the literal union pinned by the source RFC.
 * `scope` and `reason` are free-text; the library does not constrain
 * their internal grammar.
 */
export declare const TrustContextSchema: import("@sinclair/typebox").TObject<{
    routing_decision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"panel">, import("@sinclair/typebox").TLiteral<"auto-honor">, import("@sinclair/typebox").TLiteral<"auto-reject">]>;
    scope: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TString;
}>;
export type TrustContext = Static<typeof TrustContextSchema>;
export declare const PanelDecisionArtifactSchema: import("@sinclair/typebox").TObject<{
    artifact_id: import("@sinclair/typebox").TString;
    proposed_action: import("@sinclair/typebox").TObject<{
        action_type: import("@sinclair/typebox").TString;
        target_id: import("@sinclair/typebox").TString;
        payload: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
    }>;
    trust_context: import("@sinclair/typebox").TObject<{
        routing_decision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"panel">, import("@sinclair/typebox").TLiteral<"auto-honor">, import("@sinclair/typebox").TLiteral<"auto-reject">]>;
        scope: import("@sinclair/typebox").TString;
        reason: import("@sinclair/typebox").TString;
    }>;
    claims: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        claim_id: import("@sinclair/typebox").TString;
        grounding: import("@sinclair/typebox").TObject<{
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
        }>;
        confidence: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"high_confidence">, import("@sinclair/typebox").TLiteral<"plausible">, import("@sinclair/typebox").TLiteral<"speculative">]>;
    }>>;
    question: import("@sinclair/typebox").TString;
    scoring_rubric: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type PanelDecisionArtifact = Static<typeof PanelDecisionArtifactSchema>;
//# sourceMappingURL=panel-decision-artifact.d.ts.map