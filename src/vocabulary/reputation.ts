export const REPUTATION_WEIGHTS = {
  outcome_quality: 0.4,
  performance_consistency: 0.25,
  dispute_ratio: 0.2,
  community_standing: 0.15,
} as const;

export type ReputationComponent = keyof typeof REPUTATION_WEIGHTS;

export const REPUTATION_DECAY = {
  half_life_days: 30,
  floor: 0.1,
  ceiling: 1.0,
  neutral: 0.5,
} as const;

export const MIN_REPUTATION_SAMPLE_SIZE = 5;
