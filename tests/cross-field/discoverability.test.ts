import { describe, it, expect } from 'vitest';
import { getCrossFieldValidatorSchemas } from '../../src/validators/index.js';
import { ConversationSealingPolicySchema, AccessPolicySchema } from '../../src/schemas/conversation.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';
import { PerformanceRecordSchema } from '../../src/schemas/performance-record.js';
import { EscrowEntrySchema } from '../../src/schemas/escrow-entry.js';
import { StakePositionSchema } from '../../src/schemas/stake-position.js';
import { MutualCreditSchema } from '../../src/schemas/mutual-credit.js';
import { CommonsDividendSchema } from '../../src/schemas/commons-dividend.js';
import { DisputeRecordSchema } from '../../src/schemas/dispute-record.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';
import { CompletionRequestSchema } from '../../src/schemas/model/completion-request.js';
import { CompletionResultSchema } from '../../src/schemas/model/completion-result.js';
import { ProviderWireMessageSchema } from '../../src/schemas/model/provider-wire-message.js';
import { EnsembleRequestSchema } from '../../src/schemas/model/ensemble/ensemble-request.js';
import { EnsembleResultSchema } from '../../src/schemas/model/ensemble/ensemble-result.js';
import { BudgetScopeSchema } from '../../src/schemas/model/routing/budget-scope.js';
import { ConstraintProposalSchema } from '../../src/schemas/model/constraint-proposal.js';

describe('getCrossFieldValidatorSchemas()', () => {
  const registeredIds = getCrossFieldValidatorSchemas();

  const expectedSchemas = [
    'ConversationSealingPolicy',
    'AccessPolicy',
    'BillingEntry',
    'PerformanceRecord',
    'EscrowEntry',
    'StakePosition',
    'MutualCredit',
    'CommonsDividend',
    'DisputeRecord',
    'Sanction',
    'ReputationScore',
    // v5.0.0 — ModelPort
    'CompletionRequest',
    'CompletionResult',
    'ProviderWireMessage',
    // v5.0.0 — Ensemble & Routing
    'EnsembleRequest',
    'EnsembleResult',
    'BudgetScope',
    // v5.0.0 — Constraint Evolution
    'ConstraintProposal',
    // SagaContext
    'SagaContext',
    // v5.1.0 — Protocol Constitution
    'ModelProviderSpec',
  ];

  it('returns an array of strings', () => {
    expect(Array.isArray(registeredIds)).toBe(true);
    for (const id of registeredIds) {
      expect(typeof id).toBe('string');
    }
  });

  for (const schemaId of expectedSchemas) {
    it(`includes "${schemaId}"`, () => {
      expect(registeredIds).toContain(schemaId);
    });
  }

  it('has exactly the expected number of registered schemas', () => {
    expect(registeredIds.length).toBe(expectedSchemas.length);
  });
});

describe('x-cross-field-validated annotation', () => {
  const annotatedSchemas = [
    { name: 'ConversationSealingPolicy', schema: ConversationSealingPolicySchema },
    { name: 'AccessPolicy', schema: AccessPolicySchema },
    { name: 'BillingEntry', schema: BillingEntrySchema },
    { name: 'PerformanceRecord', schema: PerformanceRecordSchema },
    { name: 'EscrowEntry', schema: EscrowEntrySchema },
    { name: 'StakePosition', schema: StakePositionSchema },
    { name: 'MutualCredit', schema: MutualCreditSchema },
    { name: 'CommonsDividend', schema: CommonsDividendSchema },
    { name: 'DisputeRecord', schema: DisputeRecordSchema },
    { name: 'Sanction', schema: SanctionSchema },
    { name: 'ReputationScore', schema: ReputationScoreSchema },
    // v5.0.0 — ModelPort
    { name: 'CompletionRequest', schema: CompletionRequestSchema },
    { name: 'CompletionResult', schema: CompletionResultSchema },
    { name: 'ProviderWireMessage', schema: ProviderWireMessageSchema },
    // v5.0.0 — Ensemble & Routing
    { name: 'EnsembleRequest', schema: EnsembleRequestSchema },
    { name: 'EnsembleResult', schema: EnsembleResultSchema },
    { name: 'BudgetScope', schema: BudgetScopeSchema },
    // v5.0.0 — Constraint Evolution
    { name: 'ConstraintProposal', schema: ConstraintProposalSchema },
  ];

  for (const { name, schema } of annotatedSchemas) {
    it(`${name} has x-cross-field-validated: true`, () => {
      expect((schema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
    });
  }

  it('every schema with a cross-field validator has the annotation', () => {
    const registeredIds = getCrossFieldValidatorSchemas();
    for (const { name, schema } of annotatedSchemas) {
      if (registeredIds.includes(name)) {
        expect((schema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
      }
    }
  });
});
