/**
 * Model sub-package barrel.
 *
 * Re-exports ModelPort schemas (completion, capabilities, wire messages,
 * tools), ensemble strategies, routing schemas, and model vocabulary.
 */
// Schemas — ModelPort (v5.0.0)
export { CompletionRequestSchema, } from '../schemas/model/completion-request.js';
export { CompletionResultSchema, } from '../schemas/model/completion-result.js';
export { ModelCapabilitiesSchema, } from '../schemas/model/model-capabilities.js';
export { ProviderWireMessageSchema, } from '../schemas/model/provider-wire-message.js';
export { ToolDefinitionSchema, } from '../schemas/model/tool-definition.js';
export { ToolResultSchema, } from '../schemas/model/tool-result.js';
// Schemas — Ensemble (v5.0.0)
export { EnsembleStrategySchema, } from '../schemas/model/ensemble/ensemble-strategy.js';
export { EnsembleRequestSchema, } from '../schemas/model/ensemble/ensemble-request.js';
export { EnsembleResultSchema, } from '../schemas/model/ensemble/ensemble-result.js';
// Schemas — Routing (v5.0.0)
export { ExecutionModeSchema } from '../schemas/model/routing/execution-mode.js';
export { ProviderTypeSchema, KNOWN_PROVIDER_TYPES, isKnownProviderType, } from '../schemas/model/routing/provider-type.js';
export { AgentRequirementsSchema, } from '../schemas/model/routing/agent-requirements.js';
export { BudgetScopeSchema, } from '../schemas/model/routing/budget-scope.js';
export { RoutingResolutionSchema, } from '../schemas/model/routing/routing-resolution.js';
// Schemas — Constraint Evolution (v5.0.0)
export { ConstraintProposalSchema, } from '../schemas/model/constraint-proposal.js';
// v5.1.0 — Protocol Constitution
export { ModelProviderSpecSchema, ModelPricingSchema, ModelEntrySchema, ModelStatusSchema, ProviderEndpointsSchema, ProviderSLASchema, ConformanceVectorResultSchema, } from '../schemas/model/model-provider-spec.js';
export { ConformanceLevelSchema, CONFORMANCE_LEVEL_ORDER, } from '../schemas/model/conformance-level.js';
// v5.1.0 — Conformance Vectors
export { ConformanceVectorSchema, MatchingRulesSchema, CrossFieldExpectationSchema, } from '../schemas/model/conformance-vector.js';
// Vocabulary — Conformance Categories (v5.1.0)
export { ConformanceCategorySchema, CONFORMANCE_CATEGORIES, } from '../vocabulary/conformance-category.js';
// Utilities — Conformance Matching (v5.1.0)
export { matchConformanceOutput, } from '../utilities/conformance-matcher.js';
// Vocabulary — Provider Display Names (v5.1.0)
export { PROVIDER_DISPLAY_NAMES, getProviderDisplayName, } from '../vocabulary/provider-display-names.js';
// Vocabulary — Metadata Namespaces
export { METADATA_NAMESPACES, MODEL_METADATA_KEYS, BILLING_METADATA_KEYS, isValidMetadataKey, getNamespaceOwner, } from '../vocabulary/metadata.js';
// Schemas — Routing Constraint
export { RoutingConstraintSchema, } from '../schemas/routing-constraint.js';
// v5.2.0 — JWS Signature Utilities
export { canonicalizeProviderSpec, verifyProviderSignature, } from '../utilities/signature.js';
// v5.2.0 — Agent Capacity Reservation
export { AgentCapacityReservationSchema, } from '../schemas/model/routing/agent-capacity-reservation.js';
// v5.4.0 — Delegation Chain (FR-1)
export { DelegationChainSchema, DelegationLinkSchema, } from '../schemas/model/routing/delegation-chain.js';
// v5.4.0 — BudgetScope Preference Signal (FR-4)
export { PreferenceSignalSchema, } from '../schemas/model/routing/budget-scope.js';
// v5.4.0 — Ensemble Capability Profile (FR-5)
export { EnsembleCapabilityProfileSchema, CapabilityEvidenceSchema, SafetyProfileSchema, } from '../schemas/model/ensemble/ensemble-capability-profile.js';
// v5.2.0 — Reservation Policy (on ModelProviderSpec)
export { ReservationPolicySchema, } from '../schemas/model/model-provider-spec.js';
// v5.2.0 — Reservation Vocabulary
export { ReservationTierSchema, RESERVATION_TIER_MAP, } from '../vocabulary/reservation-tier.js';
export { ReservationEnforcementSchema, RESERVATION_ENFORCEMENT_MODES, } from '../vocabulary/reservation-enforcement.js';
export { ReservationStateSchema, RESERVATION_STATES, RESERVATION_STATE_TRANSITIONS, isValidReservationTransition, } from '../vocabulary/reservation-state.js';
// v5.2.0 — Reservation Utilities
export { computeReservedMicro, validateReservationTier, shouldAllowRequest, } from '../utilities/reservation.js';
//# sourceMappingURL=index.js.map