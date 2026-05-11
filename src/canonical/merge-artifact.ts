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
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';

const GIT_SHA1_PATTERN = '^[0-9a-f]{40}$';
const REPO_SLUG_PATTERN = '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$';

export const MergeArtifactSchema = Type.Object(
  {
    envelope_kind: Type.Literal('merge_artifact', {
      description: 'Discriminator pinning this envelope shape.',
    }),
    contract_version: Type.Literal('8.7.0', {
      description:
        'Hounfour contract version. Pinned to "8.7.0" for the cycle-007 ship line.',
    }),
    cluster_id: Type.String({
      minLength: 1,
      description: 'Consumer-shaped cluster identifier.',
    }),
    epic_checkpoint_id: Type.Union(
      [Type.String({ minLength: 1 }), Type.Null()],
      {
        description:
          'Optional lazy-link to an EpicCheckpointSchema record ' +
          '(FR-B8, v8.6.0). Null if the merge is not bound to a ' +
          'checkpoint — e.g. hotfixes outside a checkpoint window. ' +
          'Resolution is consumer-state per ADR-010.',
      },
    ),
    repo_slug: Type.String({
      pattern: REPO_SLUG_PATTERN,
      description:
        'GitHub-shaped owner/name slug. Consumer-shaped namespace; ' +
        'hounfour does not freeze the registry.',
    }),
    pr_number: Type.Integer({
      minimum: 1,
      maximum: 9_007_199_254_740_991,
      description:
        'Positive integer pull-request identifier. Upper bound is ' +
        'Number.MAX_SAFE_INTEGER to keep cross-runner integer ' +
        'arithmetic bigint-safe at the JSON boundary.',
    }),
    merged_commit_sha: Type.String({
      pattern: GIT_SHA1_PATTERN,
      description:
        'Git SHA-1 commit hash — 40 lowercase hex chars. MA-1 ' +
        'library-evaluable byte-shape. Git is migrating to SHA-256 ' +
        '(extensions.objectFormat = sha256); cycle-007 ships SHA-1 ' +
        'for compatibility with current git infrastructure. Future-' +
        'compat path documented in the file-level JSDoc and PRD BL-8.',
    }),
    master_content_hash: Type.String({
      pattern: SHA256_HEX_PATTERN,
      description:
        'SHA-256 of the JCS-canonical-form (RFC 8785, per SDD §2.0.1) ' +
        'bytes of the master content at merge time. MA-2 library-' +
        'evaluable byte-shape; canonicalization correctness is ' +
        'consumer-side per ADR-010 — consumer applies JCS to the ' +
        'master-content document then computes SHA-256 over the ' +
        'resulting bytes.',
    }),
    merged_at: Type.String({
      pattern: ISO8601_UTC_PATTERN,
      description:
        'ISO 8601 UTC timestamp at which the merge landed. MA-3 ' +
        'library-evaluable pattern.',
    }),
    merger_actor_id: Type.String({
      minLength: 1,
      maxLength: 256,
      description:
        'Consumer-shaped actor identifier — typically a GitHub user ' +
        'or bot identifier. Hounfour does not freeze the namespace; ' +
        'the 256-char upper bound matches the consumer-side display ' +
        'surface.',
    }),
  },
  {
    $id: 'MergeArtifact',
    additionalProperties: false,
    description:
      'Cluster-level merge event. NOT crypto-bearing, NOT chain-' +
      'bearing at the merge-artifact level — consumers wrap in ' +
      'SignatureEnvelope (v8.5.0) per their own policy when signing ' +
      'is required. Round-trip parse and re-serialize bit-identical: ' +
      'every well-formed payload satisfies ' +
      'JSON.stringify(JSON.parse(s)) equals s when s is itself the ' +
      'JSON-stringified canonical form.',
  },
);
export type MergeArtifact = Static<typeof MergeArtifactSchema>;

/**
 * `validateMergeArtifact` — defensive-shim cross-field validator.
 *
 * MergeArtifact has no library-evaluable cross-field invariants in
 * v8.7.0 — MA-1 + MA-3 are pure TypeBox structural patterns; MA-2 +
 * MA-4 are consumer-state per ADR-010 with manifest reason codes.
 * The function exists to satisfy the cycle-007 constraint-coverage
 * gate (every constraint file MUST have a registered cross-field
 * validator) and as a hook for future cross-field invariants if any
 * are promoted from consumer-state to library-evaluable in
 * v8.8.0+.
 *
 * **Defensive contract** (mirrors the CanonicalRun CR-1 plus
 * ClusterRunSeries plus InterSeriesScopingArtifact plus
 * SubscriptionPoolState plus RevocationList precedent): the
 * function MUST NOT throw on malformed input. Returns a structural-
 * precondition error if `data` is not a non-null object; otherwise
 * returns valid:true (no library-evaluable cross-field invariants
 * to enforce at this layer).
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input without throwing.
 * @returns `{ valid, errors, warnings }` — errors is empty for any
 *   non-null object input; populated only on a non-object structural-
 *   precondition failure.
 *
 * @since v8.7.0 — FR-G5 (PR-A4.5).
 */
export function validateMergeArtifact(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        `MA: structural shape precondition failed — input must be a non-null object (MergeArtifact record); got ${data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data}.`,
      ],
      warnings: [],
    };
  }
  return { valid: true, errors: [], warnings: [] };
}
