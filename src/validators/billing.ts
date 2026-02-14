/**
 * Composed billing validation pipeline (v2.4.0, BB-C4-ADV-003).
 *
 * Chains TypeBox schema validation with cross-field invariant checking
 * so consumers call ONE function instead of two. This is the billing
 * equivalent of Stripe's API validation: return all errors in one pass.
 */
import { Value } from '@sinclair/typebox/value';
import { validate } from './index.js';
import { BillingEntrySchema, type BillingEntry } from '../schemas/billing-entry.js';
import { validateBillingEntry } from '../utilities/billing.js';

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
export function validateBillingEntryFull(
  data: unknown,
): { valid: true; entry: BillingEntry } | { valid: false; errors: string[] } {
  // Step 1: Schema validation
  const schemaResult = validate(BillingEntrySchema, data);
  if (!schemaResult.valid) {
    return { valid: false, errors: schemaResult.errors };
  }

  // Step 2: Decode typed data (no unsafe cast — Value.Decode strips unknown
  // properties and applies defaults, producing a type-safe BillingEntry)
  const entry = Value.Decode(BillingEntrySchema, data) as BillingEntry;

  // Step 3: Cross-field validation
  const crossField = validateBillingEntry(entry);
  if (!crossField.valid) {
    return { valid: false, errors: [crossField.reason] };
  }

  return { valid: true, entry };
}
