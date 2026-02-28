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
/** 24 hours in milliseconds — maximum future tolerance. */
const TWENTY_FOUR_HOURS_MS = 86_400_000;
/**
 * Strict ISO 8601 regex — rejects Date implementation-dependent formats.
 *
 * Accepts:
 * - 2026-02-28T12:00:00Z
 * - 2026-02-28T12:00:00.000Z
 * - 2026-02-28T12:00:00+05:30
 * - 2026-02-28T12:00:00-08:00
 *
 * Rejects:
 * - "Feb 28, 2026" (locale-dependent)
 * - "1234567890" (epoch timestamp)
 * - "" (empty string)
 * - "2026-02-28T12:00:00-0800" (missing colon in offset)
 */
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
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
export function validateAuditTimestamp(input, options) {
    // Check 1: Non-empty
    if (!input || input.length === 0) {
        return { valid: false, normalized: '', error: 'Timestamp must not be empty' };
    }
    // Check 2: Strict ISO 8601 format
    if (!ISO_8601_RE.test(input)) {
        return { valid: false, normalized: '', error: 'Timestamp must be strict ISO 8601 format' };
    }
    // Check 3: Parseable as Date
    const date = new Date(input);
    const epochMs = date.getTime();
    if (Number.isNaN(epochMs)) {
        return { valid: false, normalized: '', error: 'Timestamp is not a valid date' };
    }
    // Check 4: Not before Unix epoch
    if (epochMs < 0) {
        return { valid: false, normalized: '', error: 'Timestamp must not be before Unix epoch' };
    }
    // Check 5: Not more than 24h in the future
    const referenceNow = options?.now ?? Date.now();
    if (epochMs > referenceNow + TWENTY_FOUR_HOURS_MS) {
        return {
            valid: false,
            normalized: '',
            error: 'Timestamp must not be more than 24 hours in the future',
        };
    }
    return { valid: true, normalized: date.toISOString() };
}
//# sourceMappingURL=audit-timestamp.js.map