/**
 * QualityObservation — structured quality result from model performance evaluation.
 *
 * Factored as a standalone schema because it represents Dixie's quality
 * evaluation output — a reusable concept that may appear in batch evaluation
 * reports and other contexts beyond the event pipeline.
 *
 * @see PRD FR-2 — QualityObservation Sub-Schema
 * @see Issue #38 — model_performance variant
 * @since v8.2.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Structured quality observation from a model performance evaluation.
 *
 * The `dimensions` record uses the same pattern constraint as
 * `quality_signal.dimensions` to ensure cross-variant dimension names
 * are comparable (e.g., a consumer can compare `quality_signal.dimensions.coherence`
 * with `model_performance.quality_observation.dimensions.coherence`).
 */
export declare const QualityObservationSchema: import("@sinclair/typebox").TObject<{
    score: import("@sinclair/typebox").TNumber;
    dimensions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TNumber>>;
    latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    evaluated_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type QualityObservation = Static<typeof QualityObservationSchema>;
//# sourceMappingURL=quality-observation.d.ts.map