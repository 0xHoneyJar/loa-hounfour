<!-- docs-version: 7.0.0 -->

# Schema Changelog

Per-schema evolution tracking for `@0xhoneyjar/loa-hounfour`. Each entry records what changed, when, and why — enabling consumers to answer "what's different between versions?" at the schema level.

> Inspired by Confluent's Schema Registry for Kafka, which tracks schema evolution across versions and enforces compatibility rules.

---

## v7.0.0

**Theme:** Coordination — saga patterns, conflict resolution, governance proposals, monetary policy coupling.

### New Schemas

#### `BridgeTransferSaga` (composition)
- Garcia-Molina saga pattern for cross-registry value transfer
- 8-state machine: `initiated` → `reserving` → `transferring` → `settling` → `settled`, with compensation steps
- Participant tracking, timeout enforcement, amount conservation invariants
- `additionalProperties: false`

#### `DelegationOutcome` (governance/composition)
- Conflict resolution recording with 4 outcome types: `unanimous`, `majority`, `deadlock`, `escalation`
- First-class `DissentRecord` capturing minority opinion
- `additionalProperties: false`

#### `MonetaryPolicy` (economy/composition)
- Coupling invariant binding `MintingPolicyConfig` to `ConservationPropertyRegistry`
- Governance review triggers for policy changes
- `additionalProperties: false`

#### `PermissionBoundary` (governance/composition)
- MAY permission semantics with `ReportingRequirement` and `RevocationPolicy`
- Enables constrained experimentation alongside MUST/MUST_NOT prohibitions
- `additionalProperties: false`

#### `GovernanceProposal` (governance/composition)
- Collective decision mechanism with weighted voting (Ostrom Principle 3)
- Proposal status state machine and `ProposedChange` descriptors
- `additionalProperties: false`

### Breaking Changes

#### `RegistryBridge` — required `transfer_protocol` field
- Existing bridge instances must add `transfer_protocol: { saga_type: 'atomic' }` (or `'choreography'`)
- See [MIGRATION.md](./MIGRATION.md)

### New Builtins (23 → 31)

| Builtin | Purpose |
|---------|---------|
| `saga_amount_conserved` | Validate saga step amounts balance |
| `saga_steps_sequential` | Validate unique step IDs |
| `saga_timeout_valid` | Validate step durations within limits |
| `outcome_consensus_valid` | Validate consensus outcome consistency |
| `monetary_policy_solvent` | Validate supply within ceiling |
| `permission_boundary_active` | Validate boundary completeness |
| `proposal_quorum_met` | Validate weighted vote quorum |
| `proposal_weights_normalized` | Validate weights sum to 1.0 |

### New Constraints
- 5 new constraint files: `BridgeTransferSaga.constraints.json`, `DelegationOutcome.constraints.json`, `MonetaryPolicy.constraints.json`, `PermissionBoundary.constraints.json`, `GovernanceProposal.constraints.json`

### Fixes
- **F-007** — `as any` cast for `x-cross-field-validated` replaced with `withAnnotation<T>()` utility
- **F-008** — `BridgeInvariant.invariant_id` pattern expanded from `^B-\d{1,2}$` to `^B-\d{1,4}$`
- **F-020** — `parseExpr()` return type safety restored with `ConstraintASTNode` discriminated union + `asRecord()` utility eliminating 14 `as any` casts

### Version Bump
- `CONTRACT_VERSION`: `6.0.0` → `7.0.0`
- `MIN_SUPPORTED_VERSION`: `5.0.0` → `6.0.0`

---

## v6.0.0

**Theme:** Composition — liveness properties, scoped trust, registry bridging, delegation trees, schema graph operations.

### New Schemas

#### `LivenessProperty` (composition)
- 6 temporal logic properties with bounded LTL formalization
- Expresses temporal guarantees over schema evolution

#### `CapabilityScopedTrust` (composition)
- 6 trust dimensions: `data_access`, `financial`, `delegation`, `model_selection`, `governance`, `external_communication`
- Replaces flat `trust_level` with per-capability trust scoping
- Trust levels per scope: `restricted`, `provisional`, `verified`, `audited`

#### `RegistryBridge` (composition)
- Cross-economy bridge treaty with `BridgeInvariant`, `ExchangeRateSpec`, `SettlementPolicy`
- Connects isolated economic registries for inter-economy operations

#### `DelegationTree` (composition)
- Recursive tree structure for delegation hierarchies
- `chainToTree()` / `treeToChain()` converters for chain ↔ tree interop

### Breaking Changes

