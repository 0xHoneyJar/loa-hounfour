/**
 * PR-C1 (FR-C1) — validate() integration for ScopeOfAutonomy:
 * cross-field registration (SOA-1..5) and SOA-6 manifest emission with
 * and without `scopeContext.parent_scope`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, getCrossFieldValidatorSchemas } from '../../src/validators/index.js';
import { ScopeOfAutonomySchema, type ScopeOfAutonomy } from '../../src/governance/scope-of-autonomy.js';
import * as root from '../../src/index.js';
import * as governance from '../../src/governance/index.js';
import { CONTRACT_VERSION } from '../../src/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALID = join(__dirname, '..', '..', 'vectors', 'ScopeOfAutonomy', 'v8.8.0', 'valid');
const NOW = '2026-10-14T12:00:00.000Z';

function load(name: string): ScopeOfAutonomy {
  const { _comment, ...data } = JSON.parse(readFileSync(join(VALID, name), 'utf8')) as Record<string, unknown>;
  void _comment;
  return data as unknown as ScopeOfAutonomy;
}

const PARENT = load('soa-002-full-root.json');
const CHILD = load('soa-003-child-with-parent-ref.json');

describe('ScopeOfAutonomy registration and exports', () => {
  it('is registered as a cross-field validator and marked on the schema', () => {
    expect(getCrossFieldValidatorSchemas()).toContain('ScopeOfAutonomy');
    expect((ScopeOfAutonomySchema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
    expect(ScopeOfAutonomySchema.$id).toBe('ScopeOfAutonomy');
    expect(ScopeOfAutonomySchema.additionalProperties).toBe(false);
  });

  it('is reachable from the root and governance barrels', () => {
    for (const mod of [root, governance] as Array<Record<string, unknown>>) {
      expect(mod.ScopeOfAutonomySchema).toBe(ScopeOfAutonomySchema);
      expect(typeof mod.evaluateScopeInheritance).toBe('function');
      expect(typeof mod.evaluateScopeActivity).toBe('function');
      expect(typeof mod.validateScopeOfAutonomy).toBe('function');
    }
  });
});

describe('validate() SOA-6 emission', () => {
  it('root scope: no SOA-6 obligation', () => {
    const r = validate(ScopeOfAutonomySchema, PARENT, { now: NOW });
    expect(r).toEqual({ valid: true });
  });

  it('child scope without parent context: valid with scope_parent_context_deferred', () => {
    const r = validate(ScopeOfAutonomySchema, CHILD, { now: NOW });
    expect(r.valid).toBe(true);
    expect(r.unverified_obligations).toEqual({
      schema_id: 'ScopeOfAutonomy',
      contract_version: CONTRACT_VERSION,
      manifest_emitted_at: NOW,
      unverified_rules: [
        expect.objectContaining({
          rule_id: 'SOA-6',
          evaluator: 'consumer',
          reason: 'scope_parent_context_deferred',
          consumer_acknowledgment_required: true,
        }),
      ],
    });
  });

  it('child scope with an empty scopeContext is still deferred', () => {
    const r = validate(ScopeOfAutonomySchema, CHILD, { now: NOW, scopeContext: {} });
    expect(r.unverified_obligations?.unverified_rules[0].reason).toBe('scope_parent_context_deferred');
  });

  it('child scope within the supplied parent: valid with no SOA-6 entry', () => {
    const r = validate(ScopeOfAutonomySchema, CHILD, { now: NOW, scopeContext: { parent_scope: PARENT } });
    expect(r).toEqual({ valid: true });
  });

  it('child scope outside the supplied parent: invalid with scope_inheritance_violation entries', () => {
    const wide: ScopeOfAutonomy = {
      ...CHILD,
      permitted_sub_goals: ['deploy to production'],
      expires_at: '2026-10-16T00:00:00Z',
    };
    const r = validate(ScopeOfAutonomySchema, wide, { now: NOW, scopeContext: { parent_scope: PARENT } });
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors).toEqual([
      expect.stringMatching(/^SOA-6: SUB_GOAL_NOT_IN_PARENT at permitted_sub_goals\[0\]:/),
      expect.stringMatching(/^SOA-6: EXPIRES_AFTER_PARENT at expires_at:/),
    ]);
    expect(r.unverified_obligations?.unverified_rules.map((e) => [e.rule_id, e.evaluator, e.reason])).toEqual([
      ['SOA-6', 'library', 'scope_inheritance_violation'],
      ['SOA-6', 'library', 'scope_inheritance_violation'],
    ]);
    expect(r.unverified_obligations?.manifest_emitted_at).toBe(NOW);
  });

  it('wrong parent supplied: PARENT_ID_MISMATCH', () => {
    const other = { ...PARENT, scope_id: 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d503' };
    const r = validate(ScopeOfAutonomySchema, CHILD, { scopeContext: { parent_scope: other } });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors[0]).toMatch(/^SOA-6: PARENT_ID_MISMATCH/);
  });

  it('structurally invalid parent: parent diagnostics prefixed SOA-6 parent, no manifest', () => {
    const r = validate(ScopeOfAutonomySchema, CHILD, { scopeContext: { parent_scope: { scope_id: PARENT.scope_id } } });
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.length).toBeGreaterThan(0);
    for (const e of r.errors) expect(e).toMatch(/^SOA-6 parent: \//);
    expect(r).not.toHaveProperty('unverified_obligations');
  });

  it('cross-field-invalid parent (SOA-4) is rejected with its own SOA-4 diagnostic', () => {
    const badParent = { ...PARENT, stop_work: { requested: true, propagates_to_children: true } };
    const r = validate(ScopeOfAutonomySchema, CHILD, { scopeContext: { parent_scope: badParent } });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors[0]).toMatch(/^SOA-6 parent: SOA-4: stop_work.requested is true/);
  });

  it('cross-field failures on the child take precedence over SOA-6', () => {
    const bad = { ...CHILD, permitted_sub_goals: ['a', 'a'] };
    const r = validate(ScopeOfAutonomySchema, bad, { scopeContext: { parent_scope: PARENT } });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors[0]).toMatch(/^SOA-1:/);
  });

  it('scopeContext is ignored for root scopes', () => {
    const r = validate(ScopeOfAutonomySchema, PARENT, { scopeContext: { parent_scope: CHILD } });
    // A root scope with a supplied parent is still a root scope: no SOA-6.
    expect(r).toEqual({ valid: true });
  });
});
