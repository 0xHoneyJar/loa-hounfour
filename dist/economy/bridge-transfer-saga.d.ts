/**
 * Bridge Transfer Saga — coordination protocol for cross-registry value transfer.
 *
 * Implements the saga pattern for multi-step bridge transfers with
 * compensation semantics, timeout handling, and participant tracking.
 *
 * @see SDD §2.2 — BridgeTransferSaga Schema
 * @since v7.0.0
 */
import { type Static } from '@sinclair/typebox';
/** @governance protocol-fixed */
export declare const SagaStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"initiated">, import("@sinclair/typebox").TLiteral<"reserving">, import("@sinclair/typebox").TLiteral<"transferring">, import("@sinclair/typebox").TLiteral<"settling">, import("@sinclair/typebox").TLiteral<"settled">, import("@sinclair/typebox").TLiteral<"compensating">, import("@sinclair/typebox").TLiteral<"reversed">, import("@sinclair/typebox").TLiteral<"failed">]>;
export type SagaStatus = Static<typeof SagaStatusSchema>;
/**
 * Saga state machine transitions.
 * Terminal states (settled, reversed, failed) have no outbound transitions.
 */
export declare const SAGA_TRANSITIONS: Record<SagaStatus, readonly SagaStatus[]>;
export declare const StepTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"reserve">, import("@sinclair/typebox").TLiteral<"validate">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"confirm">, import("@sinclair/typebox").TLiteral<"settle">]>;
export type StepType = Static<typeof StepTypeSchema>;
export declare const StepStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"in_progress">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"compensated">]>;
export type StepStatus = Static<typeof StepStatusSchema>;
export declare const BridgeTransferStepSchema: import("@sinclair/typebox").TObject<{
    step_id: import("@sinclair/typebox").TString;
    step_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"reserve">, import("@sinclair/typebox").TLiteral<"validate">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"confirm">, import("@sinclair/typebox").TLiteral<"settle">]>;
    participant: import("@sinclair/typebox").TString;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"in_progress">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"compensated">]>;
    amount_micro: import("@sinclair/typebox").TString;
    exchange_rate: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        rate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed">, import("@sinclair/typebox").TLiteral<"oracle">, import("@sinclair/typebox").TLiteral<"governance">]>;
        value: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        oracle_endpoint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        governance_proposal_required: import("@sinclair/typebox").TBoolean;
        staleness_threshold_seconds: import("@sinclair/typebox").TInteger;
    }>>;
    started_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    completed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type BridgeTransferStep = Static<typeof BridgeTransferStepSchema>;
export declare const ParticipantRoleSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"initiator">, import("@sinclair/typebox").TLiteral<"counterparty">, import("@sinclair/typebox").TLiteral<"observer">, import("@sinclair/typebox").TLiteral<"arbiter">]>;
export type ParticipantRole = Static<typeof ParticipantRoleSchema>;
export declare const SagaParticipantSchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
    role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"initiator">, import("@sinclair/typebox").TLiteral<"counterparty">, import("@sinclair/typebox").TLiteral<"observer">, import("@sinclair/typebox").TLiteral<"arbiter">]>;
    registry_id: import("@sinclair/typebox").TString;
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
    }>;
}>;
export type SagaParticipant = Static<typeof SagaParticipantSchema>;
export declare const SagaErrorSchema: import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    failed_step_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    recoverable: import("@sinclair/typebox").TBoolean;
}>;
export type SagaError = Static<typeof SagaErrorSchema>;
export declare const BridgeTransferSagaSchema: import("@sinclair/typebox").TObject<{
    saga_id: import("@sinclair/typebox").TString;
    bridge_id: import("@sinclair/typebox").TString;
    source_registry: import("@sinclair/typebox").TString;
    target_registry: import("@sinclair/typebox").TString;
    saga_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"atomic">, import("@sinclair/typebox").TLiteral<"choreography">]>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"initiated">, import("@sinclair/typebox").TLiteral<"reserving">, import("@sinclair/typebox").TLiteral<"transferring">, import("@sinclair/typebox").TLiteral<"settling">, import("@sinclair/typebox").TLiteral<"settled">, import("@sinclair/typebox").TLiteral<"compensating">, import("@sinclair/typebox").TLiteral<"reversed">, import("@sinclair/typebox").TLiteral<"failed">]>;
    steps: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        step_id: import("@sinclair/typebox").TString;
        step_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"reserve">, import("@sinclair/typebox").TLiteral<"validate">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"confirm">, import("@sinclair/typebox").TLiteral<"settle">]>;
        participant: import("@sinclair/typebox").TString;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"in_progress">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"compensated">]>;
        amount_micro: import("@sinclair/typebox").TString;
        exchange_rate: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            rate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed">, import("@sinclair/typebox").TLiteral<"oracle">, import("@sinclair/typebox").TLiteral<"governance">]>;
            value: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            oracle_endpoint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            governance_proposal_required: import("@sinclair/typebox").TBoolean;
            staleness_threshold_seconds: import("@sinclair/typebox").TInteger;
        }>>;
        started_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        completed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    compensation_steps: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        step_id: import("@sinclair/typebox").TString;
        step_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"reserve">, import("@sinclair/typebox").TLiteral<"validate">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"confirm">, import("@sinclair/typebox").TLiteral<"settle">]>;
        participant: import("@sinclair/typebox").TString;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"in_progress">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"compensated">]>;
        amount_micro: import("@sinclair/typebox").TString;
        exchange_rate: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            rate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"fixed">, import("@sinclair/typebox").TLiteral<"oracle">, import("@sinclair/typebox").TLiteral<"governance">]>;
            value: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            oracle_endpoint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            governance_proposal_required: import("@sinclair/typebox").TBoolean;
            staleness_threshold_seconds: import("@sinclair/typebox").TInteger;
        }>>;
        started_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        completed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    timeout: import("@sinclair/typebox").TObject<{
        total_seconds: import("@sinclair/typebox").TInteger;
        per_step_seconds: import("@sinclair/typebox").TInteger;
    }>;
    participants: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        role: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"initiator">, import("@sinclair/typebox").TLiteral<"counterparty">, import("@sinclair/typebox").TLiteral<"observer">, import("@sinclair/typebox").TLiteral<"arbiter">]>;
        registry_id: import("@sinclair/typebox").TString;
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
        }>;
    }>>;
    initiated_at: import("@sinclair/typebox").TString;
    settled_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        error_code: import("@sinclair/typebox").TString;
        message: import("@sinclair/typebox").TString;
        failed_step_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        recoverable: import("@sinclair/typebox").TBoolean;
    }>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type BridgeTransferSaga = Static<typeof BridgeTransferSagaSchema>;
//# sourceMappingURL=bridge-transfer-saga.d.ts.map