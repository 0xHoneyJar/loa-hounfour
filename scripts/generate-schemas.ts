/**
 * Generate JSON Schema 2020-12 files from TypeBox definitions.
 *
 * Outputs to schemas/ directory for cross-language consumption.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JwtClaimsSchema, S2SJwtClaimsSchema } from '../src/schemas/jwt-claims.js';
import { InvokeResponseSchema, UsageReportSchema } from '../src/schemas/invoke-response.js';
import { StreamEventSchema } from '../src/schemas/stream-events.js';
import { RoutingPolicySchema } from '../src/schemas/routing-policy.js';
import { AgentDescriptorSchema } from '../src/schemas/agent-descriptor.js';
import { AgentLifecycleStateSchema } from '../src/schemas/agent-lifecycle.js';
import { BillingEntrySchema, CreditNoteSchema } from '../src/schemas/billing-entry.js';
import { ConversationSchema, MessageSchema } from '../src/schemas/conversation.js';
import { TransferSpecSchema, TransferEventSchema } from '../src/schemas/transfer-spec.js';
import { DomainEventSchema, DomainEventBatchSchema } from '../src/schemas/domain-event.js';
import { LifecycleTransitionPayloadSchema } from '../src/schemas/lifecycle-event-payload.js';
import { CapabilitySchema, CapabilityQuerySchema, CapabilityResponseSchema } from '../src/schemas/capability.js';
import { ProtocolDiscoverySchema } from '../src/schemas/discovery.js';
import { SagaContextSchema } from '../src/schemas/saga-context.js';
import { HealthStatusSchema } from '../src/schemas/health-status.js';
import { ThinkingTraceSchema } from '../src/schemas/thinking-trace.js';
import { ToolCallSchema } from '../src/schemas/tool-call.js';
import { RoutingConstraintSchema } from '../src/schemas/routing-constraint.js';
import { PerformanceRecordSchema } from '../src/schemas/performance-record.js';
import { ContributionRecordSchema } from '../src/schemas/contribution-record.js';
import { SanctionSchema } from '../src/schemas/sanction.js';
import { DisputeRecordSchema } from '../src/schemas/dispute-record.js';
import { ValidatedOutcomeSchema } from '../src/schemas/validated-outcome.js';
import { ReputationScoreSchema } from '../src/schemas/reputation-score.js';
import { EscrowEntrySchema } from '../src/schemas/escrow-entry.js';
import { StakePositionSchema } from '../src/schemas/stake-position.js';
import { CommonsDividendSchema } from '../src/schemas/commons-dividend.js';
import { MutualCreditSchema } from '../src/schemas/mutual-credit.js';
// v5.0.0 — ModelPort
import { CompletionRequestSchema } from '../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../src/schemas/model/completion-result.js';
import { ModelCapabilitiesSchema } from '../src/schemas/model/model-capabilities.js';
import { ProviderWireMessageSchema } from '../src/schemas/model/provider-wire-message.js';
import { ToolDefinitionSchema } from '../src/schemas/model/tool-definition.js';
import { ToolResultSchema } from '../src/schemas/model/tool-result.js';
// v5.0.0 — Ensemble
import { EnsembleRequestSchema } from '../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../src/schemas/model/ensemble/ensemble-result.js';
// v5.0.0 — Routing
import { AgentRequirementsSchema } from '../src/schemas/model/routing/agent-requirements.js';
import { BudgetScopeSchema } from '../src/schemas/model/routing/budget-scope.js';
import { RoutingResolutionSchema } from '../src/schemas/model/routing/routing-resolution.js';
// v5.0.0 — Constraint Evolution
import { ConstraintProposalSchema } from '../src/schemas/model/constraint-proposal.js';
// v5.1.0 — Protocol Constitution
import { ModelProviderSpecSchema } from '../src/schemas/model/model-provider-spec.js';
import { ConformanceLevelSchema } from '../src/schemas/model/conformance-level.js';
import { ConformanceVectorSchema } from '../src/schemas/model/conformance-vector.js';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../src/version.js';
import { postProcessSchema } from './schema-postprocess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'schemas');

const schemas = [
  { name: 'jwt-claims', schema: JwtClaimsSchema },
  { name: 's2s-jwt-claims', schema: S2SJwtClaimsSchema },
  { name: 'invoke-response', schema: InvokeResponseSchema },
  { name: 'usage-report', schema: UsageReportSchema },
  { name: 'stream-event', schema: StreamEventSchema },
  { name: 'routing-policy', schema: RoutingPolicySchema },
  // v2.0.0
  { name: 'agent-descriptor', schema: AgentDescriptorSchema },
  { name: 'agent-lifecycle-state', schema: AgentLifecycleStateSchema },
  { name: 'billing-entry', schema: BillingEntrySchema },
  { name: 'credit-note', schema: CreditNoteSchema },
  { name: 'conversation', schema: ConversationSchema },
  { name: 'message', schema: MessageSchema },
  { name: 'transfer-spec', schema: TransferSpecSchema },
  { name: 'transfer-event', schema: TransferEventSchema },
  { name: 'domain-event', schema: DomainEventSchema },
  // v2.1.0
  { name: 'domain-event-batch', schema: DomainEventBatchSchema },
  { name: 'lifecycle-transition-payload', schema: LifecycleTransitionPayloadSchema },
  // v2.2.0
  { name: 'capability', schema: CapabilitySchema },
  { name: 'capability-query', schema: CapabilityQuerySchema },
  { name: 'capability-response', schema: CapabilityResponseSchema },
  { name: 'protocol-discovery', schema: ProtocolDiscoverySchema },
  { name: 'saga-context', schema: SagaContextSchema },
  // v3.1.0
  { name: 'health-status', schema: HealthStatusSchema },
  { name: 'thinking-trace', schema: ThinkingTraceSchema },
  { name: 'tool-call', schema: ToolCallSchema },
  // v4.0.0
  { name: 'routing-constraint', schema: RoutingConstraintSchema },
  // v4.1.0
  { name: 'performance-record', schema: PerformanceRecordSchema },
  { name: 'contribution-record', schema: ContributionRecordSchema },
  // v4.2.0
  { name: 'sanction', schema: SanctionSchema },
  { name: 'dispute-record', schema: DisputeRecordSchema },
  { name: 'validated-outcome', schema: ValidatedOutcomeSchema },
  // v4.3.0
  { name: 'reputation-score', schema: ReputationScoreSchema },
  // v4.4.0
  { name: 'escrow-entry', schema: EscrowEntrySchema },
  { name: 'stake-position', schema: StakePositionSchema },
  { name: 'commons-dividend', schema: CommonsDividendSchema },
  { name: 'mutual-credit', schema: MutualCreditSchema },
  // v5.0.0 — ModelPort
  { name: 'completion-request', schema: CompletionRequestSchema },
  { name: 'completion-result', schema: CompletionResultSchema },
  { name: 'model-capabilities', schema: ModelCapabilitiesSchema },
  { name: 'provider-wire-message', schema: ProviderWireMessageSchema },
  { name: 'tool-definition', schema: ToolDefinitionSchema },
  { name: 'tool-result', schema: ToolResultSchema },
  // v5.0.0 — Ensemble
  { name: 'ensemble-request', schema: EnsembleRequestSchema },
  { name: 'ensemble-result', schema: EnsembleResultSchema },
  // v5.0.0 — Routing
  { name: 'agent-requirements', schema: AgentRequirementsSchema },
  { name: 'budget-scope', schema: BudgetScopeSchema },
  { name: 'routing-resolution', schema: RoutingResolutionSchema },
  // v5.0.0 — Constraint Evolution
  { name: 'constraint-proposal', schema: ConstraintProposalSchema },
  // v5.1.0 — Protocol Constitution
  { name: 'model-provider-spec', schema: ModelProviderSpecSchema },
  { name: 'conformance-level', schema: ConformanceLevelSchema },
  { name: 'conformance-vector', schema: ConformanceVectorSchema },
];

mkdirSync(outDir, { recursive: true });

for (const { name, schema } of schemas) {
  const jsonSchema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...schema,
    // Override TypeBox $id with versioned URI (must come after spread)
    $id: `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}`,
    $comment: (schema as Record<string, unknown>).$comment
      ? `contract_version=${CONTRACT_VERSION}, min_supported=${MIN_SUPPORTED_VERSION}. ${(schema as Record<string, unknown>).$comment}`
      : `contract_version=${CONTRACT_VERSION}, min_supported=${MIN_SUPPORTED_VERSION}`,
  };

  // Apply post-generation transforms (cross-field constraints, etc.)
  postProcessSchema(name, jsonSchema);

  const path = join(outDir, `${name}.schema.json`);
  writeFileSync(path, JSON.stringify(jsonSchema, null, 2) + '\n');
  console.log(`Generated: ${path}`);
}

console.log(`\n${schemas.length} schemas generated.`);

// Generate schemas/index.json — machine-readable schema registry
const index = {
  $schema: 'https://schemas.0xhoneyjar.com/loa-hounfour/index',
  version: CONTRACT_VERSION,
  min_supported_version: MIN_SUPPORTED_VERSION,
  generated_at: new Date().toISOString(),
  schemas: schemas.map(({ name, schema }) => ({
    name,
    $id: `https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}`,
    file: `${name}.schema.json`,
    description: (schema as Record<string, unknown>).description ?? schema.$id ?? name,
  })),
};

const indexPath = join(outDir, 'index.json');
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`Generated: ${indexPath}`);

// Generate schemas/README.md — human-readable schema catalog
const readmeLines = [
  '# Schema Registry',
  '',
  `**Contract version:** ${CONTRACT_VERSION}`,
  `**Min supported:** ${MIN_SUPPORTED_VERSION}`,
  `**Schemas:** ${schemas.length}`,
  '',
  '## Schemas',
  '',
  '| Schema | $id | File |',
  '|--------|-----|------|',
  ...schemas.map(({ name }) =>
    `| ${name} | \`https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/${name}\` | [${name}.schema.json](${name}.schema.json) |`,
  ),
  '',
  '## Usage',
  '',
  '```bash',
  '# Fetch a schema by $id',
  `curl https://schemas.0xhoneyjar.com/loa-hounfour/${CONTRACT_VERSION}/billing-entry`,
  '```',
  '',
  '## Programmatic Access',
  '',
  '```ts',
  "import index from './index.json';",
  "// index.schemas[0].$id → 'https://schemas.0xhoneyjar.com/loa-hounfour/...'",
  '```',
  '',
  `> Generated by \`npm run schema:generate\` — do not edit manually.`,
  '',
];

const readmePath = join(outDir, 'README.md');
writeFileSync(readmePath, readmeLines.join('\n'));
console.log(`Generated: ${readmePath}`);
