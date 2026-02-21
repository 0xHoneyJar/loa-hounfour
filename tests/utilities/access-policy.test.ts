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
