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
