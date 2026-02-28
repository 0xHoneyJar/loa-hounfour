/**
 * Audit Timestamp Validation — boundary validation for audit trail timestamps.
 *
 * Validates ISO 8601 format, rejects pre-epoch and far-future timestamps.
 * Normalizes valid timestamps to canonical toISOString() form.
 *
 * Zero external dependencies — pure validation.
 *
 * Clock skew tolerance: 24h future window. Configurable reference time
 * via injectable `now` option for deterministic testing.
 *
 * @see PRD FR-5 — Audit Trail Domain Separation
 * @see SDD §5.2 — Audit Timestamp Validation
 * @since v8.3.0
 */
/**
 * Result of audit timestamp validation.
 */
export interface AuditTimestampResult {
    /** Whether the timestamp is valid. */
    valid: boolean;
    /** Normalized ISO 8601 timestamp (canonical toISOString() form). Empty string if invalid. */
    normalized: string;
    /** Error description if invalid. */
    error?: string;
}
/**
 * Validate and normalize an audit timestamp.
 *
 * Checks:
 * 1. Non-empty string
 * 2. Strict ISO 8601 format (regex pre-check)
 * 3. Parseable as Date (not NaN)
 * 4. Not before Unix epoch (epochMs >= 0)
 * 5. Not more than 24h in the future
 *
 * @param input - Timestamp string to validate
 * @param options - Optional configuration
 * @param options.now - Reference time in ms since epoch (defaults to Date.now())
 * @returns Validation result with normalized timestamp
 */
export declare function validateAuditTimestamp(input: string, options?: {
    now?: number;
}): AuditTimestampResult;
//# sourceMappingURL=audit-timestamp.d.ts.map