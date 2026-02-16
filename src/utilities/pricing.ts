/**
 * Pricing computation utilities for the Protocol Constitution.
 *
 * Implements SDD §4.1 (computeCostMicro) and §4.2 (conservation invariant).
 *
 * All arithmetic uses BigInt to prevent floating-point precision loss.
 * Ceil rounding via `(a + b - 1n) / b` — same as AWS/Stripe metered billing.
 */

const MILLION = 1_000_000n;
const UNSIGNED_PATTERN = /^[0-9]+$/;
const SIGNED_PATTERN = /^-?[0-9]+$/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PricingInput {
  input_per_million_micro: string;
  output_per_million_micro: string;
  thinking_per_million_micro?: string;
}

export interface UsageInput {
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens?: number;
}

export interface ConservationResult {
  conserved: boolean;
  delta: string;
  computed: string;
}

// ---------------------------------------------------------------------------
// computeCostMicro — Pure function (SDD §4.1)
// ---------------------------------------------------------------------------

/**
 * Compute the total cost in micro-USD given pricing rates and token usage.
 *
 * Uses BigInt-only arithmetic with ceil rounding. No intermediate rounding —
 * sum computed before single division to prevent error accumulation.
 *
 * @throws {TypeError} Invalid pricing string, negative/NaN/non-integer tokens,
 *   or tokens exceeding MAX_SAFE_INTEGER.
 */
export function computeCostMicro(
  pricing: PricingInput,
  usage: UsageInput,
): string {
  // Validate pricing strings
  const inputRate = validatePricingString(pricing.input_per_million_micro, 'input_per_million_micro');
  const outputRate = validatePricingString(pricing.output_per_million_micro, 'output_per_million_micro');
  const thinkingRate = pricing.thinking_per_million_micro !== undefined
    ? validatePricingString(pricing.thinking_per_million_micro, 'thinking_per_million_micro')
    : 0n;

  // Validate token counts
  const promptTokens = validateTokenCount(usage.prompt_tokens, 'prompt_tokens');
  const completionTokens = validateTokenCount(usage.completion_tokens, 'completion_tokens');
  const reasoningTokens = usage.reasoning_tokens !== undefined
    ? validateTokenCount(usage.reasoning_tokens, 'reasoning_tokens')
    : 0n;

  // Compute sum before division to prevent error accumulation
  const totalNumerator =
    inputRate * promptTokens +
    outputRate * completionTokens +
    thinkingRate * reasoningTokens;

  // Zero special case
  if (totalNumerator === 0n) return '0';

  // Ceil division: (a + b - 1) / b
  const cost = (totalNumerator + MILLION - 1n) / MILLION;

  return cost.toString();
}

/**
 * Safe variant of computeCostMicro — returns discriminated union instead of throwing.
 *
 * Use at untrusted boundaries (API handlers, user input).
 */
export function computeCostMicroSafe(
  pricing: PricingInput,
  usage: UsageInput,
): { ok: true; cost: string } | { ok: false; error: string } {
  try {
    const cost = computeCostMicro(pricing, usage);
    return { ok: true, cost };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// verifyPricingConservation — Conservation invariant (SDD §4.2)
// ---------------------------------------------------------------------------

/**
 * Verify that a billing entry's cost matches the computed cost from pricing and usage.
 *
 * Conservation holds when `reconciliation_mode === 'protocol_authoritative'`.
 * For `provider_invoice_authoritative`, delta captures the discrepancy.
 */
export function verifyPricingConservation(
  billing: { cost_micro: string; pricing_snapshot?: PricingInput },
  usage: UsageInput,
): ConservationResult {
  if (!billing.pricing_snapshot) {
    return {
      conserved: false,
      delta: '0',
      computed: '0',
    };
  }

  const computed = computeCostMicro(billing.pricing_snapshot, usage);
  const billedBig = parseMicroUSD(billing.cost_micro);
  const computedBig = BigInt(computed);
  const delta = billedBig - computedBig;

  return {
    conserved: delta === 0n,
    delta: delta.toString(),
    computed,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validatePricingString(value: string, label: string): bigint {
  if (!UNSIGNED_PATTERN.test(value)) {
    throw new TypeError(`Invalid pricing string for ${label}: must match ^[0-9]+$`);
  }
  return BigInt(value);
}

function validateTokenCount(value: number, label: string): bigint {
  if (!Number.isInteger(value) || Number.isNaN(value)) {
    throw new TypeError(`Invalid token count for ${label}: must be a non-negative integer`);
  }
  if (value < 0) {
    throw new TypeError(`Invalid token count for ${label}: must be non-negative`);
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new TypeError(`Token count exceeds safe integer range for ${label}`);
  }
  return BigInt(value);
}

function parseMicroUSD(value: string): bigint {
  if (!SIGNED_PATTERN.test(value)) {
    throw new TypeError(`Invalid MicroUSD string: must match ^-?[0-9]+$`);
  }
  return BigInt(value);
}
