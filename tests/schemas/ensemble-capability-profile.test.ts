/**
 * Tests for EnsembleCapabilityProfile schema (S2-T5).
 *
 * v5.4.0 — FR-5: Patchwork AGI hypothesis (Distributional AGI Safety).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import {
  EnsembleCapabilityProfileSchema,
  CapabilityEvidenceSchema,
  SafetyProfileSchema,
} from '../../src/schemas/model/ensemble/ensemble-capability-profile.js';

const validProfile = {
  profile_id: '550e8400-e29b-41d4-a716-446655440000',
  ensemble_strategy: 'consensus',
  models: ['claude-opus-4', 'gpt-5'],
  individual_capabilities: {
    'claude-opus-4': ['reasoning', 'code-generation'],
    'gpt-5': ['reasoning', 'creative-writing'],
  },
  emergent_capabilities: ['cross-model-verification'],
  capability_evidence: [
    {
      capability: 'cross-model-verification',
      evidence_type: 'tested',
      vector_id: 'conformance-ensemble-001',
    },
  ],
  contract_version: '5.4.0',
};

describe('EnsembleCapabilityProfileSchema', () => {
  it('validates a complete profile', () => {
    expect(Value.Check(EnsembleCapabilityProfileSchema, validProfile)).toBe(true);
  });

  it('validates with safety_profile', () => {
    const withSafety = {
      ...validProfile,
      safety_profile: {
        max_autonomy_level: 'supervised',
        requires_human_approval: ['deployment', 'financial-transfer'],
        monitoring_requirements: ['output-logging', 'cost-tracking'],
      },
    };
    expect(Value.Check(EnsembleCapabilityProfileSchema, withSafety)).toBe(true);
  });

  it('validates with metadata', () => {
    const withMeta = {
      ...validProfile,
      metadata: { team: 'research', experiment: 'patchwork-v1' },
    };
    expect(Value.Check(EnsembleCapabilityProfileSchema, withMeta)).toBe(true);
  });

  it('rejects fewer than 2 models', () => {
    const invalid = { ...validProfile, models: ['solo-model'] };
    expect(Value.Check(EnsembleCapabilityProfileSchema, invalid)).toBe(false);
  });

  it('rejects invalid ensemble_strategy', () => {
    const invalid = { ...validProfile, ensemble_strategy: 'random' };
    expect(Value.Check(EnsembleCapabilityProfileSchema, invalid)).toBe(false);
  });

  it('rejects invalid profile_id (not uuid)', () => {
    const invalid = { ...validProfile, profile_id: 'not-a-uuid' };
    expect(Value.Check(EnsembleCapabilityProfileSchema, invalid)).toBe(false);
  });

  it('rejects additional properties', () => {
    const invalid = { ...validProfile, extra: true };
    expect(Value.Check(EnsembleCapabilityProfileSchema, invalid)).toBe(false);
  });

  it('has $id EnsembleCapabilityProfile', () => {
    expect(EnsembleCapabilityProfileSchema.$id).toBe('EnsembleCapabilityProfile');
  });

  it('has x-cross-field-validated annotation', () => {
    expect((EnsembleCapabilityProfileSchema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
  });
});

describe('CapabilityEvidenceSchema', () => {
  it('validates complete evidence', () => {
    const evidence = {
      capability: 'reasoning',
      evidence_type: 'tested',
      vector_id: 'conformance-reasoning-001',
    };
    expect(Value.Check(CapabilityEvidenceSchema, evidence)).toBe(true);
  });

  it('validates without vector_id', () => {
    const evidence = { capability: 'reasoning', evidence_type: 'theoretical' };
    expect(Value.Check(CapabilityEvidenceSchema, evidence)).toBe(true);
  });

  it('rejects invalid evidence_type', () => {
    const evidence = { capability: 'reasoning', evidence_type: 'guessed' };
    expect(Value.Check(CapabilityEvidenceSchema, evidence)).toBe(false);
  });

  it('rejects empty capability', () => {
    const evidence = { capability: '', evidence_type: 'observed' };
    expect(Value.Check(CapabilityEvidenceSchema, evidence)).toBe(false);
  });
});

describe('SafetyProfileSchema', () => {
  it('validates complete safety profile', () => {
    const safety = {
      max_autonomy_level: 'semi_autonomous',
      requires_human_approval: ['deploy'],
      monitoring_requirements: ['latency', 'error-rate'],
    };
    expect(Value.Check(SafetyProfileSchema, safety)).toBe(true);
  });

  it('validates with empty arrays', () => {
    const safety = {
      max_autonomy_level: 'autonomous',
      requires_human_approval: [],
      monitoring_requirements: [],
    };
    expect(Value.Check(SafetyProfileSchema, safety)).toBe(true);
  });

  it('rejects invalid max_autonomy_level', () => {
    const safety = {
      max_autonomy_level: 'fully_autonomous',
      requires_human_approval: [],
      monitoring_requirements: [],
    };
    expect(Value.Check(SafetyProfileSchema, safety)).toBe(false);
  });
});
