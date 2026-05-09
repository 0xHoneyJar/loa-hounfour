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
// ---------------------------------------------------------------------------
// 3-segment namespace pattern
// ---------------------------------------------------------------------------
//
// Format: `<github-org>:<consumer>:<event_type>`
//
// - `<github-org>`: the GitHub organization slug that owns the consumer
//   (e.g. `0xhoneyjar`). Anchoring the org slot makes accidental
//   collisions across organizations practically impossible.
// - `<consumer>`: the consumer application / repository slug
//   (substrate-agnostic; lowercase + hyphens + underscores).
// - `<event_type>`: the dotted aggregate.noun.verb shape used by
//   `EVENT_TYPES` in `event-types.ts` (e.g. `agent.lifecycle.transitioned`).
//
// Pattern (informational; NOT enforced as a JSON Schema regex on
// AuditEntry.event_type — that field stays open by design):
//
//     ^[a-z0-9][a-z0-9-]*:[a-z][a-z0-9_-]*:[a-z][a-z0-9_.-]+$
//
// The org slot accepts GitHub-style slugs (alphanumeric, internal
// hyphens; e.g. `0xhoneyjar`). Single-segment legacy types from
// `event-types.ts` (e.g. `'agent.lifecycle.transitioned'`) remain
// valid on the wire — `AuditEntry.event_type` is open by design and
// this file is informational. New consumer-minted event types SHOULD
// use the 3-segment form.
//
// Example shapes (placeholders only — no specific consumer is endorsed):
//
//     0xhoneyjar:example-app:assertion.admitted
//     0xhoneyjar:example-app:estate.transition.applied
//     <github-org>:<consumer>:<event-aggregate>.<noun>.<verb>
/**
 * Informational soft registry of known event-type prefixes, recorded
 * for discoverability only. Entries here are NOT validated against
 * `AuditEntry.event_type`; Hounfour treats them as documentation.
 *
 * Consumers SHOULD register their `<github-org>:<consumer>:` prefix
 * by adding an entry here in a follow-up PR. Absence of an entry is
 * not a rejection — uniqueness is a structural property of the
 * 3-segment format, not a registration gate.
 */
export const AUDIT_EVENT_TYPES_KNOWN_PREFIXES = [
// No third-party prefixes registered yet. Add entries via PR as
// consumers adopt the 3-segment format.
];
/**
 * Test whether an `AuditEntry.event_type` string follows the 3-segment
 * namespace shape `<github-org>:<consumer>:<event_type>`. Returns false
 * for legacy single-segment values (which remain valid on the wire).
 *
 * Pure structural check — does not consult `AUDIT_EVENT_TYPES_KNOWN_PREFIXES`.
 */
export function isThreeSegmentEventType(eventType) {
    const parts = eventType.split(':');
    if (parts.length !== 3)
        return false;
    const [org, consumer, body] = parts;
    return (/^[a-z0-9][a-z0-9-]*$/.test(org) &&
        /^[a-z][a-z0-9_-]*$/.test(consumer) &&
        /^[a-z][a-z0-9_.-]+$/.test(body));
}
/**
 * Extract the `<github-org>:<consumer>:` prefix from a 3-segment event
 * type. Returns `null` for legacy single-segment values.
 */
export function extractEventTypePrefix(eventType) {
    const parts = eventType.split(':');
    if (parts.length !== 3)
        return null;
    return `${parts[0]}:${parts[1]}:`;
}
//# sourceMappingURL=audit-event-types.js.map