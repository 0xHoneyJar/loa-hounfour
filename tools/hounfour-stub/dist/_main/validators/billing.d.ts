import { type BillingEntry } from '../schemas/billing-entry.js';
/**
 * Full billing entry validation pipeline.
 *
 * 1. TypeBox schema validation (field presence, types, formats, patterns)
 * 2. Cross-field invariant check (`total_cost_micro === raw * multiplier / 10000`)
 * 3. Recipient invariants (share_bps sums to 10000, amount_micro sums to total)
 *
 * Uses Value.Decode to extract typed data from schema validation, avoiding
 * unsafe `as` casts (BB-C5-003).
 *
 * @param data - Unknown data to validate as a BillingEntry
 * @returns Typed BillingEntry on success, or error array on failure
 */
export declare function validateBillingEntryFull(data: unknown): {
    valid: true;
    entry: BillingEntry;
} | {
    valid: false;
    errors: string[];
};
//# sourceMappingURL=billing.d.ts.map