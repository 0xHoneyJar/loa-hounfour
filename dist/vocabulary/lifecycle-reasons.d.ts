/**
 * Canonical lifecycle transition reason codes.
 *
 * Kubernetes PodCondition uses PascalCase reason codes that dashboards filter by,
 * plus freeform message text for humans. We follow the same pattern:
 * `reason_code` is machine-readable, `reason` is human-readable.
 *
 * @see BB-V3-009 — Structured reason codes on lifecycle events
 */
/** Canonical reason codes for agent lifecycle transitions. */
export declare const LIFECYCLE_REASON_CODES: {
    readonly owner_requested: "Owner explicitly requested state change";
    readonly budget_exhausted: "Agent budget limit reached";
    readonly inactivity_timeout: "No activity within configured timeout";
    readonly transfer_initiated: "NFT ownership transfer in progress";
    readonly transfer_completed: "NFT ownership transfer completed";
    readonly admin_action: "Administrative action by platform operator";
    readonly provisioning_complete: "Agent provisioning finished successfully";
    readonly provisioning_failed: "Agent provisioning encountered an error";
    readonly policy_violation: "Agent violated platform policy";
    readonly system_maintenance: "Scheduled system maintenance";
};
/** Machine-readable lifecycle transition reason code. */
export type LifecycleReasonCode = keyof typeof LIFECYCLE_REASON_CODES;
/** All valid reason code values. */
export declare const LIFECYCLE_REASON_CODE_VALUES: LifecycleReasonCode[];
//# sourceMappingURL=lifecycle-reasons.d.ts.map