/**
 * VectorManifest schema — self-describing manifest for conformance vectors.
 *
 * Lists all conformance vectors with metadata for cross-language consumers
 * to discover and load vectors programmatically.
 *
 * @see SDD §4.12 — Conformance Vector Distribution (FR-4)
 * @since v8.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Single entry in the vector manifest.
 */
export const VectorManifestEntrySchema = Type.Object(
  {
    vector_id: Type.String({ minLength: 1 }),
    category: Type.String({ minLength: 1 }),
    path: Type.String({
      minLength: 1,
      description: 'Relative path from vectors/ root to the vector JSON file.',
    }),
    layer: Type.Union([Type.Literal(1), Type.Literal(2)], {
      description:
        'Layer 1: schema validation vectors. '
        + 'Layer 2: behavioral/constraint evaluation vectors.',
    }),
    description: Type.String({ minLength: 1 }),
    contract_version: Type.String({ minLength: 1 }),
    expected_valid: Type.Boolean(),
  },
  {
    $id: 'VectorManifestEntry',
    additionalProperties: false,
  },
);

export type VectorManifestEntry = Static<typeof VectorManifestEntrySchema>;

/**
 * Root manifest for conformance vector distribution.
 */
export const VectorManifestSchema = Type.Object(
  {
    manifest_version: Type.Literal('1.0.0', {
      description: 'Schema version for manifest format evolution.',
    }),
    generated_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ minLength: 1 }),
    total_vectors: Type.Integer({ minimum: 0 }),
    vectors: Type.Array(VectorManifestEntrySchema),
  },
  {
    $id: 'VectorManifest',
    additionalProperties: false,
    description:
      'Self-describing manifest for conformance test vectors. '
      + 'Cross-language consumers use this to discover and load vectors.',
  },
);

export type VectorManifest = Static<typeof VectorManifestSchema>;
