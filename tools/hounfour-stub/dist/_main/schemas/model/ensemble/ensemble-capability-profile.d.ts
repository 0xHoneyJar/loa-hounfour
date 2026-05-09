/**
 * Ensemble capability profile — collective capability declaration for model ensembles.
 *
 * v5.4.0 — FR-5: Models the "patchwork AGI hypothesis" from Tomasev et al.
 * (arXiv:2512.16856): the combination of individually limited models can produce
 * emergent capabilities that no single model possesses.
 *
 * @see "Distributional AGI Safety" (arXiv:2512.16856) — patchwork AGI hypothesis
 * @see EnsembleStrategySchema — reused coordination strategy enum
 */
import { type Static } from '@sinclair/typebox';
export declare const CapabilityEvidenceSchema: import("@sinclair/typebox").TObject<{
    capability: import("@sinclair/typebox").TString;
    evidence_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tested">, import("@sinclair/typebox").TLiteral<"theoretical">, import("@sinclair/typebox").TLiteral<"observed">]>;
    vector_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type CapabilityEvidence = Static<typeof CapabilityEvidenceSchema>;
export declare const SafetyProfileSchema: import("@sinclair/typebox").TObject<{
    max_autonomy_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supervised">, import("@sinclair/typebox").TLiteral<"semi_autonomous">, import("@sinclair/typebox").TLiteral<"autonomous">]>;
    requires_human_approval: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    monitoring_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type SafetyProfile = Static<typeof SafetyProfileSchema>;
export declare const EnsembleCapabilityProfileSchema: import("@sinclair/typebox").TObject<{
    profile_id: import("@sinclair/typebox").TString;
    ensemble_strategy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"dialogue">]>;
    models: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    individual_capabilities: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    emergent_capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    capability_evidence: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        capability: import("@sinclair/typebox").TString;
        evidence_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"tested">, import("@sinclair/typebox").TLiteral<"theoretical">, import("@sinclair/typebox").TLiteral<"observed">]>;
        vector_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    safety_profile: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        max_autonomy_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"supervised">, import("@sinclair/typebox").TLiteral<"semi_autonomous">, import("@sinclair/typebox").TLiteral<"autonomous">]>;
        requires_human_approval: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        monitoring_requirements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>>;
    contract_version: import("@sinclair/typebox").TString;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type EnsembleCapabilityProfile = Static<typeof EnsembleCapabilityProfileSchema>;
//# sourceMappingURL=ensemble-capability-profile.d.ts.map