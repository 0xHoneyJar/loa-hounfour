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
export declare function isNegotiationValid(negotiation: ContractNegotiation, clockTime: string): NegotiationValidityResult;
/**
 * Compute the expiry details for a ContractNegotiation.
 *
 * @param negotiation - The ContractNegotiation
 * @returns Object with negotiated_at, expires_at, and ttl_ms
 */
export declare function computeNegotiationExpiry(negotiation: ContractNegotiation): {
    negotiated_at: string;
    expires_at: string;
    ttl_ms: number;
};
//# sourceMappingURL=contract-negotiation-validity.d.ts.map