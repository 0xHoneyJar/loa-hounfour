/**
 * Base fields shared by all cohort schemas (ModelCohort, TaskTypeCohort).
 *
 * Spread these into Type.Object() definitions to ensure field alignment:
 * ```typescript
 * const MySchema = Type.Object({
 *   ...COHORT_BASE_FIELDS,
 *   // additional fields
 * });
 * ```
 */
export declare const COHORT_BASE_FIELDS: {
    readonly model_id: import("@sinclair/typebox").TString;
    readonly personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
    readonly sample_count: import("@sinclair/typebox").TInteger;
    readonly last_updated: import("@sinclair/typebox").TString;
};
//# sourceMappingURL=cohort-base-fields.d.ts.map