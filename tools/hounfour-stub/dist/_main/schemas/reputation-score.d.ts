import { type Static } from '@sinclair/typebox';
export declare const ReputationScoreSchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
    score: import("@sinclair/typebox").TNumber;
    components: import("@sinclair/typebox").TObject<{
        outcome_quality: import("@sinclair/typebox").TNumber;
        performance_consistency: import("@sinclair/typebox").TNumber;
        dispute_ratio: import("@sinclair/typebox").TNumber;
        community_standing: import("@sinclair/typebox").TNumber;
    }>;
    sample_size: import("@sinclair/typebox").TInteger;
    last_updated: import("@sinclair/typebox").TString;
    decay_applied: import("@sinclair/typebox").TBoolean;
    identity_anchor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        provider: import("@sinclair/typebox").TString;
        verified_at: import("@sinclair/typebox").TString;
    }>>;
    min_unique_validators: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    validation_graph_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ReputationScore = Static<typeof ReputationScoreSchema>;
//# sourceMappingURL=reputation-score.d.ts.map