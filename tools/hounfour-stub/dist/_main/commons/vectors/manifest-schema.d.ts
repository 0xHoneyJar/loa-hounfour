/**
 * VectorManifest schema — self-describing manifest for conformance vectors.
 *
 * Lists all conformance vectors with metadata for cross-language consumers
 * to discover and load vectors programmatically.
 *
 * @see SDD §4.12 — Conformance Vector Distribution (FR-4)
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Single entry in the vector manifest.
 */
export declare const VectorManifestEntrySchema: import("@sinclair/typebox").TObject<{
    vector_id: import("@sinclair/typebox").TString;
    category: import("@sinclair/typebox").TString;
    path: import("@sinclair/typebox").TString;
    layer: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<1>, import("@sinclair/typebox").TLiteral<2>]>;
    description: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    expected_valid: import("@sinclair/typebox").TBoolean;
}>;
export type VectorManifestEntry = Static<typeof VectorManifestEntrySchema>;
/**
 * Root manifest for conformance vector distribution.
 */
export declare const VectorManifestSchema: import("@sinclair/typebox").TObject<{
    manifest_version: import("@sinclair/typebox").TLiteral<"1.0.0">;
    generated_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    total_vectors: import("@sinclair/typebox").TInteger;
    vectors: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        vector_id: import("@sinclair/typebox").TString;
        category: import("@sinclair/typebox").TString;
        path: import("@sinclair/typebox").TString;
        layer: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<1>, import("@sinclair/typebox").TLiteral<2>]>;
        description: import("@sinclair/typebox").TString;
        contract_version: import("@sinclair/typebox").TString;
        expected_valid: import("@sinclair/typebox").TBoolean;
    }>>;
}>;
export type VectorManifest = Static<typeof VectorManifestSchema>;
//# sourceMappingURL=manifest-schema.d.ts.map