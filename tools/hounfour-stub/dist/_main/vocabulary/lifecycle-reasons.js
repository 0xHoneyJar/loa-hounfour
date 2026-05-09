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
export const LIFECYCLE_REASON_CODES = {
    owner_requested: 'Owner explicitly requested state change',
    budget_exhausted: 'Agent budget limit reached',
    inactivity_timeout: 'No activity within configured timeout',
    transfer_initiated: 'NFT ownership transfer in progress',
    transfer_completed: 'NFT ownership transfer completed',
    admin_action: 'Administrative action by platform operator',
    provisioning_complete: 'Agent provisioning finished successfully',
    provisioning_failed: 'Agent provisioning encountered an error',
    policy_violation: 'Agent violated platform policy',
    system_maintenance: 'Scheduled system maintenance',
    sanction_warning_issued: 'Sanction warning issued to agent',
    sanction_rate_limited: 'Agent rate-limited due to sanction',
    sanction_pool_restricted: 'Agent pool access restricted due to sanction',
    sanction_suspended: 'Agent suspended due to sanction',
    sanction_terminated: 'Agent terminated due to sanction',
    sanction_appealed_successfully: 'Sanction appeal upheld — restriction lifted',
};
/** All valid reason code values. */
export const LIFECYCLE_REASON_CODE_VALUES = Object.keys(LIFECYCLE_REASON_CODES);
//# sourceMappingURL=lifecycle-reasons.js.map