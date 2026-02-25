# ADR-006: Hash Chain Operational Response

**Status**: Accepted
**Date**: 2026-02-25
**Source**: SDD §4.8 — Hash Chain Operational Response (FR-3)

## Context

The Commons Protocol uses append-only hash chains for audit trail integrity. When a hash chain discontinuity is detected (either content hash mismatch or chain linkage failure), the system needs a defined operational response rather than ad-hoc error handling.

## Decision

### Halt-and-Reconcile Protocol

When `verifyAuditTrailIntegrity()` detects a discontinuity:

1. **Halt**: Set `integrity_status` to `'quarantined'` on the affected `AuditTrail`
2. **Record**: Create a `HashChainDiscontinuity` event with failure details
3. **Quarantine**: Create a `QuarantineRecord` for affected entries (from break point to end)
4. **Investigate**: Manual or automated investigation determines root cause
5. **Resolve**: Either reconcile (reintegrate) or dismiss (permanently reject) quarantined entries

### Two-Phase Verification (Flatline IMP-004)

Verification runs in two phases for diagnostic clarity:

- **Phase 1 (Content)**: Recompute `entry_hash` from content fields using the stored `hash_domain_tag`. Failure here means entry content was tampered with.
- **Phase 2 (Chain)**: Verify `previous_hash` linkage between consecutive entries. Failure here means entries were reordered, inserted, or deleted.

The `failure_phase` field on both `HashChainDiscontinuity` and `AuditTrailVerificationResult` distinguishes these cases for operational response.

### Domain-Separated Hashing

Hash computation uses domain separation to prevent cross-schema hash collisions:

```
hash = sha256(domain_tag + canonical_json(content_fields))
domain_tag = "loa-commons:audit:<schema_$id>:<contract_version>"
```

The `hash_domain_tag` is persisted on each `AuditEntry` at write time (Flatline SKP-002), ensuring cross-version verification is unambiguous.

### Per-Consumer Integration

| Consumer | Hash Library | JCS Library | Notes |
|----------|-------------|-------------|-------|
| TypeScript (loa-hounfour) | `@noble/hashes` | `canonicalize` (RFC 8785) | Reference implementation |
| Python (loa-dixie) | `hashlib` | `canonicaljson` | Verify with cross-language vectors |
| Go (arrakis) | `crypto/sha256` | `github.com/nicktrav/canonicaljson` | Verify with cross-language vectors |
| Rust (future) | `sha2` crate | `serde_json_canonicalizer` | Verify with cross-language vectors |

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Content tampering | Phase 1 recomputation detects modified entry fields |
| Entry reordering | Phase 2 chain linkage detects out-of-order entries |
| Entry insertion | Phase 2 chain linkage detects inserted entries |
| Entry deletion | Phase 2 chain linkage detects missing entries |
| Domain tag manipulation | `hash_domain_tag` persisted at write time, not derived at read time |
| Checkpoint forgery | Archived segments independently verifiable; checkpoint_hash ties to last archived entry |

## Consequences

- Every audit trail entry carries a content hash and chain linkage — storage overhead per entry is ~140 bytes (two sha256 hashes + domain tag).
- Verification is O(n) in the number of entries. For checkpointed trails, only the active segment needs verification.
- Cross-language consumers must implement the same canonicalization (RFC 8785 JCS) to produce matching hashes. Conformance vectors in `vectors/conformance/commons/audit-trail/` enable automated verification.
