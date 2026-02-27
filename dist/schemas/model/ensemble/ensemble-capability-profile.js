/**
 * Ensemble capability profile — collective capability declaration for model ensembles.
 *
 * v5.4.0 — FR-5: Models the "patchwork AGI hypothesis" from Tomasev et al.
 * (arXiv:2512.16856): the combination of individually limited models can produce
 * emergent capabilities that no single model possesses.
 *
 * @see "Distributional AGI Safety" (arXiv:2512.16856) — patchwork AGI hypothesis
 * @see EnsembleStrategySchema — reused coordination strategy enum
 */
import { Type } from '@sinclair/typebox';
import { EnsembleStrategySchema } from './ensemble-strategy.js';
export const CapabilityEvidenceSchema = Type.Object({
    capability: Type.String({ minLength: 1 }),
    evidence_type: Type.Union([
        Type.Literal('tested'),
        Type.Literal('theoretical'),
        Type.Literal('observed'),
    ]),
    vector_id: Type.Optional(Type.String({ description: 'Conformance vector ID demonstrating capability' })),
}, { additionalProperties: false });
export const SafetyProfileSchema = Type.Object({
    max_autonomy_level: Type.Union([
        Type.Literal('supervised'),
        Type.Literal('semi_autonomous'),
        Type.Literal('autonomous'),
    ]),
    requires_human_approval: Type.Array(Type.String(), {
        description: 'Actions requiring human-in-the-loop approval',
    }),
    monitoring_requirements: Type.Array(Type.String(), {
        description: 'Required monitoring for this ensemble configuration',
    }),
}, { additionalProperties: false });
export const EnsembleCapabilityProfileSchema = Type.Object({
    profile_id: Type.String({ format: 'uuid' }),
    ensemble_strategy: EnsembleStrategySchema,
    models: Type.Array(Type.String({
        minLength: 1,
        pattern: '^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)?$',
        description: 'Model identifier (lowercase alphanumeric with hyphens/dots, optional namespace)',
        'x-references': [{ target_schema: 'ModelProviderSpec', target_field: 'model_id', relationship: 'references' }],
    }), {
        minItems: 2,
        description: 'Model identifiers in the ensemble',
    }),
    individual_capabilities: Type.Record(Type.String(), Type.Array(Type.String()), { description: 'Per-model capability declarations' }),
    emergent_capabilities: Type.Array(Type.String(), {
        description: 'Capabilities that emerge only from ensemble combination',
    }),
    capability_evidence: Type.Array(CapabilityEvidenceSchema, {
        description: 'Evidence supporting capability claims',
    }),
    safety_profile: Type.Optional(SafetyProfileSchema),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, {
    $id: 'EnsembleCapabilityProfile',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Collective capability declaration for model ensembles (patchwork AGI hypothesis).',
});
//# sourceMappingURL=ensemble-capability-profile.js.map