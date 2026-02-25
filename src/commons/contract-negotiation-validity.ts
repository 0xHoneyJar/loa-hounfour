/**
 * ContractNegotiation TTL validation utilities.
 *
 * Provides clock-authority-aware validity checking for ContractNegotiation
 * instances. The schema declares expires_at but the protocol needs a
 * programmatic check to enforce it.
 *
 * @see Bridgebuilder Finding F9 — TTL declared but no clock authority
 * @since v8.1.0
 */
import type { ContractNegotiation } from './contract-negotiation.js';

/**
 * Result of checking a contract negotiation's validity.
 */
export interface NegotiationValidityResult {
  /** Whether the negotiation is currently valid. */
  valid: boolean;
  /** Remaining TTL in milliseconds (0 if expired, undefined if no expiry). */
  remaining_ms?: number;
  /** Human-readable reason. */
  reason: string;
}

/**
 * Check whether a ContractNegotiation is still valid at a given time.
 *
 * The clock time is explicitly provided (not implicitly read from Date.now())
 * because the protocol must not depend on wall-clock assumptions. The caller
 * provides the authoritative timestamp.
 *
 * @param negotiation - The ContractNegotiation to check
 * @param clockTime - The authoritative current time (ISO 8601 string)
 * @returns Validity result with remaining TTL
 */
export function isNegotiationValid(
  negotiation: ContractNegotiation,
  clockTime: string,
): NegotiationValidityResult {
  const expiresMs = new Date(negotiation.expires_at).getTime();
  const clockMs = new Date(clockTime).getTime();

  if (Number.isNaN(expiresMs)) {
    return {
      valid: false,
      reason: `Invalid expires_at: ${negotiation.expires_at}`,
    };
  }

  if (Number.isNaN(clockMs)) {
    return {
      valid: false,
      reason: `Invalid clock time: ${clockTime}`,
    };
  }

  const remainingMs = expiresMs - clockMs;

  if (remainingMs <= 0) {
    return {
      valid: false,
      remaining_ms: 0,
      reason: `Negotiation expired at ${negotiation.expires_at} (${Math.abs(remainingMs)}ms ago)`,
    };
  }

  return {
    valid: true,
    remaining_ms: remainingMs,
    reason: `Negotiation valid until ${negotiation.expires_at} (${remainingMs}ms remaining)`,
  };
}

/**
 * Compute the expiry details for a ContractNegotiation.
 *
 * @param negotiation - The ContractNegotiation
 * @returns Object with negotiated_at, expires_at, and ttl_ms
 */
export function computeNegotiationExpiry(
  negotiation: ContractNegotiation,
): { negotiated_at: string; expires_at: string; ttl_ms: number } {
  const negotiatedMs = new Date(negotiation.negotiated_at).getTime();
  const expiresMs = new Date(negotiation.expires_at).getTime();

  if (Number.isNaN(negotiatedMs) || Number.isNaN(expiresMs)) {
    return {
      negotiated_at: negotiation.negotiated_at,
      expires_at: negotiation.expires_at,
      ttl_ms: NaN,
    };
  }

  return {
    negotiated_at: negotiation.negotiated_at,
    expires_at: negotiation.expires_at,
    ttl_ms: expiresMs - negotiatedMs,
  };
}
