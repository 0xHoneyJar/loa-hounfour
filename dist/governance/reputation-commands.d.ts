/**
 * Reputation command schemas (v7.1.0, FR-4).
 *
 * Commands are write-intent messages that drive state changes in the
 * ReputationAggregate. Each command carries a contract_version for
 * wire-format negotiation.
 *
 * @see SDD §2.5 — Reputation Commands
 */
import { type Static } from '@sinclair/typebox';
/** Command to ingest a quality observation into the reputation system. */
export declare const RecordQualityEventCommandSchema: import("@sinclair/typebox").TObject<{
    command_id: import("@sinclair/typebox").TString;
    quality_event: import("@sinclair/typebox").TObject<{
        event_id: import("@sinclair/typebox").TString;
        personality_id: import("@sinclair/typebox").TString;
        collection_id: import("@sinclair/typebox").TString;
        pool_id: import("@sinclair/typebox").TString;
        satisfaction: import("@sinclair/typebox").TNumber;
        coherence: import("@sinclair/typebox").TNumber;
        safety: import("@sinclair/typebox").TNumber;
        composite_score: import("@sinclair/typebox").TNumber;
        evaluator_id: import("@sinclair/typebox").TString;
        model_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        occurred_at: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
    }>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RecordQualityEventCommand = Static<typeof RecordQualityEventCommandSchema>;
/**
 * Command to query reputation aggregates for a personality in a pool.
 *
 * When `collection_id` is provided, queries a single aggregate (DDD identity
 * lookup by full composite key). When omitted, queries all aggregates for the
 * personality+pool pair across collections (set query).
 */
export declare const QueryReputationCommandSchema: import("@sinclair/typebox").TObject<{
    command_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    pool_id: import("@sinclair/typebox").TString;
    model_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    include_history: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type QueryReputationCommand = Static<typeof QueryReputationCommandSchema>;
/** Command to reset a reputation aggregate back to cold state. */
export declare const ResetReputationCommandSchema: import("@sinclair/typebox").TObject<{
    command_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TString;
    actor: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ResetReputationCommand = Static<typeof ResetReputationCommandSchema>;
//# sourceMappingURL=reputation-commands.d.ts.map