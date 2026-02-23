import { type ReputationScore } from '../schemas/reputation-score.js';
import { MIN_REPUTATION_SAMPLE_SIZE, DEFAULT_HALF_LIFE_DAYS } from '../vocabulary/reputation.js';

export function isReliableReputation(score: ReputationScore, now?: number): { reliable: boolean; reasons: string[] } {
  const currentTime = now ?? Date.now();
  const reasons: string[] = [];

  if (score.sample_size < MIN_REPUTATION_SAMPLE_SIZE) {
    reasons.push(`sample_size (${score.sample_size}) below minimum threshold (${MIN_REPUTATION_SAMPLE_SIZE})`);
  }

  // Check staleness: last_updated older than 2x half-life
  const maxAge = DEFAULT_HALF_LIFE_DAYS * 2 * 24 * 60 * 60 * 1000;
  const age = currentTime - new Date(score.last_updated).getTime();
  if (age > maxAge) {
    reasons.push(`last_updated is stale (${Math.floor(age / (24 * 60 * 60 * 1000))} days old, max ${DEFAULT_HALF_LIFE_DAYS * 2})`);
  }

  if (!score.decay_applied && age > DEFAULT_HALF_LIFE_DAYS * 24 * 60 * 60 * 1000) {
    reasons.push('score not decayed despite exceeding half-life');
  }

  return { reliable: reasons.length === 0, reasons };
}
