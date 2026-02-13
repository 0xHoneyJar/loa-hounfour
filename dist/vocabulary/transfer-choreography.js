/**
 * Expected event sequences for each transfer scenario.
 *
 * **sale**: Full lifecycle — initiate, seal conversations, transition agent,
 * create billing entry, complete saga.
 *
 * **gift**: Like sale but no billing entry (no financial transaction).
 *
 * **admin_recovery**: Administrative override — no conversation sealing
 * (admin has access to all data). Minimal ceremony.
 *
 * **custody_change**: Organizational custody transfer — seals conversations
 * but no billing (internal transfer).
 *
 * ### Compensation and Sealed Conversations
 *
 * Compensation paths do NOT unseal conversations. Sealed conversations remain
 * sealed after a rollback — this is intentional:
 *
 * 1. **Data integrity**: Unsealing requires decryption key re-derivation, which
 *    may not be possible if the key material was rotated during the transfer.
 * 2. **Audit trail**: The sealing event is part of the permanent event log.
 *    Unsealing would require a separate `conversation.thread.unsealed` event
 *    type (not yet defined in the vocabulary).
 * 3. **Admin override**: If conversations must be restored after a failed
 *    transfer, an admin can issue explicit unsealing through the admin_recovery
 *    scenario, which bypasses sealing entirely.
 *
 * This matches the Kubernetes pattern: a drained pod's data volumes are not
 * automatically re-mounted if the drain fails — recovery requires explicit action.
 */
export const TRANSFER_CHOREOGRAPHY = {
    sale: {
        forward: [
            'transfer.saga.initiated',
            'conversation.thread.sealed',
            'agent.lifecycle.transitioned', // → TRANSFERRED
            'billing.entry.created',
            'transfer.saga.completed',
        ],
        // Compensation: void billing, rollback lifecycle. Conversations remain sealed.
        compensation: [
            'billing.entry.voided',
            'agent.lifecycle.transitioned', // → ACTIVE (rollback)
            'transfer.saga.rolled_back',
        ],
    },
    gift: {
        forward: [
            'transfer.saga.initiated',
            'conversation.thread.sealed',
            'agent.lifecycle.transitioned', // → TRANSFERRED
            'transfer.saga.completed',
        ],
        // Compensation: rollback lifecycle. Conversations remain sealed.
        compensation: [
            'agent.lifecycle.transitioned', // → ACTIVE (rollback)
            'transfer.saga.rolled_back',
        ],
    },
    admin_recovery: {
        forward: [
            'transfer.saga.initiated',
            'agent.lifecycle.transitioned', // → TRANSFERRED
            'transfer.saga.completed',
        ],
        // Compensation: rollback lifecycle. No conversations were sealed (admin override).
        compensation: [
            'agent.lifecycle.transitioned', // → ACTIVE (rollback)
            'transfer.saga.rolled_back',
        ],
    },
    custody_change: {
        forward: [
            'transfer.saga.initiated',
            'conversation.thread.sealed',
            'agent.lifecycle.transitioned', // → TRANSFERRED
            'transfer.saga.completed',
        ],
        // Compensation: rollback lifecycle. Conversations remain sealed.
        compensation: [
            'agent.lifecycle.transitioned', // → ACTIVE (rollback)
            'transfer.saga.rolled_back',
        ],
    },
};
//# sourceMappingURL=transfer-choreography.js.map