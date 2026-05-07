/**
 * PanelVerdict — deliberation output.
 *
 * Bucket + per-juror verdicts + Ed25519-signed envelope. The bucket↔verdict
 * pairing, juror-count bounds, and asymmetric-blocker rule live in
 * `constraints/PanelVerdict.constraints.json`. Signature *shape* is declared
 * by the schema; cryptographic verification is consumer-side per NF-1
 * (library/runtime boundary).
 *
 * `signing_context` (audience/scope/contract_version) is bound under the
 * Ed25519 signature so consumers can reject cross-context replay.
 *
 * @see SDD section 3.3.2 — Required fields, inline JurorVerdictSchema, signing_context
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-A2)
 */
import { type Static } from '@sinclair/typebox';
/**
 * Inline juror verdict per the OQ2 Option c resolution: reuse the existing
 * `DelegationVoteSchema` for the vote payload, and wrap with deliberation-
 * specific fields (`score`, `voted_at`) here. This keeps existing
 * DelegationVote consumers untouched.
 */
export declare const JurorVerdictSchema: import("@sinclair/typebox").TObject<{
    juror: import("@sinclair/typebox").TObject<{
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
    }>;
    vote: import("@sinclair/typebox").TObject<{
        voter_id: import("@sinclair/typebox").TString;
        vote: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agree">, import("@sinclair/typebox").TLiteral<"disagree">, import("@sinclair/typebox").TLiteral<"abstain">]>;
        result: import("@sinclair/typebox").TUnknown;
        confidence: import("@sinclair/typebox").TNumber;
        reasoning: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    score: import("@sinclair/typebox").TInteger;
    voted_at: import("@sinclair/typebox").TString;
}>;
export type JurorVerdict = Static<typeof JurorVerdictSchema>;
/**
 * Two-condition veto signal. The `validated` flag is the resolved
 * outcome; the cross-field rule PV-3 enforces consistency between
 * `validated` and the underlying agreement / reviewer-score thresholds.
 */
export declare const AsymmetricBlockerSignalSchema: import("@sinclair/typebox").TObject<{
    cross_validation: import("@sinclair/typebox").TObject<{
        validated: import("@sinclair/typebox").TBoolean;
        cross_model_agreement: import("@sinclair/typebox").TNumber;
        same_model_reviewer_score: import("@sinclair/typebox").TInteger;
    }>;
}>;
export type AsymmetricBlockerSignal = Static<typeof AsymmetricBlockerSignalSchema>;
export declare const PanelVerdictSchema: import("@sinclair/typebox").TObject<{
    verdict_id: import("@sinclair/typebox").TString;
    artifact_id: import("@sinclair/typebox").TString;
    bucket: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"HIGH_CONSENSUS">, import("@sinclair/typebox").TLiteral<"DISPUTED">, import("@sinclair/typebox").TLiteral<"LOW_VALUE">, import("@sinclair/typebox").TLiteral<"BLOCKER">]>;
    verdict: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proceed">, import("@sinclair/typebox").TLiteral<"defer">, import("@sinclair/typebox").TLiteral<"reject">, import("@sinclair/typebox").TLiteral<"low_value_pass">]>;
    juror_verdicts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        juror: import("@sinclair/typebox").TObject<{
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
        }>;
        vote: import("@sinclair/typebox").TObject<{
            voter_id: import("@sinclair/typebox").TString;
            vote: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agree">, import("@sinclair/typebox").TLiteral<"disagree">, import("@sinclair/typebox").TLiteral<"abstain">]>;
            result: import("@sinclair/typebox").TUnknown;
            confidence: import("@sinclair/typebox").TNumber;
            reasoning: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>;
        score: import("@sinclair/typebox").TInteger;
        voted_at: import("@sinclair/typebox").TString;
    }>>;
    asymmetric_blocker_signal: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        cross_validation: import("@sinclair/typebox").TObject<{
            validated: import("@sinclair/typebox").TBoolean;
            cross_model_agreement: import("@sinclair/typebox").TNumber;
            same_model_reviewer_score: import("@sinclair/typebox").TInteger;
        }>;
    }>>;
    signature: import("@sinclair/typebox").TString;
    signed_by: import("@sinclair/typebox").TString;
    signing_key_id: import("@sinclair/typebox").TString;
    signing_algorithm: import("@sinclair/typebox").TLiteral<"ed25519">;
    signed_at: import("@sinclair/typebox").TString;
    resolved_at: import("@sinclair/typebox").TString;
    signing_context: import("@sinclair/typebox").TObject<{
        audience: import("@sinclair/typebox").TString;
        scope: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>;
}>;
export type PanelVerdict = Static<typeof PanelVerdictSchema>;
//# sourceMappingURL=panel-verdict.d.ts.map