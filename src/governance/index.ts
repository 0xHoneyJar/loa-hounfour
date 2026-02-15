/**
 * Governance sub-package barrel.
 *
 * Re-exports sanctions, disputes, validated outcomes, reputation,
 * performance, contributions, and governance vocabulary.
 */

// Schemas — Governance
export {
  SanctionSchema,
  type Sanction,
} from '../schemas/sanction.js';

export {
  DisputeRecordSchema,
  type DisputeRecord,
} from '../schemas/dispute-record.js';

export {
  ValidatedOutcomeSchema,
  type ValidatedOutcome,
} from '../schemas/validated-outcome.js';

// Schemas — Reputation
export {
  ReputationScoreSchema,
  type ReputationScore,
} from '../schemas/reputation-score.js';

// Schemas — Performance
export {
  PerformanceRecordSchema,
  PerformanceOutcomeSchema,
  type PerformanceRecord,
  type PerformanceOutcome,
} from '../schemas/performance-record.js';

export {
  ContributionRecordSchema,
  type ContributionRecord,
} from '../schemas/contribution-record.js';

// Vocabulary — Sanctions
export {
  SANCTION_SEVERITY_LEVELS,
  SANCTION_SEVERITY_ORDER,
  VIOLATION_TYPES,
  ESCALATION_RULES,
  type SanctionSeverity,
  type ViolationType,
} from '../vocabulary/sanctions.js';

// Vocabulary — Reputation
export {
  REPUTATION_WEIGHTS,
  REPUTATION_DECAY,
  MIN_REPUTATION_SAMPLE_SIZE,
  type ReputationComponent,
} from '../vocabulary/reputation.js';

// Utilities — Reputation
export { isReliableReputation } from '../utilities/reputation.js';
