import { Type } from '@sinclair/typebox';
/**
 * Conformance level vocabulary for provider trust verification.
 *
 * Graduated trust model (Ostrom Principle 1 — Boundaries):
 * - self_declared: Provider asserts conformance without verification
 * - community_verified: Conformance vectors pass community review
 * - protocol_certified: Full conformance suite + governance approval
 */
export const ConformanceLevelSchema = Type.Union([
    Type.Literal('self_declared'),
    Type.Literal('community_verified'),
    Type.Literal('protocol_certified'),
], {
    $id: 'ConformanceLevel',
    description: 'Trust level assigned to a provider based on conformance verification depth.',
});
/** Ordered levels from least to most trusted. */
export const CONFORMANCE_LEVEL_ORDER = {
    self_declared: 1,
    community_verified: 2,
    protocol_certified: 3,
};
//# sourceMappingURL=conformance-level.js.map