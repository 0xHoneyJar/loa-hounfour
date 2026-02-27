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
 * Test-only ledger that accumulates debits and credits from domain events
 * and asserts the conservation invariant: credits never exceed debits.
 *
 * Event classification:
 * - `billing.entry.created` — debit (payload.amount_micro is positive)
 * - `billing.entry.voided` — credit (reversal of a prior billing entry)
 * - `economy.escrow.refunded` — credit (funds returned to payer)
 * - Escrow hold/release — no net ledger impact (funds already counted via billing)
 */
export class ProtocolLedger {
    _totalDebits = 0n;
    _totalCredits = 0n;
    /**
     * Record a domain event, updating debit/credit accumulators.
     *
     * Unrecognized event types are silently ignored — the ledger only tracks
     * events with known financial impact.
     */
    record(event) {
        switch (event.type) {
            case 'billing.entry.created': {
                const amount = this.extractAmount(event);
                if (amount > 0n) {
                    this._totalDebits += amount;
                }
                break;
            }
            case 'billing.entry.voided': {
                const amount = this.extractAmount(event);
                if (amount > 0n) {
                    this._totalCredits += amount;
                }
                break;
            }
            case 'economy.escrow.refunded': {
                const amount = this.extractAmount(event);
                if (amount > 0n) {
                    this._totalCredits += amount;
                }
                break;
            }
            // Escrow hold/release has no net ledger impact — funds already counted via billing.
            // Silently ignore all other event types.
            default:
                break;
        }
    }
    /**
     * Return the current trial balance snapshot.
     *
     * - `total_debits`: sum of all billing.entry.created amounts
     * - `total_credits`: sum of all billing.entry.voided + economy.escrow.refunded amounts
     * - `net`: total_debits - total_credits
     */
    trialBalance() {
        return {
            total_debits: this._totalDebits,
            total_credits: this._totalCredits,
            net: this._totalDebits - this._totalCredits,
        };
    }
    /**
     * Conservation invariant: credits must never exceed debits.
     *
     * Returns true when net >= 0 (the system has not over-credited).
     */
    isConserved() {
        return this._totalDebits >= this._totalCredits;
    }
    /**
     * Extract the amount_micro from an event payload, parsed as BigInt.
     *
     * Amount values in the protocol are string-typed MicroUSD (e.g., "1000000"),
     * but numeric and bigint types are also accepted for convenience in tests
     * and interop scenarios.
     *
     * Returns 0n if the payload does not contain a valid amount_micro.
     */
    extractAmount(event) {
        const raw = event.payload.amount_micro;
        if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) {
            return BigInt(raw);
        }
        if (typeof raw === 'bigint' && raw >= 0n) {
            return raw;
        }
        if (typeof raw === 'string' && /^[0-9]+$/.test(raw)) {
            return BigInt(raw);
        }
        return 0n;
    }
}
//# sourceMappingURL=protocol-ledger.js.map