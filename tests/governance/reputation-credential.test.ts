/**
 * Tests for ReputationCredential schema, credential prior computation,
 * and reputation_gated access policy (Sprint 3 — v7.3.0 C1 + C4 + Spec II + IV).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import {
  ReputationCredentialSchema,
  type ReputationCredential,
} from '../../src/governance/reputation-credential.js';
import {
  computeCredentialPrior,
  isCredentialExpired,
  CREDENTIAL_CONFIDENCE_THRESHOLD,
} from '../../src/utilities/reputation-credential.js';
import {
  AccessPolicySchema,
  validateAccessPolicy,
  type AccessPolicy,
} from '../../src/schemas/conversation.js';
import {
  evaluateAccessPolicy,
  type AccessPolicyContext,
} from '../../src/utilities/access-policy.js';

// ---------------------------------------------------------------------------
// ReputationCredentialSchema validation
// ---------------------------------------------------------------------------

const VALID_CREDENTIAL: ReputationCredential = {
  credential_id: 'cred-001',
  personality_id: 'bear-001',
  source_collection_id: 'honeycomb',
  source_pool_id: 'pool-alpha',
  source_state: 'established',
  source_blended_score: 0.82,
  source_sample_count: 45,
  source_collection_score: 0.75,
  issued_at: '2026-02-20T00:00:00Z',
  expires_at: '2026-08-20T00:00:00Z',
  attestation_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  contract_version: '7.3.0',
};

describe('ReputationCredentialSchema', () => {
  it('accepts a valid credential with all fields', () => {
    expect(Value.Check(ReputationCredentialSchema, VALID_CREDENTIAL)).toBe(true);
  });

  it('accepts a credential without optional fields', () => {
    const { expires_at, attestation_hash, ...minimal } = VALID_CREDENTIAL;
    expect(Value.Check(ReputationCredentialSchema, minimal)).toBe(true);
  });

  it('rejects missing required field (personality_id)', () => {
    const { personality_id, ...bad } = VALID_CREDENTIAL;
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('rejects source_blended_score out of range', () => {
    const bad = { ...VALID_CREDENTIAL, source_blended_score: 1.5 };
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('rejects source_blended_score below 0', () => {
    const bad = { ...VALID_CREDENTIAL, source_blended_score: -0.1 };
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('rejects source_collection_score out of range', () => {
    const bad = { ...VALID_CREDENTIAL, source_collection_score: 1.1 };
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('rejects negative source_sample_count', () => {
    const bad = { ...VALID_CREDENTIAL, source_sample_count: -1 };
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('rejects invalid attestation_hash pattern', () => {
    const bad = { ...VALID_CREDENTIAL, attestation_hash: 'not-hex' };
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('rejects invalid source_state', () => {
    const bad = { ...VALID_CREDENTIAL, source_state: 'unknown' };
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('rejects additional properties', () => {
    const bad = { ...VALID_CREDENTIAL, extra_field: 'not-allowed' };
    expect(Value.Check(ReputationCredentialSchema, bad)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ReputationCredentialSchema.$id).toBe('ReputationCredential');
  });

  it('accepts boundary values (score = 0, score = 1)', () => {
    const boundary = {
      ...VALID_CREDENTIAL,
      source_blended_score: 0,
      source_collection_score: 1,
      source_sample_count: 0,
    };
    expect(Value.Check(ReputationCredentialSchema, boundary)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeCredentialPrior
// ---------------------------------------------------------------------------

describe('computeCredentialPrior', () => {
  const DESTINATION_SCORE = 0.5;

  it('returns destination score for cold source', () => {
    const coldCredential: ReputationCredential = {
      ...VALID_CREDENTIAL,
      source_state: 'cold',
      source_sample_count: 0,
    };
    const result = computeCredentialPrior(coldCredential, DESTINATION_SCORE);
    expect(result.prior).toBe(DESTINATION_SCORE);
    expect(result.weight).toBe(0);
    expect(result.reason).toContain('cold');
  });

  it('returns destination score for zero sample count', () => {
    const noSamples: ReputationCredential = {
      ...VALID_CREDENTIAL,
      source_state: 'warming',
      source_sample_count: 0,
    };
    const result = computeCredentialPrior(noSamples, DESTINATION_SCORE);
    expect(result.prior).toBe(DESTINATION_SCORE);
    expect(result.weight).toBe(0);
  });

  it('computes informed prior for established credential', () => {
    const result = computeCredentialPrior(VALID_CREDENTIAL, DESTINATION_SCORE);
    expect(result.weight).toBeGreaterThan(0);
    expect(result.weight).toBeLessThanOrEqual(0.5);
    expect(result.prior).toBeGreaterThan(DESTINATION_SCORE); // credential has higher score
    expect(result.prior).toBeLessThanOrEqual(1);
  });

  it('caps weight at maxCredentialWeight', () => {
    const highCredibility: ReputationCredential = {
      ...VALID_CREDENTIAL,
      source_collection_score: 1.0,
      source_sample_count: 100, // saturated confidence
    };
    const result = computeCredentialPrior(highCredibility, DESTINATION_SCORE, 0.3);
    expect(result.weight).toBeLessThanOrEqual(0.3);
  });

  it('weight increases with source collection score', () => {
    const lowScore = computeCredentialPrior(
      { ...VALID_CREDENTIAL, source_collection_score: 0.2 },
      DESTINATION_SCORE,
    );
    const highScore = computeCredentialPrior(
      { ...VALID_CREDENTIAL, source_collection_score: 0.9 },
      DESTINATION_SCORE,
    );
    expect(highScore.weight).toBeGreaterThan(lowScore.weight);
  });

  it('weight increases with sample count (up to saturation at 30)', () => {
    const fewSamples = computeCredentialPrior(
      { ...VALID_CREDENTIAL, source_sample_count: 5 },
      DESTINATION_SCORE,
    );
    const manySamples = computeCredentialPrior(
      { ...VALID_CREDENTIAL, source_sample_count: 30 },
      DESTINATION_SCORE,
    );
    expect(manySamples.weight).toBeGreaterThan(fewSamples.weight);
  });

  it('sample confidence saturates at 30', () => {
    const at30 = computeCredentialPrior(
      { ...VALID_CREDENTIAL, source_sample_count: 30 },
      DESTINATION_SCORE,
    );
    const at100 = computeCredentialPrior(
      { ...VALID_CREDENTIAL, source_sample_count: 100 },
      DESTINATION_SCORE,
    );
    expect(at30.weight).toBe(at100.weight);
  });

  it('reason includes source collection id', () => {
    const result = computeCredentialPrior(VALID_CREDENTIAL, DESTINATION_SCORE);
    expect(result.reason).toContain(VALID_CREDENTIAL.source_collection_id);
  });
});

// ---------------------------------------------------------------------------
// reputation_gated AccessPolicy — schema validation
// ---------------------------------------------------------------------------

describe('reputation_gated AccessPolicy', () => {
  const BASE_POLICY: AccessPolicy = {
    type: 'reputation_gated',
    min_reputation_score: 0.6,
    min_reputation_state: 'established',
    audit_required: true,
    revocable: false,
  };

  it('accepts valid reputation_gated policy with both conditions', () => {
    expect(Value.Check(AccessPolicySchema, BASE_POLICY)).toBe(true);
  });

  it('accepts reputation_gated with only min_reputation_score', () => {
    const { min_reputation_state, ...scoreOnly } = BASE_POLICY;
    expect(Value.Check(AccessPolicySchema, scoreOnly)).toBe(true);
  });

  it('accepts reputation_gated with only min_reputation_state', () => {
    const { min_reputation_score, ...stateOnly } = BASE_POLICY;
    expect(Value.Check(AccessPolicySchema, stateOnly)).toBe(true);
  });

  it('rejects min_reputation_score out of range', () => {
    const bad = { ...BASE_POLICY, min_reputation_score: 1.5 };
    expect(Value.Check(AccessPolicySchema, bad)).toBe(false);
  });

  it('rejects invalid min_reputation_state value', () => {
    const bad = { ...BASE_POLICY, min_reputation_state: 'unknown_state' };
    expect(Value.Check(AccessPolicySchema, bad)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateAccessPolicy — reputation_gated cross-field validation
// ---------------------------------------------------------------------------

describe('validateAccessPolicy — reputation_gated', () => {
  it('fails when neither score nor state is provided', () => {
    const policy: AccessPolicy = {
      type: 'reputation_gated',
      audit_required: true,
      revocable: false,
    };
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('reputation_gated'))).toBe(true);
  });

  it('passes with min_reputation_score only', () => {
    const policy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_score: 0.5,
      audit_required: true,
      revocable: false,
    };
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(true);
  });

  it('passes with min_reputation_state only', () => {
    const policy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_state: 'warming',
      audit_required: true,
      revocable: false,
    };
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(true);
  });

  it('warns when reputation fields appear on non-reputation_gated policy', () => {
    const policy: AccessPolicy = {
      type: 'read_only',
      min_reputation_score: 0.5,
      audit_required: true,
      revocable: false,
    };
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('min_reputation_score'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluateAccessPolicy — reputation_gated runtime evaluation
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — reputation_gated', () => {
  const POLICY: AccessPolicy = {
    type: 'reputation_gated',
    min_reputation_score: 0.6,
    min_reputation_state: 'established',
    audit_required: true,
    revocable: false,
  };

  const BASE_CONTEXT: AccessPolicyContext = {
    timestamp: '2026-02-22T00:00:00Z',
    action: 'read',
  };

  it('denies when no reputation context provided', () => {
    const result = evaluateAccessPolicy(POLICY, BASE_CONTEXT);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No reputation context');
  });

  it('allows when score and state meet requirements', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      reputation_score: 0.8,
      reputation_state: 'authoritative',
    });
    expect(result.allowed).toBe(true);
  });

  it('denies when score below minimum', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      reputation_score: 0.3,
      reputation_state: 'established',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('below minimum');
  });

  it('denies when state below minimum', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      reputation_score: 0.8,
      reputation_state: 'warming',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('below minimum');
  });

  it('allows when only score is checked (no state requirement)', () => {
    const scoreOnlyPolicy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_score: 0.5,
      audit_required: true,
      revocable: false,
    };
    const result = evaluateAccessPolicy(scoreOnlyPolicy, {
      ...BASE_CONTEXT,
      reputation_score: 0.7,
    });
    expect(result.allowed).toBe(true);
  });

  it('allows when only state is checked (no score requirement)', () => {
    const stateOnlyPolicy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_state: 'warming',
      audit_required: true,
      revocable: false,
    };
    const result = evaluateAccessPolicy(stateOnlyPolicy, {
      ...BASE_CONTEXT,
      reputation_state: 'established',
    });
    expect(result.allowed).toBe(true);
  });

  it('allows exact boundary score', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      reputation_score: 0.6,
      reputation_state: 'established',
    });
    expect(result.allowed).toBe(true);
  });

  it('allows exact boundary state', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      reputation_score: 0.8,
      reputation_state: 'established',
    });
    expect(result.allowed).toBe(true);
  });

  // F1/F3: reputation_gated allows all action types (meritocratic access, not read-only)
  it('allows write action when reputation meets threshold', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      action: 'write',
      reputation_score: 0.8,
      reputation_state: 'authoritative',
    });
    expect(result.allowed).toBe(true);
  });

  it('allows delete action when reputation meets threshold', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      action: 'delete',
      reputation_score: 0.8,
      reputation_state: 'authoritative',
    });
    expect(result.allowed).toBe(true);
  });

  it('denies write action when score below minimum', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      action: 'write',
      reputation_score: 0.3,
      reputation_state: 'authoritative',
    });
    expect(result.allowed).toBe(false);
  });

  // F4: Partial context strict AND semantics
  it('denies when policy requires score but context only provides state', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      reputation_state: 'authoritative',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('reputation_score');
  });

  it('denies when policy requires state but context only provides score', () => {
    const result = evaluateAccessPolicy(POLICY, {
      ...BASE_CONTEXT,
      reputation_score: 0.9,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('reputation_state');
  });
});

// ---------------------------------------------------------------------------
// isCredentialExpired (F2)
// ---------------------------------------------------------------------------

describe('isCredentialExpired', () => {
  it('returns false when no expires_at', () => {
    const { expires_at, ...noExpiry } = VALID_CREDENTIAL;
    expect(isCredentialExpired(noExpiry as ReputationCredential)).toBe(false);
  });

  it('returns true when credential has expired', () => {
    const expired: ReputationCredential = {
      ...VALID_CREDENTIAL,
      expires_at: '2025-01-01T00:00:00Z', // in the past
    };
    expect(isCredentialExpired(expired, '2026-02-22T00:00:00Z')).toBe(true);
  });

  it('returns false when credential has not expired', () => {
    const fresh: ReputationCredential = {
      ...VALID_CREDENTIAL,
      expires_at: '2027-01-01T00:00:00Z', // in the future
    };
    expect(isCredentialExpired(fresh, '2026-02-22T00:00:00Z')).toBe(false);
  });

  it('returns true at exact expiry boundary', () => {
    const atBoundary: ReputationCredential = {
      ...VALID_CREDENTIAL,
      expires_at: '2026-02-22T00:00:00Z',
    };
    expect(isCredentialExpired(atBoundary, '2026-02-22T00:00:00Z')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CREDENTIAL_CONFIDENCE_THRESHOLD (F7)
// ---------------------------------------------------------------------------

describe('CREDENTIAL_CONFIDENCE_THRESHOLD', () => {
  it('is 30', () => {
    expect(CREDENTIAL_CONFIDENCE_THRESHOLD).toBe(30);
  });
});
