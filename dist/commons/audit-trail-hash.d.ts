import type { AuditTrail } from './audit-trail.js';
/**
 * Build the domain tag for audit entry hashing.
 *
 * Sanitization is lossy: different inputs may produce the same tag.
 * - Case folding: "GovernedCredits" → "governedcredits"
 * - Dot-to-hyphen: "8.3.0" → "8-3-0"
 * - Colon stripping: "a:b" → "ab"
 *
 * This is acceptable because schemaIds are controlled identifiers
 * (not user input) and versions follow semver convention. Collisions are
 * detectable at schema registration time. The original schemaId and
 * contractVersion are available in the calling context for forensic tracing.
 *
 * @param schemaId - Schema identifier (e.g., 'GovernedCredits', 'test-store')
 * @param contractVersion - Protocol version (e.g., '8.3.0')
 * @returns Domain tag string that passes validateDomainTag()
 * @throws {TypeError} If schemaId or contractVersion don't match input grammar
 */
export declare function buildDomainTag(schemaId: string, contractVersion: string): string;
/**
 * Hashable fields of an AuditEntry (excluding hash chain metadata).
 */
export interface AuditEntryHashInput {
    entry_id: string;
    timestamp: string;
    event_type: string;
    actor_id?: string;
    payload?: unknown;
}
/**
 * Compute domain-separated SHA-256 hash of an audit entry's content fields.
 *
 * Hash = sha256(domain_tag + canonical_json(content_fields))
 *
 * @param entry - Content fields of the audit entry (excluding hash fields)
 * @param domainTag - Domain tag string (from buildDomainTag)
 * @returns Hash string in `sha256:<64 hex chars>` format
 * @throws If canonicalization fails
 */
export declare function computeAuditEntryHash(entry: AuditEntryHashInput, domainTag: string): string;
/**
 * Result of audit trail integrity verification.
 */
export interface AuditTrailVerificationResult {
    valid: boolean;
    failure_phase?: 'content' | 'chain';
    failure_index?: number;
    expected_hash?: string;
    actual_hash?: string;
}
/**
 * Two-phase audit trail integrity verification (Flatline IMP-004).
 *
 * Phase 1 (content): Recompute entry_hash for each entry using domain tag.
 * Phase 2 (chain): Verify previous_hash linkage.
 *
 * @param trail - The AuditTrail to verify
 * @returns Verification result with failure details if invalid
 */
export declare function verifyAuditTrailIntegrity(trail: AuditTrail): AuditTrailVerificationResult;
//# sourceMappingURL=audit-trail-hash.d.ts.map