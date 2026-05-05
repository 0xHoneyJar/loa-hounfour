/**
 * Tests for SuccessionPolicySchema (FR-B3, v8.4.0).
 *
 * Validates schema shape, required fields, and ≥5 mutation classes including
 * threshold/cooldown bounds and the OQ4 resolution (no `self_removal_allowed`
 * field — its absence is enforced by `additionalProperties: false`).
 *
 * Cross-field rules SP-1 (asymmetric ladder amend ≥ rotate ≥ add ≥ remove)
 * and SP-2 (non-decreasing cooldown) are enforced by the constraint file
 * landing in PR-A1.4; this suite validates only TypeBox-level schema rules.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  SuccessionPolicySchema,
  type SuccessionPolicy,
} from '../../src/governance/succession-policy.js';
import '../../src/validators/index.js';

const validPolicy: SuccessionPolicy = {
  policy_id: '550e8400-e29b-41d4-a716-446655440020',
  org_id: '550e8400-e29b-41d4-a716-446655440000',
  amend: { threshold: 0.9, cooldown_seconds: 86400 },
  rotate: { threshold: 0.75, cooldown_seconds: 43200 },
  add: { threshold: 0.6, cooldown_seconds: 21600 },
  remove: { threshold: 0.5, cooldown_seconds: 10800 },
  effective_at: '2026-05-05T00:00:00Z',
};

describe('SuccessionPolicySchema', () => {
  it('validates a canonical fixture (asymmetric ladder + non-decreasing cooldown)', () => {
    expect(Value.Check(SuccessionPolicySchema, validPolicy)).toBe(true);
  });

  it('has $id = SuccessionPolicy', () => {
    expect(SuccessionPolicySchema.$id).toBe('SuccessionPolicy');
  });

  it('declares x-cross-field-validated:true', () => {
    expect((SuccessionPolicySchema as { 'x-cross-field-validated'?: boolean })['x-cross-field-validated']).toBe(true);
  });

  it('declares additionalProperties:false', () => {
    expect((SuccessionPolicySchema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
  });

  // --- Mutation 1: threshold above the [0, 1] range ---
  it('rejects amend.threshold above 1', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, amend: { threshold: 1.1, cooldown_seconds: 86400 } })).toBe(false);
  });

  it('rejects rotate.threshold below 0', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, rotate: { threshold: -0.01, cooldown_seconds: 43200 } })).toBe(false);
  });

  // --- Mutation 2: cooldown_seconds below 0 ---
  it('rejects add.cooldown_seconds below 0', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, add: { threshold: 0.6, cooldown_seconds: -1 } })).toBe(false);
  });

  it('rejects cooldown_seconds that is not an integer', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, remove: { threshold: 0.5, cooldown_seconds: 10800.5 } })).toBe(false);
  });

  // --- Mutation 3: missing required action ---
  it('rejects when amend is missing', () => {
    const { amend: _omit, ...rest } = validPolicy;
    expect(Value.Check(SuccessionPolicySchema, rest)).toBe(false);
  });

  it('rejects when remove is missing', () => {
    const { remove: _omit, ...rest } = validPolicy;
    expect(Value.Check(SuccessionPolicySchema, rest)).toBe(false);
  });

  // --- Mutation 4: additional property at root (OQ4: no self_removal_allowed) ---
  it('rejects a self_removal_allowed property (OQ4: not in schema)', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, self_removal_allowed: true })).toBe(false);
  });

  it('rejects an unexpected additional property at the root', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, extra: 1 })).toBe(false);
  });

  // --- Mutation 5: action rule with additional property ---
  it('rejects an unexpected additional property inside an action rule', () => {
    expect(
      Value.Check(SuccessionPolicySchema, {
        ...validPolicy,
        amend: { threshold: 0.9, cooldown_seconds: 86400, smuggled: 'value' },
      }),
    ).toBe(false);
  });

  // --- Mutation 6: threshold wrong type ---
  it('rejects a threshold given as a string', () => {
    expect(
      Value.Check(SuccessionPolicySchema, {
        ...validPolicy,
        amend: { threshold: '0.9', cooldown_seconds: 86400 },
      }),
    ).toBe(false);
  });

  // --- Mutation 7: invalid policy_id format ---
  it('rejects when policy_id is not a UUID', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, policy_id: 'not-a-uuid' })).toBe(false);
  });

  // --- Mutation 8: effective_at not ISO 8601 ---
  it('rejects when effective_at is not an ISO 8601 date-time', () => {
    expect(Value.Check(SuccessionPolicySchema, { ...validPolicy, effective_at: '2026-05-05' })).toBe(false);
  });

  // --- Cross-field documentation note (SP-1, SP-2 deferred to PR-A1.4) ---
  it('accepts an asymmetric-ladder violation at the schema level (cross-field rule SP-1 deferred to PR-A1.4)', () => {
    // amend.threshold (0.5) < rotate.threshold (0.9) — violates SP-1, but caught
    // only by the constraint file in PR-A1.4. The schema itself does not enforce
    // cross-field comparisons; this test pins the boundary.
    const violator = {
      ...validPolicy,
      amend: { threshold: 0.5, cooldown_seconds: 86400 },
      rotate: { threshold: 0.9, cooldown_seconds: 43200 },
    };
    expect(Value.Check(SuccessionPolicySchema, violator)).toBe(true);
  });
});
