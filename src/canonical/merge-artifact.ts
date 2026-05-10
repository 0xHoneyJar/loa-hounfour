/**
 * `MergeArtifactSchema` — cluster-level merge event (FR-G5, v8.7.0).
 *
 * Cluster-level merge events as first-class envelopes, linkable to
 * PR ID + merged commit SHA + master content hash at merge time.
 * Independent of any single repo's local git history; provides a
 * cluster-spanning audit trail.
 *
 * **NOT crypto-bearing, NOT chain-bearing** at the merge-artifact
 * level. Consumers wrap in `SignatureEnvelope` (v8.5.0) per their own
 * policy when signing is required; per ADR-010 authority lives in
 * the consumer.
 *
 * **Master content hash** (MA-2): `master_content_hash` is the
 * SHA-256 of the JCS-canonical-form (RFC 8785, per SDD §2.0.1) bytes
 * of the master content at merge time. Library validates the
 * pattern; canonicalization correctness is consumer-side per
 * ADR-010 (manifest emits
 * `MERGE_ARTIFACT_CONTENT_HASH_CANONICALIZATION_CONTEXT_DEFERRED`).
 *
 * **Git SHA-1 binding** (MA-1): `merged_commit_sha` matches
 * `^[0-9a-f]{40}$` (lowercase 40-hex). Git itself is migrating to
 * SHA-256 (`extensions.objectFormat = sha256`); cycle-007 ships
 * SHA-1 binding for compatibility with current git infrastructure.
 * Future-compat path: optional `merged_commit_sha_sha256` field at
 * v8.8.0+ when consumer-corpus repos transition (PRD BL-8); v9.0.0
 * may flip the canonical binding. SHA-1 is acknowledged-collision-
 * attackable but git's migration timeline is the authoritative pace.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/MergeArtifact.constraints.json` — MA-1..MA-4):
 *   - MA-1: `merged_commit_sha` matches `^[0-9a-f]{40}$`
 *     (TypeBox pattern).
 *   - MA-2: `master_content_hash` matches SHA-256 pattern AND was
 *     computed via JCS-canonical-form (TypeBox pattern; canonicaliz-
 *     ation correctness consumer-state).
 *   - MA-3: `merged_at` ISO8601 UTC (TypeBox pattern).
 *   - MA-4: master-content-hash provenance — computed from
 *     JCS-canonical-form master content at merge time
 *     (consumer-state).
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.5
 * @see ADR-010 — class-vs-policy boundary.
 * @since v8.7.0 — FR-G5.
 */
// Stub — full schema body lands in PR-A4.5.

import { Type, type Static } from '@sinclair/typebox';

/**
 * @internal
 * Stub placeholder — replaced with full schema body in PR-A4.5.
 * Validating any payload against this returns `false`.
 */
export const MergeArtifactSchema = Type.Never({
  $id: '@0xhoneyjar/loa-hounfour/8.7.0/merge-artifact.json',
  description:
    'STUB — PR-A4.0 reservation. Full schema body lands in PR-A4.5.',
});

export type MergeArtifact = Static<typeof MergeArtifactSchema>;
