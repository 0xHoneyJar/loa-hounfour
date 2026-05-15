/**
 * Audit event-type namespace specification for AuditEntry consumers.
 *
 * AuditEntry.event_type is an open dotted-string. This file documents the
 * 3-segment namespace pattern that consumers SHOULD follow when minting
 * new event types, and exports an informational soft registry of known
 * prefixes seen in the wild.
 *
 * Hounfour does NOT register or arbitrate consumer namespaces. Uniqueness
 * across organizations is a structural property of the 3-segment format,
 * not an enforcement Hounfour performs at validation time.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see docs/architecture/hashing-spec-freeze-v8.5.md — for hash-domain interaction
 * @since v8.5.0
 */
/**
 * Informational soft registry of known event-type prefixes, recorded
 * for discoverability only. Entries here are NOT validated against
 * `AuditEntry.event_type`; Hounfour treats them as documentation.
 *
 * Consumers SHOULD register their `<github-org>:<consumer>:` prefix
 * by adding an entry here in a follow-up PR. Absence of an entry is
 * not a rejection — uniqueness is a structural property of the
 * 3-segment format, not a registration gate.
 *
 * **Conventional event-type vocabulary by prefix** (informational —
 * not enforced by Hounfour; consumers MAY mint additional types
 * under their own prefix, and the listed types are the recall-wedge
 * lifecycle the prefix's owning consumer is expected to honor):
 *
 * - `0xhoneyjar:straylight:` — Recall Wedge composition over the
 *   v8.5.0 PR-A2.3 surface + v8.6.0 PR-A3.7 Challenge layer. See
 *   `docs/architecture/recall-wedge-composition.md`. Conventional
 *   event types under this prefix:
 *     - `0xhoneyjar:straylight:assertion.admitted`
 *     - `0xhoneyjar:straylight:assertion.challenged`
 *     - `0xhoneyjar:straylight:assertion.revoked`
 *     - `0xhoneyjar:straylight:assertion.forgotten`
 *     - `0xhoneyjar:straylight:estate.transition.applied`
 *     - `0xhoneyjar:straylight:recall.request.received`
 *     - `0xhoneyjar:straylight:recall.pack.assembled`
 *     - `0xhoneyjar:straylight:recall.receipt.signed`
 *     - `0xhoneyjar:straylight:commitment.anchored`
 */
export declare const AUDIT_EVENT_TYPES_KNOWN_PREFIXES: readonly string[];
/**
 * Test whether an `AuditEntry.event_type` string follows the 3-segment
 * namespace shape `<github-org>:<consumer>:<event_type>`. Returns false
 * for legacy single-segment values (which remain valid on the wire).
 *
 * Pure structural check — does not consult `AUDIT_EVENT_TYPES_KNOWN_PREFIXES`.
 */
export declare function isThreeSegmentEventType(eventType: string): boolean;
/**
 * Extract the `<github-org>:<consumer>:` prefix from a 3-segment event
 * type. Returns `null` for legacy single-segment values.
 */
export declare function extractEventTypePrefix(eventType: string): string | null;
//# sourceMappingURL=audit-event-types.d.ts.map