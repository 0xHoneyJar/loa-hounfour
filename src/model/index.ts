/**
 * Model sub-package barrel.
 *
 * Re-exports ModelPort schemas (completion, capabilities, wire messages,
 * tools), ensemble strategies, routing schemas, and model vocabulary.
 */

// Schemas — ModelPort (v5.0.0)
export {
  CompletionRequestSchema,
  type CompletionRequest,
} from '../schemas/model/completion-request.js';

export {
  CompletionResultSchema,
  type CompletionResult,
} from '../schemas/model/completion-result.js';

export {
  ModelCapabilitiesSchema,
  type ModelCapabilities,
} from '../schemas/model/model-capabilities.js';

export {
  ProviderWireMessageSchema,
  type ProviderWireMessage,
} from '../schemas/model/provider-wire-message.js';

export {
  ToolDefinitionSchema,
  type ToolDefinition,
} from '../schemas/model/tool-definition.js';

export {
  ToolResultSchema,
  type ToolResult,
} from '../schemas/model/tool-result.js';

// Schemas — Ensemble (v5.0.0)
export {
  EnsembleStrategySchema,
  type EnsembleStrategy,
} from '../schemas/model/ensemble/ensemble-strategy.js';

export {
  EnsembleRequestSchema,
  type EnsembleRequest,
} from '../schemas/model/ensemble/ensemble-request.js';

export {
  EnsembleResultSchema,
  type EnsembleResult,
} from '../schemas/model/ensemble/ensemble-result.js';

// Schemas — Routing (v5.0.0)
export { ExecutionModeSchema } from '../schemas/model/routing/execution-mode.js';

export { ProviderTypeSchema } from '../schemas/model/routing/provider-type.js';

export {
  AgentRequirementsSchema,
  type AgentRequirements,
} from '../schemas/model/routing/agent-requirements.js';

export {
  BudgetScopeSchema,
  type BudgetScope,
} from '../schemas/model/routing/budget-scope.js';

export {
  RoutingResolutionSchema,
  type RoutingResolution,
} from '../schemas/model/routing/routing-resolution.js';

// Vocabulary — Metadata Namespaces
export {
  METADATA_NAMESPACES,
  MODEL_METADATA_KEYS,
  BILLING_METADATA_KEYS,
  isValidMetadataKey,
  getNamespaceOwner,
  type MetadataNamespace,
  type ModelMetadataKey,
  type BillingMetadataKey,
} from '../vocabulary/metadata.js';

// Schemas — Routing Constraint
export {
  RoutingConstraintSchema,
  type RoutingConstraint,
} from '../schemas/routing-constraint.js';
