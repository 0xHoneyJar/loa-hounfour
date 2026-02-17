/**
 * Tests for PermissionBoundary schema — MAY semantics for capability-scoped authorization.
 *
 * @see SDD §2.5 — PermissionBoundary Schema
 * @since v7.0.0 (Sprint 3)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  ReportingRequirementSchema,
  RevocationPolicySchema,
  PermissionBoundarySchema,
} from '../../src/governance/permission-boundary.js';

// ---------------------------------------------------------------------------
// ReportingRequirement
// ---------------------------------------------------------------------------

describe('ReportingRequirementSchema', () => {
  it('accepts valid reporting requirement', () => {
    expect(Value.Check(ReportingRequirementSchema, {
      required: true,
      report_to: 'audit-agent',
      frequency: 'per_action',
      format: 'audit_trail',
    })).toBe(true);
  });

  it('accepts per_epoch frequency', () => {
    expect(Value.Check(ReportingRequirementSchema, {
      required: false,
      report_to: 'dashboard',
      frequency: 'per_epoch',
      format: 'summary',
    })).toBe(true);
  });

  it('accepts on_violation frequency', () => {
    expect(Value.Check(ReportingRequirementSchema, {
      required: true,
      report_to: 'governance-council',
      frequency: 'on_violation',
      format: 'detailed',
    })).toBe(true);
  });

  it('rejects invalid frequency', () => {
    expect(Value.Check(ReportingRequirementSchema, {
      required: true,
      report_to: 'agent',
      frequency: 'daily',
      format: 'audit_trail',
    })).toBe(false);
  });

  it('rejects empty report_to', () => {
    expect(Value.Check(ReportingRequirementSchema, {
      required: true,
      report_to: '',
      frequency: 'per_action',
      format: 'audit_trail',
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RevocationPolicy
// ---------------------------------------------------------------------------

describe('RevocationPolicySchema', () => {
  it('accepts violation_count trigger', () => {
    expect(Value.Check(RevocationPolicySchema, {
      trigger: 'violation_count',
      violation_threshold: 3,
    })).toBe(true);
  });

  it('accepts timeout trigger', () => {
    expect(Value.Check(RevocationPolicySchema, {
      trigger: 'timeout',
      timeout_seconds: 86400,
    })).toBe(true);
  });

  it('accepts governance_vote trigger', () => {
    expect(Value.Check(RevocationPolicySchema, {
      trigger: 'governance_vote',
    })).toBe(true);
  });

  it('accepts manual trigger', () => {
    expect(Value.Check(RevocationPolicySchema, {
      trigger: 'manual',
    })).toBe(true);
  });

  it('rejects invalid trigger', () => {
    expect(Value.Check(RevocationPolicySchema, {
      trigger: 'automatic',
    })).toBe(false);
  });

  it('rejects violation_threshold < 1', () => {
    expect(Value.Check(RevocationPolicySchema, {
      trigger: 'violation_count',
      violation_threshold: 0,
    })).toBe(false);
  });

  it('rejects timeout_seconds < 1', () => {
    expect(Value.Check(RevocationPolicySchema, {
      trigger: 'timeout',
      timeout_seconds: 0,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PermissionBoundary
// ---------------------------------------------------------------------------

describe('PermissionBoundarySchema', () => {
  const validBoundary = {
    boundary_id: '00000000-0000-0000-0000-000000000301',
    scope: 'billing',
    permitted_if: "trust_scopes.scopes.billing == 'verified'",
    reporting: {
      required: true,
      report_to: 'audit-agent',
      frequency: 'per_action',
      format: 'audit_trail',
    },
    revocation: {
      trigger: 'violation_count',
      violation_threshold: 3,
    },
    severity: 'advisory',
    contract_version: '7.0.0',
  };

  it('accepts valid boundary', () => {
    expect(Value.Check(PermissionBoundarySchema, validBoundary)).toBe(true);
  });

  it('accepts monitored severity', () => {
    expect(Value.Check(PermissionBoundarySchema, {
      ...validBoundary,
      severity: 'monitored',
    })).toBe(true);
  });

  it('rejects non-uuid boundary_id', () => {
    expect(Value.Check(PermissionBoundarySchema, {
      ...validBoundary,
      boundary_id: 'not-uuid',
    })).toBe(false);
  });

  it('rejects empty scope', () => {
    expect(Value.Check(PermissionBoundarySchema, {
      ...validBoundary,
      scope: '',
    })).toBe(false);
  });

  it('rejects empty permitted_if', () => {
    expect(Value.Check(PermissionBoundarySchema, {
      ...validBoundary,
      permitted_if: '',
    })).toBe(false);
  });

  it('rejects invalid severity', () => {
    expect(Value.Check(PermissionBoundarySchema, {
      ...validBoundary,
      severity: 'enforced',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(PermissionBoundarySchema, {
      ...validBoundary,
      extra: true,
    })).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(PermissionBoundarySchema, {
      ...validBoundary,
      contract_version: 'v7',
    })).toBe(false);
  });
});
