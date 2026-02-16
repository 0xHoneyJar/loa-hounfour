/**
 * Cross-field tests for BudgetScope reservation extension.
 *
 * Tests the v5.2.0 optional reservation fields on BudgetScope
 * and their cross-field validation rules.
 *
 * @see SDD §3.10 — BudgetScope Extension
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { validate } from '../../src/validators/index.js';
import { BudgetScopeSchema, type BudgetScope } from '../../src/schemas/model/routing/budget-scope.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScope(overrides: Partial<BudgetScope> = {}): BudgetScope {
  return {
    scope: 'project',
    scope_id: 'proj-001',
    limit_micro: '1000000',
    spent_micro: '500000',
    action_on_exceed: 'block',
    contract_version: '5.2.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Schema validation (TypeBox)
// ---------------------------------------------------------------------------

describe('BudgetScope reservation fields', () => {
  it('accepts scope without reservation fields (backward compatible)', () => {
    expect(Value.Check(BudgetScopeSchema, makeScope())).toBe(true);
  });

  it('accepts scope with both reservation fields', () => {
    const scope = makeScope({
      reserved_capacity_bps: 300,
      reservation_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(true);
  });

  it('accepts scope with reserved_capacity_bps only', () => {
    const scope = makeScope({ reserved_capacity_bps: 500 });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(true);
  });

  it('accepts reserved_capacity_bps of 0', () => {
    const scope = makeScope({ reserved_capacity_bps: 0 });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(true);
  });

  it('accepts reserved_capacity_bps of 10000', () => {
    const scope = makeScope({ reserved_capacity_bps: 10000 });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(true);
  });

  it('rejects reserved_capacity_bps above 10000', () => {
    const scope = makeScope({ reserved_capacity_bps: 10001 });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(false);
  });

  it('rejects negative reserved_capacity_bps', () => {
    const scope = makeScope({ reserved_capacity_bps: -1 });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(false);
  });

  it('rejects fractional reserved_capacity_bps', () => {
    const scope = makeScope({ reserved_capacity_bps: 300.5 });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(false);
  });

  it('rejects invalid reservation_id (not UUID)', () => {
    const scope = makeScope({ reservation_id: 'not-a-uuid' });
    expect(Value.Check(BudgetScopeSchema, scope)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cross-field validation
// ---------------------------------------------------------------------------

describe('BudgetScope reservation cross-field validation', () => {
  it('warns when reserved_capacity_bps set without reservation_id', () => {
    const result = validate(BudgetScopeSchema, makeScope({ reserved_capacity_bps: 300 }));
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some(w => w.includes('reservation_id is absent'))).toBe(true);
  });

  it('warns when reservation_id set without reserved_capacity_bps', () => {
    const result = validate(BudgetScopeSchema, makeScope({
      reservation_id: '550e8400-e29b-41d4-a716-446655440000',
    }));
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some(w => w.includes('reserved_capacity_bps is 0 or absent'))).toBe(true);
  });

  it('no warnings when both reservation fields present and valid', () => {
    const result = validate(BudgetScopeSchema, makeScope({
      reserved_capacity_bps: 300,
      reservation_id: '550e8400-e29b-41d4-a716-446655440000',
    }));
    expect(result.valid).toBe(true);
    // May have spent_micro warning but should not have reservation warnings
    const reservationWarnings = result.warnings?.filter(w =>
      w.includes('reservation_id') || w.includes('reserved_capacity_bps'),
    );
    expect(reservationWarnings?.length ?? 0).toBe(0);
  });

  it('no reservation warnings when neither field present', () => {
    const result = validate(BudgetScopeSchema, makeScope());
    expect(result.valid).toBe(true);
    const reservationWarnings = result.warnings?.filter(w =>
      w.includes('reservation'),
    );
    expect(reservationWarnings?.length ?? 0).toBe(0);
  });

  it('spent_micro exceeding limit still warns', () => {
    const result = validate(BudgetScopeSchema, makeScope({
      spent_micro: '2000000',
      limit_micro: '1000000',
    }));
    expect(result.valid).toBe(true);
    expect(result.warnings?.some(w => w.includes('exceeds limit_micro'))).toBe(true);
  });
});