#### `AgentIdentity.trust_level` replaced by `trust_scopes`
- Flat `trust_level` field removed in favor of `trust_scopes: CapabilityScopedTrust`
- 6-dimensional capability-scoped trust replaces single trust value
- See [MIGRATION.md](./MIGRATION.md) for mapping guide

### New Features

#### Constraint type system
- `type_signature` field on constraints for static type information
- CI-time validation via `validateConstraintFile()`

#### Schema graph operations
- `extractReferences()` — extract cross-schema references from a schema
- `buildSchemaGraph()` — build dependency graph from schema set
- Cycle detection, reachability, topological sort

#### Constraint type checker
- Static validation of constraint expressions against declared type signatures

### New Builtins (18 → 23)

| Builtin | Purpose |
|---------|---------|
| `tree_budget_conserved` | Validate delegation tree budget conservation |
| `tree_authority_narrowing` | Validate authority narrows down the tree |
| `trust_scopes_valid` | Validate trust scope completeness |
| `object_keys_subset` | Validate object keys are subset of allowed set |
| `unique_values` | Validate array contains unique values |

---

## v5.5.0

**Theme:** Conservation — formal safety properties, branded types, JWT boundaries, evaluator specs.

### New Schemas

#### `ConservationPropertyRegistry` (core/composition)
- 14 conservation invariants with LTL formalization for economic safety properties
- Tracks invariant coverage across the schema graph

#### `JwtBoundarySpec` (core)
- JWT verification pipeline specification with canonical 6-step verification
- Boundary enforcement for authentication tokens

#### `AgentIdentity` (core)
- Unified agent identity schema with trust levels, capabilities, and registration metadata
- Foundation for scoped trust introduced in v6.0.0

### New Features

#### Branded arithmetic types
- `MicroUSD`, `BasisPoints`, `AccountId` with compile-time unit safety via TypeScript branded types
- Prevents cross-unit arithmetic errors at the type level

#### Evaluator builtin specifications
- `EVALUATOR_BUILTIN_SPECS` map with signature, description, examples, and edge cases for all builtins
- Provides self-documenting builtin registry

#### Cross-schema reference graph
- `x-references` annotations enabling automated dependency tracking between schemas

### New Builtins (10 → 18)
- Conservation builtins, BigInt builtins, and registry builtins added (8 total)

---

## v5.4.0

**Theme:** Agent Economy — delegation chains, inter-agent audit, ensemble capabilities.

### New Schemas

#### `DelegationChain` (governance)
- Multi-step delegation with authority narrowing
- Each link in the chain constrains permissions relative to its parent

#### `InterAgentTransactionAudit` (economy)
- Cross-agent transaction audit trail
- Enables tracing of value flow between agents

#### `EnsembleCapabilityProfile` (model)
- Multi-model ensemble capability declaration
- Describes what an ensemble of models can jointly achieve

### Schema Modifications

#### `GovernanceConfig` — sandbox mode
- `sandbox` field for testing governance rules without enforcement

#### `BudgetScope` — preference field
- `preference` field for agent-level budget preferences

---

## v5.3.0

**Theme:** Epistemic Release — three-valued logic, constraint proposals, conformance surfaces.

### New Schemas / Types

#### `EpistemicTristate` (constraints)
- Three-valued logic: `affirmed`, `denied`, `unknown`
- Enables conservation constraints to express uncertainty rather than forcing binary outcomes

#### `ConstraintProposal` (constraints)
- Agent-authored constraint proposals
- Allows agents to propose new constraints for governance review

### New Features

#### Conformance surface formalization
- Formal definition of the conformance surface for schema validation
- Provides a boundary between "validated" and "unvalidated" data

---

## v5.2.0

**Theme:** Agent Rights — resource reservation, structured audit logging.

### New Schemas

#### `AgentCapacityReservation` (model)
- Resource reservation for agents
- Ensures agents can reserve compute capacity before execution

#### `AuditTrailEntry` (governance)
- Structured audit logging
- Canonical format for recording agent actions and governance events

---

## v5.1.0

**Theme:** Provider Conformance & Severity Ladders — model provider registry, conformance vectors, graduated sanctions.

### New Schemas

#### `ModelProviderSpec` (model)
- Provider registry entry with capabilities, pricing, and conformance level
- Enables multi-provider ecosystems with consistent capability description

#### `ConformanceLevel` (model)
- Trust vocabulary: `self_declared`, `community_verified`, `protocol_certified`
- Graduated trust for provider claims

#### `ConformanceVector` (model)
- Golden test vectors for provider conformance validation
- Machine-readable test cases for verifying provider behavior

#### `SanctionSeverity` (governance)
- Graduated severity vocabulary with severity ladder
- Excludes `terminated` (reserved for lifecycle state)

