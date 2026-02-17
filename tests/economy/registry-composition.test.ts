/**
 * Tests for Registry Composition schemas (S3-T1, S3-T2, S3-T3).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  BridgeEnforcementSchema,
  BridgeInvariantSchema,
  SettlementPolicySchema,
  ExchangeRateTypeSchema,
  ExchangeRateSpecSchema,
  RegistryBridgeSchema,
  CANONICAL_BRIDGE_INVARIANTS,
} from '../../src/economy/registry-composition.js';

describe('BridgeEnforcementSchema', () => {
  it('accepts atomic', () => expect(Value.Check(BridgeEnforcementSchema, 'atomic')).toBe(true));
  it('accepts eventual', () => expect(Value.Check(BridgeEnforcementSchema, 'eventual')).toBe(true));
  it('accepts manual', () => expect(Value.Check(BridgeEnforcementSchema, 'manual')).toBe(true));
  it('rejects unknown', () => expect(Value.Check(BridgeEnforcementSchema, 'lazy')).toBe(false));
});

describe('BridgeInvariantSchema', () => {
  it('accepts valid invariant', () => {
    const inv = {
      invariant_id: 'B-1',
      name: 'Conservation',
      description: 'source.debit == target.credit',
      ltl_formula: 'G(transfer → conserved)',
      enforcement: 'atomic',
    };
    expect(Value.Check(BridgeInvariantSchema, inv)).toBe(true);
  });

  it('rejects invalid invariant_id', () => {
    const inv = {
      invariant_id: 'X-99',
      name: 'Test',
      description: 'Test',
      ltl_formula: 'G(true)',
      enforcement: 'atomic',
    };
    expect(Value.Check(BridgeInvariantSchema, inv)).toBe(false);
  });

  it('rejects empty name', () => {
    const inv = {
      invariant_id: 'B-1',
      name: '',
      description: 'Test',
      ltl_formula: 'G(true)',
      enforcement: 'atomic',
    };
    expect(Value.Check(BridgeInvariantSchema, inv)).toBe(false);
  });
});

describe('SettlementPolicySchema', () => {
  it('accepts immediate', () => expect(Value.Check(SettlementPolicySchema, 'immediate')).toBe(true));
  it('accepts batched', () => expect(Value.Check(SettlementPolicySchema, 'batched')).toBe(true));
  it('accepts netting', () => expect(Value.Check(SettlementPolicySchema, 'netting')).toBe(true));
  it('rejects unknown', () => expect(Value.Check(SettlementPolicySchema, 'delayed')).toBe(false));
});

describe('ExchangeRateTypeSchema', () => {
  it('accepts fixed', () => expect(Value.Check(ExchangeRateTypeSchema, 'fixed')).toBe(true));
  it('accepts oracle', () => expect(Value.Check(ExchangeRateTypeSchema, 'oracle')).toBe(true));
  it('accepts governance', () => expect(Value.Check(ExchangeRateTypeSchema, 'governance')).toBe(true));
  it('rejects unknown', () => expect(Value.Check(ExchangeRateTypeSchema, 'market')).toBe(false));
});

describe('ExchangeRateSpecSchema', () => {
  it('accepts valid fixed rate', () => {
    const spec = {
      rate_type: 'fixed',
      value: '1.0',
      governance_proposal_required: false,
      staleness_threshold_seconds: 3600,
    };
    expect(Value.Check(ExchangeRateSpecSchema, spec)).toBe(true);
  });

  it('accepts oracle rate with endpoint', () => {
    const spec = {
      rate_type: 'oracle',
      oracle_endpoint: 'https://oracle.example.com/rate',
      governance_proposal_required: true,
      staleness_threshold_seconds: 300,
    };
    expect(Value.Check(ExchangeRateSpecSchema, spec)).toBe(true);
  });

  it('has correct $id', () => {
    expect(ExchangeRateSpecSchema.$id).toBe('ExchangeRateSpec');
  });
});

describe('RegistryBridgeSchema', () => {
  const validBridge = {
    bridge_id: '123e4567-e89b-12d3-a456-426614174000',
    source_registry_id: '123e4567-e89b-12d3-a456-426614174001',
    target_registry_id: '123e4567-e89b-12d3-a456-426614174002',
    bridge_invariants: [{
      invariant_id: 'B-1',
      name: 'Conservation',
      description: 'Conservation law',
      ltl_formula: 'G(conserved)',
      enforcement: 'atomic',
    }],
    exchange_rate: {
      rate_type: 'fixed',
      value: '1.0',
      governance_proposal_required: false,
      staleness_threshold_seconds: 3600,
    },
    settlement: 'immediate',
    contract_version: '6.0.0',
  };

  it('accepts valid bridge', () => {
    expect(Value.Check(RegistryBridgeSchema, validBridge)).toBe(true);
  });

  it('rejects empty invariants', () => {
    const bad = { ...validBridge, bridge_invariants: [] };
    expect(Value.Check(RegistryBridgeSchema, bad)).toBe(false);
  });

  it('has correct $id', () => {
    expect(RegistryBridgeSchema.$id).toBe('RegistryBridge');
  });
});

describe('CANONICAL_BRIDGE_INVARIANTS (S3-T2)', () => {
  it('has 4 entries', () => {
    expect(CANONICAL_BRIDGE_INVARIANTS).toHaveLength(4);
  });

  it('all validate against schema', () => {
    for (const inv of CANONICAL_BRIDGE_INVARIANTS) {
      expect(Value.Check(BridgeInvariantSchema, inv), `${inv.invariant_id} failed`).toBe(true);
    }
  });

  it('has unique invariant_ids', () => {
    const ids = CANONICAL_BRIDGE_INVARIANTS.map(i => i.invariant_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers B-1 through B-4', () => {
    const ids = CANONICAL_BRIDGE_INVARIANTS.map(i => i.invariant_id);
    expect(ids).toContain('B-1');
    expect(ids).toContain('B-2');
    expect(ids).toContain('B-3');
    expect(ids).toContain('B-4');
  });
});
