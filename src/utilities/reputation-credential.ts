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
export function computeCredentialPrior(
  credential: ReputationCredential,
  destinationCollectionScore: number,
  maxCredentialWeight: number = 0.5,
): { prior: number; weight: number; reason: string } {
  // Cold credentials carry no information
  if (credential.source_state === 'cold' || credential.source_sample_count === 0) {
    return {
      prior: destinationCollectionScore,
      weight: 0,
      reason: 'Source credential is cold — using destination collection score as prior',
    };
  }

  // Sample confidence: how much data backs this credential (saturates at 30)
  const sampleConfidence = Math.min(1, credential.source_sample_count / 30);

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