#### `ReconciliationMode` (economy)
- Pricing reconciliation mode: `protocol_authoritative`, `provider_invoice_authoritative`
- Governs how pricing disputes between protocol and provider are resolved

#### `ProviderSummary` (core)
- Provider summary for discovery documents
- Embedded in `ProtocolDiscovery.providers` array

### Schema Modifications

#### `BillingEntry` — new optional fields
- `source_completion_id` — UUID linking to CompletionResult
- `pricing_snapshot` — Pricing rates used for computation
- `reconciliation_mode` — How pricing disputes are resolved
- `reconciliation_delta_micro` — Delta between computed and invoiced cost

#### `CompletionResult` — new optional field
- `pricing_applied` — Pricing rates actually applied

#### `Sanction` — new optional fields
- `severity_level` — Graduated severity (excludes `terminated`)
- `duration_seconds` — Duration (0 = indefinite)
- `appeal_dispute_id` — UUID linking to DisputeRecord
- `escalated_from` — Predecessor sanction_id

#### `ProtocolDiscovery` — new optional fields
- `providers` — Array of ProviderSummary
- `conformance_suite_version` — Conformance suite version

### New Utilities

| Function | Description |
|----------|-------------|
| `computeCostMicro(pricing, usage)` | BigInt-safe pricing computation |
| `computeCostMicroSafe(pricing, usage)` | Never-throw variant |
| `verifyPricingConservation(billing, usage)` | Conservation audit |
| `matchConformanceOutput(expected, actual, rules)` | Conformance matching engine |
| `getSeverityEntry(severity)` | Severity ladder lookup |
| `compareSeverity(a, b)` | Severity comparison |

### Version Bump
- `CONTRACT_VERSION`: `5.0.0` → `5.1.0`
- `MIN_SUPPORTED_VERSION`: `4.0.0` → `5.0.0`

---

## v5.0.0

**Theme:** Multi-model protocol — completion, ensemble, routing, constraint grammar.

### New Schemas (14)

#### ModelPort Schemas (6)

#### `CompletionRequest` (model)
- Model completion request envelope with prompt, parameters, and tool definitions

#### `CompletionResult` (model)
- Model completion result with usage, cost, and finish reason

#### `ModelCapabilities` (model)
- Model capability descriptor: context window, modalities, tool support

#### `ProviderWireMessage` (model)
- Provider-agnostic message format for cross-provider communication

#### `ToolDefinition` (model)
- Tool definition for function calling with JSON Schema parameter specification

#### `ToolResult` (model)
- Tool execution result with typed output

#### Ensemble Schemas (3)

#### `EnsembleStrategy` (model)
- Strategy vocabulary: `first_complete`, `best_of_n`, `consensus`

#### `EnsembleRequest` (model)
- Multi-model ensemble request with strategy and candidate models

#### `EnsembleResult` (model)
- Multi-model ensemble result with cost aggregation across candidates

#### Routing Schemas (5)

#### `AgentRequirements` (model)
- Agent model requirement declaration — minimum capabilities needed

#### `BudgetScope` (model)
- Budget enforcement scope with per-project cost limits

#### `RoutingResolution` (model)
- Routing decision record — traces why a particular model was selected

#### `ExecutionMode` (model)
- Execution mode vocabulary: `native`, `remote`

#### `ProviderType` (model)
- Provider type vocabulary: `openai`, `anthropic`

### New Features

#### Sub-package barrel exports
- `@0xhoneyjar/loa-hounfour/core` — Agent, Conversation, Transfer, JWT, Health, Discovery
- `@0xhoneyjar/loa-hounfour/economy` — Billing, Escrow, Stake, Credit, Dividend
- `@0xhoneyjar/loa-hounfour/model` — Completion, Ensemble, Routing, ModelCapabilities
- `@0xhoneyjar/loa-hounfour/governance` — Sanction, Dispute, Reputation, Performance
- `@0xhoneyjar/loa-hounfour/constraints` — Constraint grammar, rule definitions

#### Constraint grammar
- JSON-serializable constraint rules for expressing schema invariants
- Imported from `@0xhoneyjar/loa-hounfour/constraints`

#### `billing.*` metadata namespace
- Reserved namespace for billing metadata keys: `billing.entry_id`, `billing.cost_micro`, `billing.reconciled`, `billing.provider`

### Breaking Changes

#### Barrel decomposition
- Sub-package barrel exports introduced — direct schema file imports may have moved
- Root barrel (`@0xhoneyjar/loa-hounfour`) continues to export everything

### Version Bump
- `CONTRACT_VERSION`: `4.4.0` → `5.0.0`
- `MIN_SUPPORTED_VERSION`: `3.0.0` → `4.0.0`

