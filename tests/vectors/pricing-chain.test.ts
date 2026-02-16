/**
 * End-to-End Pricing Chain Integration Test (S3-T8)
 *
 * ModelProviderSpec → CompletionResult → BillingEntry full chain.
 * Validates: computeCostMicro → verifyPricingConservation → constraint evaluation.
 * Both reconciliation modes tested.
 *
 * @see SDD §4.3 Pricing Chain Diagram
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { ModelProviderSpecSchema } from '../../src/schemas/model/model-provider-spec.js';
import { CompletionResultSchema } from '../../src/schemas/model/completion-result.js';
import { BillingEntrySchema } from '../../src/schemas/billing-entry.js';
import {
  computeCostMicro,
  computeCostMicroSafe,
  verifyPricingConservation,
  type PricingInput,
} from '../../src/utilities/pricing.js';
import { validate } from '../../src/validators/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProviderSpec() {
  return {
    spec_id: '550e8400-e29b-41d4-a716-446655440000',
    provider: 'openai',
    display_name: 'OpenAI GPT-4 Turbo',
    version: '1.0.0',
    contract_version: '5.1.0',
    models: [{
      model_id: 'gpt-4-turbo',
      capabilities: {
        thinking_traces: false,
        vision: false,
        tool_calling: true,
        streaming: true,
        json_mode: true,
        native_runtime: false,
      },
      limits: { max_context_tokens: 128000, max_output_tokens: 4096 },
      pricing: {
        input_per_million_micro: '30000000',
        output_per_million_micro: '60000000',
      },
      status: 'active',
    }],
    endpoints: {
      completion: 'https://api.openai.com/v1/chat/completions',
    },
    conformance_level: 'community_verified',
    published_at: '2026-02-16T10:00:00Z',
  };
}

function makePricingInput(): PricingInput {
  return {
    input_per_million_micro: '30000000',
    output_per_million_micro: '60000000',
  };
}

// ---------------------------------------------------------------------------
// Full chain: ModelProviderSpec → CompletionResult → BillingEntry
// ---------------------------------------------------------------------------

describe('Pricing Chain E2E', () => {
  describe('full chain — protocol_authoritative', () => {
    it('end-to-end: spec declares rates, result uses them, billing is conserved', () => {
      // Step 1: Provider declares pricing via ModelProviderSpec
      const spec = makeProviderSpec();
      expect(Value.Check(ModelProviderSpecSchema, spec)).toBe(true);

      const pricing = makePricingInput();
      const usage = { prompt_tokens: 1000, completion_tokens: 500 };

      // Step 2: Compute cost from declared pricing
      const cost = computeCostMicro(pricing, usage);
      expect(cost).toBe('60000');

      // Step 3: CompletionResult records usage and cost
      const completionResult = {
        request_id: '550e8400-e29b-41d4-a716-446655440001',
        model: 'gpt-4-turbo',
        provider: 'openai',
        content: 'Test response',
        finish_reason: 'stop',
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          cost_micro: cost,
        },
        latency_ms: 200,
        pricing_applied: {
          input_per_million_micro: '30000000',
          output_per_million_micro: '60000000',
        },
        contract_version: '5.1.0',
      };
      expect(Value.Check(CompletionResultSchema, completionResult)).toBe(true);

      // Step 4: BillingEntry links to completion with provenance
      const billingEntry = {
        id: 'billing-e2e-001',
        trace_id: 'trace-e2e-001',
        tenant_id: 'tenant-001',
        cost_type: 'model_inference',
        provider: 'openai',
        model: 'gpt-4-turbo',
        currency: 'USD',
        precision: 6,
        raw_cost_micro: cost,
        multiplier_bps: 10000,
        total_cost_micro: cost,
        rounding_policy: 'largest_remainder',
        recipients: [{
          address: '0xProvider',
          role: 'provider',
          share_bps: 10000,
          amount_micro: cost,
        }],
        idempotency_key: 'idem-e2e-001',
        timestamp: '2026-02-16T10:00:05Z',
        contract_version: '5.1.0',
        source_completion_id: '550e8400-e29b-41d4-a716-446655440001',
        pricing_snapshot: {
          input_per_million_micro: '30000000',
          output_per_million_micro: '60000000',
        },
        reconciliation_mode: 'protocol_authoritative',
      };
      expect(Value.Check(BillingEntrySchema, billingEntry)).toBe(true);

      // Step 5: Verify conservation
      const conservation = verifyPricingConservation(
        { cost_micro: billingEntry.total_cost_micro, pricing_snapshot: pricing },
        usage,
      );
      expect(conservation.conserved).toBe(true);
      expect(conservation.delta).toBe('0');
    });
  });

  describe('full chain — provider_invoice_authoritative', () => {
    it('delta captures provider invoice discrepancy', () => {
      const pricing = makePricingInput();
      const usage = { prompt_tokens: 1000, completion_tokens: 500 };
      const computedCost = computeCostMicro(pricing, usage); // 60000

      // Provider invoiced slightly different amount (promotional discount)
      const invoicedCost = '57000';

      const billingEntry = {
        id: 'billing-e2e-002',
        trace_id: 'trace-e2e-002',
        tenant_id: 'tenant-001',
        cost_type: 'model_inference',
        provider: 'openai',
        currency: 'USD',
        precision: 6,
        raw_cost_micro: invoicedCost,
        multiplier_bps: 10000,
        total_cost_micro: invoicedCost,
        rounding_policy: 'largest_remainder',
        recipients: [{
          address: '0xProvider',
          role: 'provider',
          share_bps: 10000,
          amount_micro: invoicedCost,
        }],
        idempotency_key: 'idem-e2e-002',
        timestamp: '2026-02-16T10:00:05Z',
        contract_version: '5.1.0',
        source_completion_id: '550e8400-e29b-41d4-a716-446655440002',
        pricing_snapshot: {
          input_per_million_micro: '30000000',
          output_per_million_micro: '60000000',
        },
        reconciliation_mode: 'provider_invoice_authoritative',
        reconciliation_delta_micro: '-3000', // provider charged less
      };
      expect(Value.Check(BillingEntrySchema, billingEntry)).toBe(true);

      // Conservation check: NOT conserved (by design — provider authoritative)
      const conservation = verifyPricingConservation(
        { cost_micro: billingEntry.total_cost_micro, pricing_snapshot: pricing },
        usage,
      );
      expect(conservation.conserved).toBe(false);
      expect(conservation.delta).toBe('-3000');
      expect(conservation.computed).toBe(computedCost);
    });
  });

  // ---------------------------------------------------------------------------
  // Property-based: random pricing + usage → compute → billing → verify
  // ---------------------------------------------------------------------------

  describe('property-based conservation', () => {
    const testCases = [
      { prompt: 0, completion: 0, label: 'zero tokens' },
      { prompt: 1, completion: 0, label: 'single input token' },
      { prompt: 0, completion: 1, label: 'single output token' },
      { prompt: 100, completion: 50, label: 'standard usage' },
      { prompt: 10000, completion: 5000, label: 'high usage' },
      { prompt: 999999, completion: 999999, label: 'near-million tokens' },
      { prompt: 1, completion: 1, label: 'minimal tokens' },
      { prompt: 128000, completion: 4096, label: 'GPT-4 max context' },
    ];

    for (const { prompt, completion, label } of testCases) {
      it(`conservation holds for ${label} (${prompt}/${completion})`, () => {
        const pricing = makePricingInput();
        const usage = { prompt_tokens: prompt, completion_tokens: completion };
        const cost = computeCostMicro(pricing, usage);
        const conservation = verifyPricingConservation(
          { cost_micro: cost, pricing_snapshot: pricing },
          usage,
        );
        expect(conservation.conserved).toBe(true);
        expect(conservation.delta).toBe('0');
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Constraint evaluation validation
  // ---------------------------------------------------------------------------

  describe('constraint validator integration', () => {
    it('BillingEntry with full provenance passes validator without warnings', () => {
      const cost = computeCostMicro(makePricingInput(), { prompt_tokens: 100, completion_tokens: 50 });
      const entry = {
        id: 'billing-constraint-001',
        trace_id: 'trace-constraint-001',
        tenant_id: 'tenant-001',
        cost_type: 'model_inference',
        provider: 'openai',
        currency: 'USD',
        precision: 6,
        raw_cost_micro: cost,
        multiplier_bps: 10000,
        total_cost_micro: cost,
        rounding_policy: 'largest_remainder',
        recipients: [{
          address: '0xP',
          role: 'provider',
          share_bps: 10000,
          amount_micro: cost,
        }],
        idempotency_key: 'idem-c-001',
        timestamp: '2026-02-16T10:00:00Z',
        contract_version: '5.1.0',
        source_completion_id: '550e8400-e29b-41d4-a716-446655440003',
        pricing_snapshot: {
          input_per_million_micro: '30000000',
          output_per_million_micro: '60000000',
        },
        reconciliation_mode: 'protocol_authoritative',
      };

      const result = validate(BillingEntrySchema, entry);
      expect(result.valid).toBe(true);
      // No provenance warnings when all fields are present
      const warnings = result.warnings ?? [];
      expect(warnings).not.toContain('source_completion_id present without pricing_snapshot');
      expect(warnings).not.toContain('reconciliation_delta_micro only applies with provider_invoice_authoritative mode');
    });
  });

  // ---------------------------------------------------------------------------
  // Safe variant in chain
  // ---------------------------------------------------------------------------

  describe('safe variant in chain', () => {
    it('computeCostMicroSafe integrates with conservation verifier', () => {
      const pricing = makePricingInput();
      const usage = { prompt_tokens: 500, completion_tokens: 250 };
      const safeResult = computeCostMicroSafe(pricing, usage);

      expect(safeResult.ok).toBe(true);
      if (safeResult.ok) {
        const conservation = verifyPricingConservation(
          { cost_micro: safeResult.cost, pricing_snapshot: pricing },
          usage,
        );
        expect(conservation.conserved).toBe(true);
      }
    });
  });
});
