import { type Static } from '@sinclair/typebox';
export declare const ValidatedOutcomeSchema: import("@sinclair/typebox").TObject<{
    validation_id: import("@sinclair/typebox").TString;
    performance_record_id: import("@sinclair/typebox").TString;
    validator_agent_id: import("@sinclair/typebox").TString;
    validator_stake_micro: import("@sinclair/typebox").TString;
    rating: import("@sinclair/typebox").TNumber;
    validated_at: import("@sinclair/typebox").TString;
    dispute_outcome: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"upheld">, import("@sinclair/typebox").TLiteral<"overturned">, import("@sinclair/typebox").TLiteral<"split">]>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ValidatedOutcome = Static<typeof ValidatedOutcomeSchema>;
//# sourceMappingURL=validated-outcome.d.ts.map