---

## v4.4.0

**Theme:** Economy — financial instruments for escrow, staking, dividends, and credit.

### New Schemas

#### `EscrowEntry` (economy)
- Escrow with 5-state machine: `created` → `funded` → `released` / `refunded` / `expired`
- `additionalProperties: false`

#### `StakePosition` (economy, experimental)
- Staking positions with vesting schedules
- `additionalProperties: false`

#### `CommonsDividend` (economy, experimental)
- Commons fund dividend distribution
- `additionalProperties: false`

#### `MutualCredit` (economy, experimental)
- Mutual credit lines between agents
- `additionalProperties: false`

### New Vocabulary
- **Economic choreography vocabulary** (`vocabulary/economic-choreography`): escrow lifecycle, staking, dividend, and credit flow choreographies

---

## v4.3.0

**Theme:** Reputation — agent reputation scoring with decay.

### New Schemas

#### `ReputationScore` (governance)
- Agent reputation score with temporal decay parameters
- `additionalProperties: false`

### New Vocabulary
- **Reputation vocabulary** (`vocabulary/reputation`): reputation scoring constants and decay parameters
- **`BillingRecipient` role extended**: `agent_performer` and `commons` roles added

---

## v4.2.0

**Theme:** Governance — sanctions, disputes, and validated outcomes.

### New Schemas

#### `Sanction` (governance)
- Governance sanction against an agent
- 5 severity levels: `warning`, `rate_limited`, `pool_restricted`, `suspended`, `terminated`
- 7 violation types: `content_policy`, `rate_abuse`, `billing_fraud`, `identity_spoofing`, `resource_exhaustion`, `community_guideline`, `safety_violation`
- `additionalProperties: false`

#### `DisputeRecord` (governance)
- Dispute filed against an agent or outcome
- `additionalProperties: false`

#### `ValidatedOutcome` (governance)
- Validated governance outcome record
- `additionalProperties: false`

### New Vocabulary
- **Sanctions vocabulary** (`vocabulary/sanctions`): severity levels, violation types, escalation rules
- **6 sanction lifecycle reason codes**: `sanction_warning_issued`, `sanction_rate_limited`, `sanction_pool_restricted`, `sanction_suspended`, `sanction_terminated`, `sanction_appealed_successfully`

---

## v4.1.0

**Theme:** Performance — agent performance and contribution tracking.

### New Schemas

#### `PerformanceRecord` (governance)
- Agent performance metrics record
- `additionalProperties: false`

#### `ContributionRecord` (governance)
- Contribution assessment for peer review
- `additionalProperties: false`

---

## v4.0.0

**Theme:** Breaking Foundation — signed currency, envelope relaxation, routing constraints, new aggregate types.

### New Schemas

#### `RoutingConstraint` (constraints)
- Routing constraint schema for model selection rules

### Breaking Changes

#### `MicroUSD` now signed by default
- Pattern changed from `^[0-9]+$` to `^-?[0-9]+$`
- `MicroUSDUnsigned` introduced for non-negative enforcement
- `MicroUSDSigned` becomes a deprecated alias for `MicroUSD`

#### `DomainEvent` / `DomainEventBatch` envelope relaxation
- Both schemas changed to `additionalProperties: true`
- Allows consumer-defined extensions on event envelopes

#### All 6 `StreamEvent` sub-schemas relaxed
- `StreamStart`, `StreamChunk`, `StreamToolCall`, `StreamUsage`, `StreamEnd`, `StreamError` — all changed to `additionalProperties: true`

### New Utilities

#### Type guards for new aggregates
| Guard | Aggregate |
|-------|-----------|
| `isPerformanceEvent()` | performance |
| `isGovernanceEvent()` | governance |
| `isReputationEvent()` | reputation |
| `isEconomyEvent()` | economy |

### Version Bump
- `CONTRACT_VERSION`: `3.2.0` → `4.4.0` (after all v4.x releases)
- `MIN_SUPPORTED_VERSION`: `2.4.0` → `3.0.0`

---

## v3.2.0

**Theme:** Ecosystem & Financial Maturity — signed currency types, credit note validation, resolvable schema URIs, and developer tooling for multi-repo adoption.

### New Types

#### `MicroUSDSigned` (vocabulary/currency)
- Signed micro-USD amount as string: `^-?[0-9]+$`
- Allows negative values for credits, refunds, and adjustments
- Companion functions: `subtractMicroSigned()`, `negateMicro()`, `isNegativeMicro()`
- Original `MicroUSD` (unsigned) unchanged — backward compatible

### New Utilities

