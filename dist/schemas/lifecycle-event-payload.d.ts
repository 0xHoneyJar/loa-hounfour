import { type Static } from '@sinclair/typebox';
import type { DomainEvent } from './domain-event.js';
/**
 * Typed payload for lifecycle transition events.
 *
 * Captures the transition details including a mandatory reason field.
 * Kubernetes tracks reason and message on pod condition changes, making
 * production debugging enormously easier. "Why did this agent go SUSPENDED?"
 * should be answerable from the event stream.
 *
 * v2.2.0 adds `reason_code` — machine-readable Kubernetes-style reason codes
 * for filtering and monitoring. `reason` remains required for human context.
 */
export declare const LifecycleTransitionPayloadSchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
    previous_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"DORMANT">, import("@sinclair/typebox").TLiteral<"PROVISIONING">, import("@sinclair/typebox").TLiteral<"ACTIVE">, import("@sinclair/typebox").TLiteral<"SUSPENDED">, import("@sinclair/typebox").TLiteral<"TRANSFERRED">, import("@sinclair/typebox").TLiteral<"ARCHIVED">]>;
    new_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"DORMANT">, import("@sinclair/typebox").TLiteral<"PROVISIONING">, import("@sinclair/typebox").TLiteral<"ACTIVE">, import("@sinclair/typebox").TLiteral<"SUSPENDED">, import("@sinclair/typebox").TLiteral<"TRANSFERRED">, import("@sinclair/typebox").TLiteral<"ARCHIVED">]>;
    reason: import("@sinclair/typebox").TString;
    reason_code: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"transfer_completed" | "owner_requested" | "budget_exhausted" | "inactivity_timeout" | "transfer_initiated" | "admin_action" | "provisioning_complete" | "provisioning_failed" | "policy_violation" | "system_maintenance">[]>>;
    triggered_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    transfer_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type LifecycleTransitionPayload = Static<typeof LifecycleTransitionPayloadSchema>;
/** Convenience type: a DomainEvent whose payload is a LifecycleTransitionPayload. */
export type LifecycleTransitionEvent = DomainEvent<LifecycleTransitionPayload>;
//# sourceMappingURL=lifecycle-event-payload.d.ts.map