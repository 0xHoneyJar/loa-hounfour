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
        compensation: [
            'agent.lifecycle.transitioned', // → ACTIVE (rollback)
            'transfer.saga.rolled_back',
        ],
    },
};
//# sourceMappingURL=transfer-choreography.js.map