#### `validateCreditNote(note, options?)` (utilities/billing)
- Validates CreditNote invariants: non-zero amount, recipient share sum, amount sum
- Optional `originalEntry` parameter for over-credit validation
- Returns `{ valid: boolean; errors: string[] }`

### New Constants

#### `SCHEMA_BASE_URL` (version)
- `https://schemas.0xhoneyjar.com/loa-hounfour`
- Used for resolvable JSON Schema `$id` URIs
- Format: `{SCHEMA_BASE_URL}/{CONTRACT_VERSION}/{schema-name}`

### Schema Generator Updates

- HealthStatusSchema, ThinkingTraceSchema, ToolCallSchema registered in `generate-schemas.ts`
- All generated schemas now include `$schema`, `$id` (resolvable URL), and `$comment` with version info

### Golden Vector Additions

- `vectors/health/health-status.json` — 4 valid + 5 invalid vectors
- `vectors/thinking/thinking-traces.json` — 5 valid + 4 invalid vectors

---

## v3.1.0

**Theme:** Hounfour Protocol Types & Validation Hardening — observability schemas, cross-field validation pipeline, and guard severity for structured error responses.

### New Schemas

#### `HealthStatusSchema` (schemas/health-status)
- Health check response with circuit breaker state
- Fields: `healthy`, `latency_ms`, `provider`, `model_id`, `checked_at`, `error` (optional), `circuit_state`
- `CircuitStateSchema`: `'closed' | 'open' | 'half_open'`
- `additionalProperties: false`

#### `ThinkingTraceSchema` (schemas/thinking-trace)
- Normalized thinking/reasoning trace across model providers
- Fields: `content`, `model_id`, `provider`, `tokens` (optional), `redacted`, `trace_id` (optional)
- Covers Anthropic thinking blocks, Kimi reasoning_content, OpenAI hidden reasoning
- `additionalProperties: false`

#### `ToolCallSchema` (schemas/tool-call)
- Extracted from inline `MessageSchema.tool_calls` array item definition
- Fields: `id`, `name`, `arguments`, `model_source` (optional)
- Now independently importable — consumers don't need to pick apart MessageSchema
- `additionalProperties: false`

### Schema Modifications

#### `BillingEntrySchema` — per-model cost attribution fields
- `model_id` (optional): Specific model identifier for cost breakdown
- `cost_provider` (optional): Provider name for multi-provider billing
- `pricing_model` (optional): `'per_token' | 'gpu_hourly' | 'flat_rate'`
- All fields optional — backward compatible

#### `StreamStartSchema` — execution mode field
- `execution_mode` (optional): `'native' | 'remote'`
- Indicates whether the model runs locally or via remote API

#### `MessageSchema` — ToolCallSchema reference
- `tool_calls` array now references `ToolCallSchema` instead of inline definition
- No wire format change — backward compatible

### Validation Pipeline Changes

#### Cross-field validator registry
- `registerCrossFieldValidator(schemaId, validator)` — register custom validators keyed by `$id`
- `CrossFieldValidator` type: `(data: unknown) => { valid: boolean; errors: string[]; warnings: string[] }`
- Built-in validators wired for: ConversationSealingPolicy, AccessPolicy, BillingEntry
- `validate()` now accepts `options?: { crossField?: boolean }` and returns `warnings?: string[]`

#### Validator cache constraint (BB-V3-003)
- Cache only stores schemas with `$id` field
- Schemas without `$id` compiled per-call (no caching)
- Prevents unbounded cache growth from consumer-supplied schemas

#### `validateAccessPolicy()` strict mode
- Accepts `options?: AccessPolicyValidationOptions` with `strict?: boolean`
- In strict mode, warnings (extraneous fields) become errors
- Default behavior unchanged (`strict: false`)

### Guard Severity (utilities/lifecycle)
- `GuardSeverity` type: `'client_error' | 'policy_violation'`
- `GuardResult` invalid branch gains optional `severity?: GuardSeverity`
- `requiresTransferId` → `severity: 'client_error'`
- `requiresNoActiveTransfer` → `severity: 'policy_violation'`
- `requiresReasonResolved` → `severity: 'client_error'`
- `requiresTransferCompleted` → `severity: 'client_error'`
- `isValidGuardResult()` unchanged — backward compatible

### Comment Fixes (integrity/req-hash)
- Fixed `parseEncodings` TSDoc: "brotli, then gzip" → "gzip, then brotli" (correct decompression order)
- Fixed direction annotation: "innermost-last" → "innermost-first, outermost-last"

---

## v3.0.0

**Theme:** The Sovereignty Release — replacing deprecated `previous_owner_access` with a richer `AccessPolicy` model, completing the v2.2.0 deprecation cycle.

