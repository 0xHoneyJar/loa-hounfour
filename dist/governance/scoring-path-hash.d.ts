/**
 * SHA-256 of empty string — genesis sentinel for the first entry in a chain.
 *
 * Matches the EMPTY_BODY_HASH pattern in `src/integrity/req-hash.ts`.
 */
export declare const SCORING_PATH_GENESIS_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
/**
 * Hashable fields of a ScoringPathLog entry.
 *
 * Excludes `entry_hash` and `previous_hash` (chain metadata) —
 * only the content fields are hashed.
 */
export interface ScoringPathHashInput {
    path: string;
    model_id?: string;
    task_type?: string;
    reason?: string;
    scored_at?: string;
}
/**
 * Compute SHA-256 hash of a ScoringPathLog entry's content fields.
 *
 * Uses RFC 8785 canonical JSON for deterministic serialization,
 * then SHA-256 for hashing. Returns `sha256:<64 hex chars>`.
 *
 * @param entry - Content fields of the ScoringPathLog entry (excluding hash fields)
 * @returns Hash string in `sha256:<hex>` format
 * @throws If canonicalization fails
 */
export declare function computeScoringPathHash(entry: ScoringPathHashInput): string;
//# sourceMappingURL=scoring-path-hash.d.ts.map