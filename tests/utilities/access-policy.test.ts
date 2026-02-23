/**
 * Tests for AccessPolicy evaluation helper (S3-T6).
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateAccessPolicy,
  type AccessPolicyContext,
} from '../../src/utilities/access-policy.js';
import { type AccessPolicy } from '../../src/schemas/conversation.js';

const NOW = '2026-02-21T12:00:00Z';

// ---------------------------------------------------------------------------
// type: 'none'
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — none', () => {
  const policy: AccessPolicy = {
    type: 'none',
    audit_required: false,
    revocable: false,
  };

  it('denies read', () => {
    const result = evaluateAccessPolicy(policy, { action: 'read', timestamp: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('none');
  });

  it('denies write', () => {
    const result = evaluateAccessPolicy(policy, { action: 'write', timestamp: NOW });
    expect(result.allowed).toBe(false);
  });

  it('denies delete', () => {
    const result = evaluateAccessPolicy(policy, { action: 'delete', timestamp: NOW });
    expect(result.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// type: 'read_only'
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — read_only', () => {
  const policy: AccessPolicy = {
    type: 'read_only',
    audit_required: true,
    revocable: true,
  };

  it('allows read', () => {
    const result = evaluateAccessPolicy(policy, { action: 'read', timestamp: NOW });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Read-only');
  });

  it('denies write', () => {
    const result = evaluateAccessPolicy(policy, { action: 'write', timestamp: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('write');
  });

  it('denies delete', () => {
    const result = evaluateAccessPolicy(policy, { action: 'delete', timestamp: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('delete');
  });
});

// ---------------------------------------------------------------------------
// type: 'time_limited'
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — time_limited', () => {
  const policy: AccessPolicy = {
    type: 'time_limited',
    duration_hours: 24,
    audit_required: true,
    revocable: true,
  };

  it('allows read (expiry is consumer responsibility)', () => {
    const result = evaluateAccessPolicy(policy, { action: 'read', timestamp: NOW });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('consumer responsibility');
  });

  it('denies write', () => {
    const result = evaluateAccessPolicy(policy, { action: 'write', timestamp: NOW });
    expect(result.allowed).toBe(false);
  });

  it('denies delete', () => {
    const result = evaluateAccessPolicy(policy, { action: 'delete', timestamp: NOW });
    expect(result.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// type: 'time_limited' — Expiry enforcement (v7.2.0 — Bridgebuilder Finding F1)
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — time_limited expiry (v7.2.0)', () => {
  const policy: AccessPolicy = {
    type: 'time_limited',
    duration_hours: 24,
    audit_required: true,
    revocable: true,
  };

  const CREATED = '2026-02-20T12:00:00Z'; // 24h before NOW

  it('allows read when not yet expired', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: '2026-02-21T11:00:00Z', // 23h after creation
      policy_created_at: CREATED,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('expires');
  });

  it('denies read when expired', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: '2026-02-21T13:00:00Z', // 25h after creation
      policy_created_at: CREATED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('denies at exact expiry boundary', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: '2026-02-21T12:00:00Z', // exactly 24h
      policy_created_at: CREATED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('falls back to consumer responsibility when policy_created_at is absent', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('consumer responsibility');
  });

  it('still denies write even with valid expiry context', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'write',
      timestamp: '2026-02-21T11:00:00Z',
      policy_created_at: CREATED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('write');
  });

  it('still denies delete even with valid expiry context', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'delete',
      timestamp: '2026-02-21T11:00:00Z',
      policy_created_at: CREATED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('delete');
  });
});

// ---------------------------------------------------------------------------
// type: 'role_based'
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — role_based', () => {
  const policy: AccessPolicy = {
    type: 'role_based',
    roles: ['auditor', 'admin'],
    audit_required: true,
    revocable: false,
  };

  it('allows matching role', () => {
    const result = evaluateAccessPolicy(policy, { action: 'read', role: 'auditor', timestamp: NOW });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('auditor');
  });

  it('allows admin role', () => {
    const result = evaluateAccessPolicy(policy, { action: 'write', role: 'admin', timestamp: NOW });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('admin');
  });

  it('denies non-matching role', () => {
    const result = evaluateAccessPolicy(policy, { action: 'read', role: 'viewer', timestamp: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('viewer');
  });

  it('denies when no role provided', () => {
    const result = evaluateAccessPolicy(policy, { action: 'read', timestamp: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No role provided');
  });

  it('denies delete for matching role (role_based allows all actions)', () => {
    const result = evaluateAccessPolicy(policy, { action: 'delete', role: 'admin', timestamp: NOW });
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// type: 'reputation_gated' — Hysteresis (v7.4.0 — Bridgebuilder Vision B-V1)
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — reputation_gated hysteresis', () => {
  const policy: AccessPolicy = {
    type: 'reputation_gated',
    min_reputation_score: 0.7,
    revoke_below_score: 0.5,
    audit_required: true,
    revocable: true,
  };

  it('grants at the grant threshold (first access)', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      reputation_score: 0.7,
    });
    expect(result.allowed).toBe(true);
  });

  it('denies below grant threshold (first access)', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      reputation_score: 0.6,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('below minimum 0.7');
  });

  it('still grants between revoke and grant threshold (previously granted)', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      reputation_score: 0.6,
      previously_granted: true,
    });
    expect(result.allowed).toBe(true);
  });

  it('revokes below revoke threshold even if previously granted', () => {
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      reputation_score: 0.4,
      previously_granted: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('revoke threshold');
  });

  it('falls back to grant threshold when no revoke fields set', () => {
    const noHysteresisPolicy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_score: 0.7,
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(noHysteresisPolicy, {
      action: 'read',
      timestamp: NOW,
      reputation_score: 0.6,
      previously_granted: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('below minimum 0.7');
  });

  it('handles state-based hysteresis with revoke_below_state', () => {
    const statePolicy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_state: 'established',
      revoke_below_state: 'warming',
      audit_required: true,
      revocable: true,
    };
    // warming is below established grant threshold but above warming revoke threshold
    const result = evaluateAccessPolicy(statePolicy, {
      action: 'read',
      timestamp: NOW,
      reputation_state: 'warming',
      previously_granted: true,
    });
    expect(result.allowed).toBe(true);
  });

  it('revokes when state drops below revoke_below_state', () => {
    const statePolicy: AccessPolicy = {
      type: 'reputation_gated',
      min_reputation_state: 'established',
      revoke_below_state: 'warming',
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(statePolicy, {
      action: 'read',
      timestamp: NOW,
      reputation_state: 'cold',
      previously_granted: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('revoke threshold');
  });
});

// ---------------------------------------------------------------------------
// type: 'compound' — AND/OR composition (v7.4.0 — Bridgebuilder Vision B-V2)
// ---------------------------------------------------------------------------

describe('evaluateAccessPolicy — compound', () => {
  it('AND: grants when all sub-policies grant', () => {
    const policy: AccessPolicy = {
      type: 'compound',
      operator: 'AND',
      policies: [
        { type: 'role_based', roles: ['admin'], audit_required: true, revocable: true },
        { type: 'reputation_gated', min_reputation_score: 0.5, audit_required: true, revocable: true },
      ],
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      role: 'admin',
      reputation_score: 0.8,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('AND');
  });

  it('AND: denies when any sub-policy denies', () => {
    const policy: AccessPolicy = {
      type: 'compound',
      operator: 'AND',
      policies: [
        { type: 'role_based', roles: ['admin'], audit_required: true, revocable: true },
        { type: 'reputation_gated', min_reputation_score: 0.5, audit_required: true, revocable: true },
      ],
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      role: 'viewer',
      reputation_score: 0.8,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('AND denied');
  });

  it('OR: grants when any sub-policy grants', () => {
    const policy: AccessPolicy = {
      type: 'compound',
      operator: 'OR',
      policies: [
        { type: 'role_based', roles: ['admin'], audit_required: true, revocable: true },
        { type: 'read_only', audit_required: true, revocable: true },
      ],
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      role: 'viewer',
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('OR granted');
  });

  it('OR: denies when all sub-policies deny', () => {
    const policy: AccessPolicy = {
      type: 'compound',
      operator: 'OR',
      policies: [
        { type: 'none', audit_required: true, revocable: true },
        { type: 'role_based', roles: ['admin'], audit_required: true, revocable: true },
      ],
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(policy, {
      action: 'read',
      timestamp: NOW,
      role: 'viewer',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('OR denied');
  });

  it('denies when policies array is empty', () => {
    const policy: AccessPolicy = {
      type: 'compound',
      operator: 'AND',
      policies: [],
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(policy, { action: 'read', timestamp: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('no sub-policies');
  });

  it('denies nested compound at runtime (recursion guard)', () => {
    // Construct a policy that bypasses validation — nested compound
    const policy = {
      type: 'compound' as const,
      operator: 'AND' as const,
      policies: [
        {
          type: 'compound' as const,
          operator: 'OR' as const,
          policies: [
            { type: 'read_only' as const, audit_required: false, revocable: false },
          ],
          audit_required: false,
          revocable: false,
        },
      ],
      audit_required: true,
      revocable: true,
    };
    const result = evaluateAccessPolicy(policy as AccessPolicy, { action: 'read', timestamp: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Nested compound policies are not allowed');
  });
});