### Breaking Changes

#### `ConversationSealingPolicy.previous_owner_access` REMOVED
- The `previous_owner_access` string field (deprecated in v2.2.0) has been **removed**
- Replaced by the structured `access_policy` optional object
- Any document containing `previous_owner_access` will be **rejected** by strict validation

#### `ConversationSealingPolicy.access_policy` ADDED (optional)
- New `AccessPolicy` sub-schema with types: `none`, `read_only`, `time_limited`, `role_based`
- Cross-field validation via `validateAccessPolicy()`:
  - `time_limited` requires `duration_hours` (1–8760)
  - `role_based` requires non-empty `roles` array
- `validateSealingPolicy()` now chains `validateAccessPolicy()` when present

### Schema Additions

#### AccessPolicy (NEW)
- Structured access control replacing the flat `previous_owner_access` string
- Fields: `type`, `duration_hours` (optional), `roles` (optional), `audit_required`, `revocable`
- `additionalProperties: false` — strict validation

### Version Bump
- `CONTRACT_VERSION`: `2.4.0` → `3.0.0`
- `MIN_SUPPORTED_VERSION`: `2.0.0` → `2.4.0` — v2.3.0 and earlier consumers will receive `CONTRACT_VERSION_MISMATCH`

### Golden Vector Updates
- All conversation vectors updated to `contract_version: "3.0.0"` with `access_policy`
- All transfer vectors updated to `contract_version: "3.0.0"` with `access_policy`
- Added conv-005 (role_based access), conv-006 (no access_policy)
- Added msg-004 (tool_calls with model_source)

---

## v2.4.0

**Theme:** Protocol Maturity — structured guard results, centralized financial arithmetic, billing validation pipeline, CI wiring.

### Utility Changes
- `TransitionGuard<T>` return type changed from `boolean` to `GuardResult` — structured rejection with `reason` and `guard` key (BB-C4-ADV-001)
- `TransitionValidator.isValid()` now returns `GuardResult` instead of `boolean` (BB-C4-ADV-001)
- `isValidGuardResult()` — type narrowing convenience function for backward compatibility
- `guardKey()` — now exported for custom guard construction
- Named guard functions exported: `requiresTransferId`, `requiresNoActiveTransfer`, `requiresReasonResolved`, `requiresTransferCompleted` (BB-C4-ADV-005)

### Vocabulary Additions
- `addMicro()`, `subtractMicro()`, `multiplyBps()`, `compareMicro()` — centralized BigInt arithmetic for micro-USD (BB-C4-ADV-006)
- `ZERO_MICRO` constant — zero in micro-USD

### Validator Additions
- `validateBillingEntryFull()` — composed validation pipeline: TypeBox schema → cross-field invariants → recipient sums (BB-C4-ADV-003)

### Schema Changes
- `Message.tool_calls[].model_source` — optional field for multi-model debugging
- `CreditNote.$comment` — documents 4 service-layer invariants (BB-ADV-003)

### Vocabulary Additions
- `METADATA_NAMESPACES.MODEL` — reserved `model.*` namespace for Hounfour multi-model routing (BB-C4-ADV-004)
- `MODEL_METADATA_KEYS` — documented keys: `model.id`, `model.provider`, `model.thinking_trace_available`, `model.context_window_used`
- `TRANSFER_INVARIANTS` — safety properties per transfer scenario: billing atomicity, seal permanence, terminal event exactly-once (BB-C4-ADV-002)
- `TransferInvariant` interface — structured invariant descriptor

### Documentation
- Choreography Mermaid diagrams: `docs/choreography/{sale,gift,admin_recovery,custody_change}.md` (BB-C4-ADV-008)
- `docs:choreography` script — generates diagrams from `TRANSFER_CHOREOGRAPHY`

### CI/Build
- `check:migration` script — runs `check-migration.ts` (BB-C4-ADV-007)
- `check:all` script — aggregates `schema:check`, `vectors:check`, `check:migration`

---

## v2.3.0

**Theme:** Protocol Resilience & Completeness — schema evolution strategy, saga choreography, capability-discovery composition, lifecycle guards.

### ProtocolDiscovery
- **Added:** `capabilities_url` optional field — URI pointer to capability negotiation endpoint, connecting discovery to capability queries (BB-POST-003)

### Vocabulary Additions
- `TRANSFER_CHOREOGRAPHY` — expected event sequences per `TransferScenario` with forward and compensation paths (BB-POST-002)

