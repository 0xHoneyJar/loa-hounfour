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
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid payload `s` returns a string equal to `s` when `s` is
 * the canonical-shaped form. NOT a cross-runtime byte-identity
 * claim; cross-runtime byte-identity is FR-A2 cross-language
 * harness's domain via RFC 8785 JCS.
 *
 * **Master content hash** (MA-2): `master_content_hash` is the
 * SHA-256 of the JCS-canonical-form (RFC 8785, per SDD §2.0.1) bytes
 * of the master content at merge time. Library validates the
 * pattern; canonicalization correctness is consumer-side per
 * ADR-010 (manifest emits
 * `MERGE_ARTIFACT_CONTENT_HASH_CANONICALIZATION_CONTEXT_DEFERRED`).
 *
 * **Git SHA-1 binding** (MA-1): `merged_commit_sha` matches
 * `^[0-9a-f]{40}$` — lowercase 40-hex. Git itself is migrating to
 * SHA-256 via `extensions.objectFormat = sha256`; cycle-007 ships
 * SHA-1 binding for compatibility with current git infrastructure.
 * Future-compat path: optional `merged_commit_sha_sha256` field at
 * v8.8.0+ when consumer-corpus repos transition (PRD BL-8); v9.0.0
 * may flip the canonical binding. SHA-1 is acknowledged-collision-
 * attackable but git's migration timeline is the authoritative pace.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/MergeArtifact.constraints.json` — MA-1..MA-4):
 *   - MA-1: `merged_commit_sha` matches `^[0-9a-f]{40}$`
 *     (TypeBox pattern; library-evaluable).
 *   - MA-2: `master_content_hash` matches SHA-256 pattern AND was
 *     computed via JCS-canonical-form (TypeBox pattern enforces the
 *     wire shape; canonicalization correctness is consumer-state).
 *   - MA-3: `merged_at` ISO8601 UTC (TypeBox pattern;
 *     library-evaluable).
 *   - MA-4: master-content-hash provenance — computed from
 *     JCS-canonical-form master content at merge time
 *     (consumer-state per ADR-010; manifest emits
 *     `MERGE_ARTIFACT_CONTENT_HASH_CONTEXT_DEFERRED`).
 *
 * **Cross-field validator is a structural-defensive shim** —
 * the library-evaluable invariants MA-1 + MA-3 are pure TypeBox
 * structural patterns; MA-2 + MA-4 are consumer-state. The
 * `validateMergeArtifact` function exists to satisfy the cycle-007
 * constraint-coverage gate (`scripts/generate-constraints.ts`
 * --validate requires every constraint file to have a registered
 * cross-field validator). The body is a defensive shape-only check
 * that mirrors the wrapper precondition pattern from the other
 * cycle-007 schemas; it leaves a hook for future MA-N cross-field
 * invariants if MA-2 / MA-4 are ever promoted from consumer-state
 * to library-evaluable.
 *
 * **`$id` convention** (mirrors CanonicalRun / PhaseKind /
 * ClusterRunSeries / InterSeriesScopingArtifact /
 * SubscriptionPoolState / RevocationList precedent): the TypeBox-
 * internal `$id` value declared in this file (`'MergeArtifact'`) is
 * a short token used by the TypeBox type system for self-reference
 * within the runtime. It is **overridden at JSON Schema generation
 * time** by `scripts/generate-schemas.ts` (line ~607) to the
 * canonical versioned URI form. Standalone JSON Schema consumers
 * only ever see the URI form.
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.5
 * @see ADR-010 — class-vs-policy boundary.
 * @since v8.7.0 — FR-G5 (PR-A4.5).
 */
import { type Static } from '@sinclair/typebox';
export declare const MergeArtifactSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"merge_artifact">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.7.0">;
    cluster_id: import("@sinclair/typebox").TString;
    epic_checkpoint_id: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    repo_slug: import("@sinclair/typebox").TString;
    pr_number: import("@sinclair/typebox").TInteger;
    merged_commit_sha: import("@sinclair/typebox").TString;
    master_content_hash: import("@sinclair/typebox").TString;
    merged_at: import("@sinclair/typebox").TString;
    merger_actor_id: import("@sinclair/typebox").TString;
}>;
export type MergeArtifact = Static<typeof MergeArtifactSchema>;
/**
 * `validateMergeArtifact` — defensive-shim cross-field validator.
 *
 * **THIS IS NOT A STRUCTURAL VALIDATOR.** Callers MUST run
 * `Value.Check(MergeArtifactSchema, data)` first — that is the
 * authoritative shape gate. The shim only checks the most basic
 * preconditions (non-null object + correct envelope_kind
 * discriminator) and returns `valid:true` for any payload past
 * those guards. Required-field presence, field-pattern validity,
 * and additionalProperties enforcement live in the structural tier.
 *
 * MergeArtifact has no library-evaluable cross-field invariants in
 * v8.7.0 — MA-1 + MA-3 are pure TypeBox structural patterns; MA-2 +
 * MA-4 are consumer-state per ADR-010 with manifest reason codes.
 * The function exists to satisfy the cycle-007 constraint-coverage
 * gate (every constraint file MUST have a registered cross-field
 * validator) and as a hook for future cross-field invariants if any
 * are promoted from consumer-state to library-evaluable in
 * v8.8.0+. **Direct callers bypassing Value.Check** SHOULD treat the
 * shim's `valid:true` as "passes the cross-field tier" only, NOT as
 * "is a well-formed MergeArtifact envelope."
 *
 * **Defensive contract** (mirrors the CanonicalRun CR-1 plus
 * ClusterRunSeries plus InterSeriesScopingArtifact plus
 * SubscriptionPoolState plus RevocationList precedent): the
 * function MUST NOT throw on malformed input. Returns a structural-
 * precondition error if `data` is not a non-null object OR if its
 * envelope_kind discriminator doesn't match; otherwise returns
 * valid:true (no library-evaluable cross-field invariants to
 * enforce at this layer).
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input without throwing.
 * @returns `{ valid, errors, warnings }` — errors is empty for any
 *   non-null object input; populated only on a non-object structural-
 *   precondition failure.
 *
 * @since v8.7.0 — FR-G5 (PR-A4.5).
 */
export declare function validateMergeArtifact(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=merge-artifact.d.ts.map