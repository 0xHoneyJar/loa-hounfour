/**
 * Sample count at which credential confidence saturates.
 *
 * Chosen as 30 based on the Central Limit Theorem heuristic: for n >= 30,
 * the sampling distribution of the mean is approximately normal regardless
 * of the underlying distribution, making the credential's blended_score a
 * statistically reliable estimator of the source reputation.
 *
 * At this threshold, the credential's sample_count contributes full
 * confidence to the weight calculation. Below this, confidence scales
 * linearly (min(1, source_sample_count / CREDENTIAL_CONFIDENCE_THRESHOLD)),
 * proportionally discounting credentials backed by fewer observations.
 *
 * @since v7.3.0
 */
export const CREDENTIAL_CONFIDENCE_THRESHOLD = 30;
/**
 * Check if a reputation credential has expired.
 *
 * @param credential - The credential to check
 * @param now - Current time as ISO 8601 string (default: Date.now())
 * @returns true if the credential has expired
 *
 * @since v7.3.0
 */
export function isCredentialExpired(credential, now) {
    if (!credential.expires_at)
        return false;
    const expiresMs = new Date(credential.expires_at).getTime();
    const nowMs = now ? new Date(now).getTime() : Date.now();
    return nowMs >= expiresMs;
}
/**
 * Compute an informed Bayesian prior from a portable reputation credential.
 *
 * When a personality with a credential joins a new collection, the
 * destination can use this to compute a warm-start prior instead of
 * the cold-start collection default. The credential's contribution
 * is weighted by the source collection's credibility (collection_score).
 *
 * Formula: informed_prior = (w * credential.blended_score + (1-w) * destination_collection_score)
 * where w = source_collection_score * credential_sample_confidence
 * and credential_sample_confidence = min(1, source_sample_count / 30)
 *
 * @param credential - Portable reputation credential from source collection
 * @param destinationCollectionScore - Collection score of the destination
 * @param maxCredentialWeight - Maximum weight for the credential (default 0.5)
 * @returns Prior, weight, and explanation
 *
 * @since v7.3.0
 */
export function computeCredentialPrior(credential, destinationCollectionScore, maxCredentialWeight = 0.5) {
    // Cold credentials carry no information
    if (credential.source_state === 'cold' || credential.source_sample_count === 0) {
        return {
            prior: destinationCollectionScore,
            weight: 0,
            reason: 'Source credential is cold — using destination collection score as prior',
        };
    }
    // Sample confidence: how much data backs this credential (saturates at CREDENTIAL_CONFIDENCE_THRESHOLD)
    const sampleConfidence = Math.min(1, credential.source_sample_count / CREDENTIAL_CONFIDENCE_THRESHOLD);
    // Raw weight: source credibility * sample confidence
    const rawWeight = credential.source_collection_score * sampleConfidence;
    // Cap at maxCredentialWeight for safety
    const weight = Math.min(rawWeight, maxCredentialWeight);
    // Compute informed prior as weighted blend
    const prior = weight * credential.source_blended_score
        + (1 - weight) * destinationCollectionScore;
    return {
        prior,
        weight,
        reason: `Credential from collection ${credential.source_collection_id} `
            + `(score: ${credential.source_collection_score.toFixed(2)}, `
            + `samples: ${credential.source_sample_count}) `
            + `contributes weight ${weight.toFixed(3)} to informed prior`,
    };
}
//# sourceMappingURL=reputation-credential.js.map