### Utility Additions
- `validateBillingEntry()` — cross-field validation: `total_cost_micro === raw_cost_micro * multiplier_bps / 10000` plus recipient invariants (BB-POST-001)
- `DEFAULT_GUARDS` — lifecycle transition guard predicates for `createTransitionValidator()` (BB-POST-004)
- `TransitionGuard` type — guard predicate signature for state machine transitions (BB-POST-004)
- `createTransitionValidator()` — now accepts optional `guards` parameter (BB-POST-004)

### Documentation
- Schema evolution migration strategy document (`MIGRATION.md`) with consumer upgrade matrix and `additionalProperties` policy catalog (BB-POST-001)
- Lifecycle guard condition TSDoc on `AGENT_LIFECYCLE_TRANSITIONS` with Kubernetes pod lifecycle parallels (BB-POST-004)

---

## v2.2.0

**Theme:** Post-Flatline Deep Excellence — trust boundaries, vocabulary, structured events, capability negotiation, and schema discovery.

### DomainEvent
- **Enhanced:** `metadata` description now includes namespace conventions: `loa.*` (protocol), `trace.*` (OpenTelemetry), `x-*` (consumer) — BB-V3-001

### DomainEventBatch
- **Added:** `context` optional field — envelope-level routing context (`transfer_id`, `aggregate_id`, `aggregate_type`) avoids payload inspection (BB-V3-010)
- **Added:** `saga` optional field — saga execution context with `saga_id`, `step`, `direction` (forward/compensation) for distributed saga tracking (BB-V3-012)

### SagaContext (NEW)
- Saga execution context for multi-step distributed operations (BB-V3-012)
- Fields: `saga_id`, `step`, `total_steps`, `direction` (forward | compensation)

### LifecycleTransitionPayload
- **Added:** `reason_code` optional field — machine-readable Kubernetes-style reason code for filtering and monitoring (BB-V3-009)
- **Enhanced:** `reason` description clarified as human-readable (was ambiguous)

### ConversationSealingPolicy
- **Added:** `$comment` documenting cross-field invariant for cross-language consumers (BB-V3-008)
- **Added:** JSON Schema `if/then` conditional validation for encryption → key_derivation constraint (BB-V3-008)
- **Deprecated:** `previous_owner_access` field — will be replaced by richer `access_policy` in v3.0.0 (BB-V3-004)

### BillingEntry
- **Enhanced:** `metadata` description now includes namespace conventions (BB-V3-001)

### InvokeResponse
- **Enhanced:** `metadata` description now includes namespace conventions (BB-V3-001)

### Capability (NEW)
- Agent capability descriptor: `skill_id`, `input_modes`, `output_modes`, `models`, `max_latency_ms` (BB-V3-005)

### CapabilityQuery (NEW)
- Capability discovery query: `required_skills`, `preferred_models`, `max_latency_ms`, `min_context_tokens` (BB-V3-005)
- `additionalProperties: true` for future extensibility

### CapabilityResponse (NEW)
- Response to capability query: `agent_id`, `capabilities[]`, `available`, `contract_version` (BB-V3-005)

### ProtocolDiscovery (NEW)
- Schema discovery document for `/.well-known/loa-hounfour` convention (BB-V3-006)
- Fields: `contract_version`, `min_supported_version`, `schemas[]`, `supported_aggregates`
- Helper: `buildDiscoveryDocument()` generates from current package state

### Vocabulary Additions
- `METADATA_NAMESPACES` — reserved metadata namespace prefixes (BB-V3-001)
- `LIFECYCLE_REASON_CODES` — 10 canonical lifecycle transition reason codes (BB-V3-009)
- `EVENT_TYPES` — 20 canonical domain event types across 6 aggregates (BB-V3-011)

### Deprecation Convention
- Established TypeBox `deprecated: true` → JSON Schema `"deprecated": true` pipeline (BB-V3-004)
- Lifecycle: add deprecated → warn → remove at major version boundary
- Exemplar: `previous_owner_access` on ConversationSealingPolicy

---

## v2.1.0

**Theme:** Bridgebuilder Excellence Refinements — extending the protocol for observability, atomic delivery, and cross-language interoperability.

### DomainEvent
- **Added:** `metadata` optional field — consumer-extensible key-value metadata not validated by protocol contract (BB-ADV-001)

### DomainEventBatch (NEW)
- New schema for atomic multi-event delivery with shared `correlation_id` (BB-ADV-004)
- Fields: `batch_id`, `correlation_id`, `events[]`, `source`, `produced_at`, `contract_version`
- Implements the transactional outbox pattern for complex operations (transfers, lifecycle transitions)

### BillingEntry
- **Added:** `metadata` optional field — consumer-extensible key-value metadata (BB-ADV-001)

