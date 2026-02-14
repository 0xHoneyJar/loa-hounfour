import type { BillingEntry, BillingRecipient, CreditNote } from '../schemas/billing-entry.js';

/**
 * Validate that billing recipients satisfy invariants:
 * - share_bps must sum to 10000
 * - amount_micro must sum to totalCostMicro
 */
export function validateBillingRecipients(
  recipients: BillingRecipient[],
  totalCostMicro: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const bpsSum = recipients.reduce((acc, r) => acc + r.share_bps, 0);
  if (bpsSum !== 10000) {
    errors.push(`share_bps sum ${bpsSum} !== 10000`);
  }

  const amountSum = recipients.reduce((acc, r) => acc + BigInt(r.amount_micro), 0n);
  if (amountSum !== BigInt(totalCostMicro)) {
    errors.push(`amount_micro sum ${amountSum} !== ${totalCostMicro}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all cross-field invariants of a BillingEntry:
 *
 * 1. `total_cost_micro === raw_cost_micro * multiplier_bps / 10000` (BigInt arithmetic)
 * 2. Recipients `share_bps` sums to 10000 (delegates to `validateBillingRecipients`)
 * 3. Recipients `amount_micro` sums to `total_cost_micro`
 *
 * This completes the defense-in-depth picture alongside `validateBillingRecipients()`
 * and `validateSealingPolicy()`.
 *
 * @see BB-POST-001 — Billing multiplier cross-field gap
 */
export function validateBillingEntry(
  entry: BillingEntry,
): { valid: true } | { valid: false; reason: string } {
  // Check multiplier invariant: total = raw * multiplier / 10000
  const raw = BigInt(entry.raw_cost_micro);
  const multiplier = BigInt(entry.multiplier_bps);
  const expectedTotal = (raw * multiplier) / 10000n;
  const actualTotal = BigInt(entry.total_cost_micro);

  if (actualTotal !== expectedTotal) {
    return {
      valid: false,
      reason: `total_cost_micro (${entry.total_cost_micro}) !== raw_cost_micro (${entry.raw_cost_micro}) * multiplier_bps (${entry.multiplier_bps}) / 10000 (expected ${String(expectedTotal)})`,
    };
  }

  // Delegate recipient validation
  const recipientResult = validateBillingRecipients(entry.recipients, entry.total_cost_micro);
  if (!recipientResult.valid) {
    return { valid: false, reason: recipientResult.errors.join('; ') };
  }

  return { valid: true };
}

/**
 * Validate cross-field invariants for a CreditNote.
 *
 * Invariants (BB-ADV-003):
 * 1. `amount_micro` must not be zero
 * 2. `issued_at` must be a valid date-time string
 * 3. Recipient `share_bps` must sum to 10000
 * 4. Recipient `amount_micro` must sum to `amount_micro`
 *
 * Service-layer invariants NOT checked here (require external state):
 * - `amount_micro <= referenced BillingEntry.total_cost_micro`
 * - `references_billing_entry` must reference a valid, existing entry
 * - Sum of all CreditNotes for a single entry must not exceed that entry's total
 *
 * @see BB-ADV-003 — CreditNote invariant documentation
 * @since v3.2.0
 */
export function validateCreditNote(
  note: CreditNote,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check amount is non-zero
  if (BigInt(note.amount_micro) === 0n) {
    errors.push('amount_micro must not be zero');
  }

  // Check recipient invariants
  const recipientResult = validateBillingRecipients(note.recipients, note.amount_micro);
  if (!recipientResult.valid) {
    errors.push(...recipientResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deterministic largest-remainder allocation.
 *
 * Input convention: callers provide share_bps only. This function computes
 * amount_micro such that the sum equals totalCostMicro exactly (zero dust).
 *
 * Tie-breaking: when two recipients have equal remainders, the one appearing
 * first in the input array receives the extra micro-unit.
 *
 * @param recipients - Array of { address, role, share_bps }
 * @param totalCostMicro - String-encoded total cost in micro-USD
 * @returns Fully populated BillingRecipient[] with computed amount_micro
 */
export function allocateRecipients(
  recipients: ReadonlyArray<{ address: string; role: string; share_bps: number }>,
  totalCostMicro: string,
): BillingRecipient[] {
  if (recipients.length === 0) {
    throw new Error('recipients must not be empty');
  }

  const bpsSum = recipients.reduce((acc, r) => acc + r.share_bps, 0);
  if (bpsSum !== 10000) {
    throw new Error(`share_bps must sum to 10000, got ${bpsSum}`);
  }

  const total = BigInt(totalCostMicro);
  if (total < 0n) {
    throw new Error('totalCostMicro must be non-negative');
  }

  // Step 1: Compute truncated shares and track remainders
  const allocated = recipients.map((r, index) => {
    const product = total * BigInt(r.share_bps);
    const truncated = product / 10000n;
    const remainder = Number(product % 10000n);
    return {
      address: r.address,
      role: r.role as BillingRecipient['role'],
      share_bps: r.share_bps,
      amount_micro: truncated,
      remainder,
      index,
    };
  });

  // Step 2: Distribute remainder to largest remainders (stable sort by index for ties)
  const currentSum = allocated.reduce((acc, r) => acc + r.amount_micro, 0n);
  let remaining = total - currentSum;

  const sorted = [...allocated].sort((a, b) =>
    b.remainder !== a.remainder ? b.remainder - a.remainder : a.index - b.index,
  );

  for (const r of sorted) {
    if (remaining <= 0n) break;
    r.amount_micro += 1n;
    remaining -= 1n;
  }

  return allocated.map(({ amount_micro, address, role, share_bps }) => ({
    address,
    role,
    share_bps,
    amount_micro: String(amount_micro),
  }));
}
