/**
 * Portable reputation credential utilities.
 *
 * Computes informed Bayesian priors from portable credentials,
 * enabling warm-start reputation bootstrapping when a personality
 * moves between collections.
 *
 * This is the immune system's cross-reactivity analog — partial
 * protection from a structurally similar prior context.
 *
 * @see Bridgebuilder Spec IV — portable reputation credentials
 * @since v7.3.0
 */
import type { ReputationCredential } from '../governance/reputation-credential.js';
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
export declare const CREDENTIAL_CONFIDENCE_THRESHOLD = 30;
/**
 * Check if a reputation credential has expired.
 *
 * @param credential - The credential to check
 * @param now - Current time as ISO 8601 string (default: Date.now())
 * @returns true if the credential has expired
 *
 * @since v7.3.0
 */
export declare function isCredentialExpired(credential: ReputationCredential, now?: string): boolean;
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
export declare function computeCredentialPrior(credential: ReputationCredential, destinationCollectionScore: number, maxCredentialWeight?: number): {
    prior: number;
    weight: number;
    reason: string;
};
//# sourceMappingURL=reputation-credential.d.ts.map