### InvokeResponse
- **Added:** `metadata` optional field — provider-specific response metadata (BB-ADV-001)

### Conversation
- **Added:** `sealed_by` optional field — transfer ID that caused sealing, for causal audit trail (BB-ADV-002)

### LifecycleTransitionPayload (NEW)
- New typed payload for lifecycle transition events (BB-ADV-005)
- Fields: `agent_id`, `previous_state`, `new_state`, `reason` (required), `triggered_by`, `transfer_id`
- `LifecycleTransitionEvent` convenience type: `DomainEvent<LifecycleTransitionPayload>`

### CreditNote
- **Enhanced:** `amount_micro` and `references_billing_entry` descriptions document service-layer invariants (BB-ADV-003)

---

## v2.0.0

**Theme:** Protocol Types — agent identity, NFT binding, multi-party billing, conversation ownership, domain events.

### AgentDescriptor (NEW)
- Full agent identity with NFT binding (`nft_id`), capabilities, content negotiation
- Model preferences array, personality config, `@context` JSON-LD support
- Fields: 35+ fields covering identity, capabilities, preferences, stats

### AgentLifecycleState (NEW)
- 6-state lifecycle machine: `DORMANT` → `PROVISIONING` → `ACTIVE` → `SUSPENDED` → `TRANSFERRED` → `ARCHIVED`
- Deterministic transition map via `AGENT_LIFECYCLE_TRANSITIONS`
- `ARCHIVED` is terminal (no outgoing edges)

### BillingEntry (NEW)
- Multi-party cost attribution replacing `CostBreakdown` from v1.x
- String-encoded micro-USD (`^[0-9]+$`) prevents floating-point issues
- `recipients[]` array with `share_bps` (basis points) allocation
- Largest-remainder deterministic allocation via `allocateRecipients()`

### BillingRecipient (NEW)
- Recipient in a billing split: `address`, `role`, `share_bps`, `amount_micro`
- Roles: `provider`, `platform`, `producer`, `agent_tba`

### CostType (NEW)
- Billing cost category enum: `model_inference`, `tool_call`, `platform_fee`, `byok_subscription`, `agent_setup`

### CreditNote (NEW)
- Billing reversal referencing an original `BillingEntry`
- Reasons: `refund`, `dispute`, `partial_failure`, `adjustment`

### Conversation (NEW)
- Conversation belonging to an NFT agent (conversations transfer with the NFT)
- Statuses: `active`, `paused`, `sealed`, `archived`
- Optional `sealing_policy` for encryption during transfers

### ConversationSealingPolicy (NEW)
- Governs data handling during NFT transfers
- `encryption_scheme`: `aes-256-gcm` or `none`
- Cross-field validation via `validateSealingPolicy()` utility

### Message (NEW)
- Individual message within a conversation
- Roles: `user`, `assistant`, `system`, `tool`
- Optional `tool_calls`, `model`, `pool_id`, `billing_entry_id`

### DomainEvent (NEW)
- Generic event envelope with typed aggregate wrappers
- Three-segment dotted type convention: `{aggregate}.{noun}.{verb}`
- Convenience types: `AgentEvent`, `BillingEvent`, `ConversationEvent`, `TransferEvent`

### TransferSpec (NEW)
- NFT ownership transfer specification
- Scenarios: `sale`, `gift`, `admin_recovery`, `custody_change`
- Embeds `ConversationSealingPolicy` for data handling during transfer

### TransferEvent (NEW)
- Transfer lifecycle record with event stream
- Terminal results: `completed`, `failed`, `cancelled`

### NftId (utility)
- Canonical NFT identity format: `eip155:{chainId}/{collectionAddress}/{tokenId}`
- EIP-55 checksummed collection address via Keccak-256
- Parse/format/validate utilities

---

## v1.1.0

**Theme:** Foundation — JWT, invoke response, streaming, routing, integrity.

### JwtClaims
- JWT authentication claims with tenant, tier, issuer
- Tiers: `free`, `pro`, `enterprise`, `byok`

### S2SJwtClaims
- Service-to-service JWT with restricted scope

### InvokeResponse
- Model invocation response with billing reference
- `billing_entry_id` replaces inline `CostBreakdown` (v2.0.0 migration)

### UsageReport
- Usage reconciliation posted to arrakis
- Signed as JWS for tamper resistance

### Usage
- Token usage breakdown: `prompt_tokens`, `completion_tokens`, `reasoning_tokens`

### StreamEvent
- SSE stream event discriminated union (6 event types)
- Strict ordering invariants: start → chunks/tools → usage → end

### RoutingPolicy
- Model routing configuration with personality preferences
- Task types and pool routing rules
