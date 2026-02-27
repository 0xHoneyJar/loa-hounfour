/**
 * ProtocolLedger — Test infrastructure for economic conservation testing.
 *
 * Tracks billing debits/credits and escrow flows. Verifies the trial balance
 * invariant: credits must never exceed debits (net >= 0).
 *
 * All arithmetic uses BigInt to prevent floating-point precision loss.
 * Amount values are string-typed MicroUSD (e.g., "1000000") parsed with BigInt().
 *
 * @see S6-T2 — L3 Economic layer test infrastructure
 */
/**
 * Minimal domain event shape accepted by the ledger.
 *
 * Mirrors the DomainEvent envelope but only requires the fields the ledger
 * needs for classification and amount extraction.
 */
export interface LedgerEvent {
    readonly event_id: string;
    readonly type: string;
    readonly aggregate_type: string;
    readonly payload: Record<string, unknown>;
}
export interface TrialBalance {
    readonly total_debits: bigint;
    readonly total_credits: bigint;
    readonly net: bigint;
}
/**
 * Test-only ledger that accumulates debits and credits from domain events
 * and asserts the conservation invariant: credits never exceed debits.
 *
 * Event classification:
 * - `billing.entry.created` — debit (payload.amount_micro is positive)
 * - `billing.entry.voided` — credit (reversal of a prior billing entry)
 * - `economy.escrow.refunded` — credit (funds returned to payer)
 * - Escrow hold/release — no net ledger impact (funds already counted via billing)
 */
export declare class ProtocolLedger {
    private _totalDebits;
    private _totalCredits;
    /**
     * Record a domain event, updating debit/credit accumulators.
     *
     * Unrecognized event types are silently ignored — the ledger only tracks
     * events with known financial impact.
     */
    record(event: LedgerEvent): void;
    /**
     * Return the current trial balance snapshot.
     *
     * - `total_debits`: sum of all billing.entry.created amounts
     * - `total_credits`: sum of all billing.entry.voided + economy.escrow.refunded amounts
     * - `net`: total_debits - total_credits
     */
    trialBalance(): TrialBalance;
    /**
     * Conservation invariant: credits must never exceed debits.
     *
     * Returns true when net >= 0 (the system has not over-credited).
     */
    isConserved(): boolean;
    /**
     * Extract the amount_micro from an event payload, parsed as BigInt.
     *
     * Amount values in the protocol are string-typed MicroUSD (e.g., "1000000"),
     * but numeric and bigint types are also accepted for convenience in tests
     * and interop scenarios.
     *
     * Returns 0n if the payload does not contain a valid amount_micro.
     */
    private extractAmount;
}
//# sourceMappingURL=protocol-ledger.d.ts.map