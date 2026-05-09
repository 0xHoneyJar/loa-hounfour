import { type Static } from '@sinclair/typebox';
export declare const PerformanceOutcomeSchema: import("@sinclair/typebox").TObject<{
    user_rating: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    resolution_signal: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    amplification_count: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    outcome_validated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    validated_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type PerformanceOutcome = Static<typeof PerformanceOutcomeSchema>;
export declare const PerformanceRecordSchema: import("@sinclair/typebox").TObject<{
    record_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    billing_entry_id: import("@sinclair/typebox").TString;
    occurred_at: import("@sinclair/typebox").TString;
    output: import("@sinclair/typebox").TObject<{
        tokens_consumed: import("@sinclair/typebox").TInteger;
        model_used: import("@sinclair/typebox").TString;
    }>;
    outcome: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        user_rating: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        resolution_signal: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        amplification_count: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        outcome_validated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        validated_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>>;
    dividend_target: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"commons">, import("@sinclair/typebox").TLiteral<"mixed">]>>;
    dividend_split_bps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type PerformanceRecord = Static<typeof PerformanceRecordSchema>;
//# sourceMappingURL=performance-record.d.ts.map