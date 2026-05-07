/**
 * Tests for the OrgRepresentativeDelegation constraint file (PR-A1.4, v8.4.0).
 *
 * Covers ORD-1, ORD-2, ORD-3, ORD-4 from SDD section 3.6:
 *   - ORD-1 (runtime-deferred): Ed25519 signature verification — consumer-side per NF-1
 *   - ORD-2 (runtime-deferred): revocation append-only invariant — temporal, single-record-stateless
 *   - ORD-3 (library): chain depth bound + is_valid_dag DAG check + genesis-sentinel termination
 *   - ORD-4 (runtime-deferred): asserted-vs-traversed chain_depth reconciliation — consumer walks
 *     granted_by edges and rejects records whose asserted depth differs from the traversed count
 *
 * Runtime-deferred rules carry their obligation in the evaluation_note rather than
 * a parseable DSL expression. The library evaluator skips them and surfaces them
 * via the UnverifiedObligationsManifest. The tests verify both halves: the
 * constraint file shape, and the manifest emission contract.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import { buildUnverifiedObligationsManifest } from '../../src/constraints/unverified-obligations.js';
import type { ConstraintFile } from '../../src/constraints/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'OrgRepresentativeDelegation.constraints.json');
const constraintFile: ConstraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

const FROZEN_TIMESTAMP = '2026-05-05T00:00:00Z';

function rule(id: string) {
  const r = constraintFile.constraints.find((c) => c.id === id);
  if (!r) throw new Error(`rule ${id} not found`);
  return r;
}

describe('OrgRepresentativeDelegation constraint file structure', () => {
  it('targets the OrgRepresentativeDelegation schema', () => {
    expect(constraintFile.schema_id).toBe('OrgRepresentativeDelegation');
  });

  it('declares contract_version 8.4.0', () => {
    expect(constraintFile.contract_version).toBe('8.4.0');
  });

  it('contains exactly 5 constraints (ORD-1, ORD-2, ORD-3, ORD-4, ORD-5)', () => {
    expect(constraintFile.constraints).toHaveLength(5);
    const ids = constraintFile.constraints.map((c) => c.id);
    expect(ids).toEqual(['ORD-1', 'ORD-2', 'ORD-3', 'ORD-4', 'ORD-5']);
  });
});

describe('ORD-1 — runtime-deferred Ed25519 signature verification', () => {
  it('marks ORD-1 evaluator as runtime-deferred', () => {
    expect(rule('ORD-1').evaluator).toBe('runtime-deferred');
  });

  it('carries a non-empty evaluation_note describing the consumer obligation', () => {
    const note = rule('ORD-1').evaluation_note ?? '';
    expect(note.length).toBeGreaterThan(0);
    expect(note).toContain('NF-1');
    expect(note).toContain('Ed25519');
    expect(note).toContain('SKIPS');
  });

  it('appears in the unverified-obligations manifest', () => {
    const manifest = buildUnverifiedObligationsManifest(constraintFile, FROZEN_TIMESTAMP);
    expect(manifest).toBeDefined();
    const ord1 = manifest!.unverified_rules.find((e) => e.rule_id === 'ORD-1');
    expect(ord1).toBeDefined();
    expect(ord1!.evaluator).toBe('runtime-deferred');
    expect(ord1!.consumer_acknowledgment_required).toBe(true);
  });
});

describe('ORD-2 — runtime-deferred revocation append-only invariant', () => {
  it('marks ORD-2 evaluator as runtime-deferred', () => {
    expect(rule('ORD-2').evaluator).toBe('runtime-deferred');
  });

  it('carries a non-empty evaluation_note describing the temporal obligation', () => {
    const note = rule('ORD-2').evaluation_note ?? '';
    expect(note.length).toBeGreaterThan(0);
    expect(note).toContain('append-only');
    expect(note).toContain('single record');
    expect(note).toContain('SKIPS');
  });

  it('appears in the unverified-obligations manifest', () => {
    const manifest = buildUnverifiedObligationsManifest(constraintFile, FROZEN_TIMESTAMP);
    expect(manifest).toBeDefined();
    const ord2 = manifest!.unverified_rules.find((e) => e.rule_id === 'ORD-2');
    expect(ord2).toBeDefined();
    expect(ord2!.evaluator).toBe('runtime-deferred');
    expect(ord2!.consumer_acknowledgment_required).toBe(true);
  });
});

describe('ORD-1 + ORD-2 + ORD-4 manifest emission shape', () => {
  it('emits exactly three runtime-deferred entries (ORD-1, ORD-2, ORD-4)', () => {
    const manifest = buildUnverifiedObligationsManifest(constraintFile, FROZEN_TIMESTAMP);
    expect(manifest).toBeDefined();
    expect(manifest!.unverified_rules).toHaveLength(3);
    const ids = manifest!.unverified_rules.map((e) => e.rule_id).sort();
    expect(ids).toEqual(['ORD-1', 'ORD-2', 'ORD-4']);
  });

  it('every manifest entry pins consumer_acknowledgment_required to literal true', () => {
    const manifest = buildUnverifiedObligationsManifest(constraintFile, FROZEN_TIMESTAMP);
    expect(manifest).toBeDefined();
    for (const entry of manifest!.unverified_rules) {
      expect(entry.consumer_acknowledgment_required).toBe(true);
    }
  });
});

describe('ORD-4 — runtime-deferred asserted-vs-traversed depth reconciliation', () => {
  it('marks ORD-4 evaluator as runtime-deferred', () => {
    expect(rule('ORD-4').evaluator).toBe('runtime-deferred');
  });

  it('carries a non-empty evaluation_note describing the depth-reconciliation obligation', () => {
    const note = rule('ORD-4').evaluation_note ?? '';
    expect(note.length).toBeGreaterThan(0);
    expect(note).toContain('NF-1');
    expect(note).toContain('asserted');
    expect(note).toContain('traversed');
    expect(note).toContain('chain_depth');
  });

  it('explains why the reconciliation is not promoted to a library check in v8.4.0', () => {
    const note = rule('ORD-4').evaluation_note ?? '';
    expect(note).toContain('FR-C1');
    expect(note).toContain('counted-traversal');
  });

  it('appears in the unverified-obligations manifest with the correct shape', () => {
    const manifest = buildUnverifiedObligationsManifest(constraintFile, FROZEN_TIMESTAMP);
    expect(manifest).toBeDefined();
    const ord4 = manifest!.unverified_rules.find((e) => e.rule_id === 'ORD-4');
    expect(ord4).toBeDefined();
    expect(ord4!.evaluator).toBe('runtime-deferred');
    expect(ord4!.consumer_acknowledgment_required).toBe(true);
    expect(ord4!.evaluation_note.length).toBeGreaterThan(0);
  });
});

describe('ORD-3 — library is_valid_dag chain validation', () => {
  const expr = rule('ORD-3').expression;

  it('marks ORD-3 evaluator as library', () => {
    expect(rule('ORD-3').evaluator).toBe('library');
  });

  it('uses the is_valid_dag builtin in the expression', () => {
    expect(expr).toContain('is_valid_dag(');
    expect(expr).toContain('granted_by_chain_records');
    expect(expr).toContain('delegation_id');
    expect(expr).toContain('granted_by');
  });

  it('passes for the genesis-rooted record itself (chain_depth 0)', () => {
    const data = {
      chain_depth: 0,
      granted_by: 'genesis:org-public-key',
      granted_by_chain_records: [
        { delegation_id: 'genesis:org-public-key' },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes for a depth-2 chain rooted at the genesis sentinel', () => {
    const chain = [
      { delegation_id: 'genesis:org-public-key' },
      { delegation_id: 'd1', granted_by: 'genesis:org-public-key' },
      { delegation_id: 'd2', granted_by: 'd1' },
    ];
    expect(evaluateConstraint({
      chain_depth: 2,
      granted_by: 'd1',
      granted_by_chain_records: chain,
    }, expr)).toBe(true);
  });

  it('fails when chain_depth exceeds 20 (depth bound)', () => {
    const chain: Array<{ delegation_id: string; granted_by?: string }> = [
      { delegation_id: 'genesis:org-public-key' },
    ];
    for (let i = 1; i <= 21; i++) {
      chain.push({
        delegation_id: `d${i}`,
        granted_by: i === 1 ? 'genesis:org-public-key' : `d${i - 1}`,
      });
    }
    expect(evaluateConstraint({
      chain_depth: 21,
      granted_by: 'd20',
      granted_by_chain_records: chain,
    }, expr)).toBe(false);
  });

  it('fails when the chain contains a cycle', () => {
    const chain = [
      { delegation_id: 'genesis:org-public-key' },
      { delegation_id: 'd1', granted_by: 'd2' },
      { delegation_id: 'd2', granted_by: 'd1' },
    ];
    expect(evaluateConstraint({
      chain_depth: 1,
      granted_by: 'd2',
      granted_by_chain_records: chain,
    }, expr)).toBe(false);
  });

  it('fails on a self-cycle when no record is rooted at the genesis sentinel', () => {
    const chain = [
      { delegation_id: 'd1', granted_by: 'd1' },
    ];
    expect(evaluateConstraint({
      chain_depth: 1,
      granted_by: 'd1',
      granted_by_chain_records: chain,
    }, expr)).toBe(false);
  });

  it('fails on a clean DAG that has no genesis sentinel anywhere (clause-3 isolated)', () => {
    // Clean acyclic chain with no genesis sentinel — exercises the genesis-
    // termination disjunction independently of cycle / dangling-ref detection.
    // d1 has no granted_by at all (no edge); d2 -> d1. Both pass is_valid_dag.
    // The validating record's granted_by is 'd1' (not the sentinel), and
    // no record in the chain carries `granted_by == 'genesis:org-public-key'`.
    const chain = [
      { delegation_id: 'd1' },
      { delegation_id: 'd2', granted_by: 'd1' },
    ];
    expect(evaluateConstraint({
      chain_depth: 1,
      granted_by: 'd1',
      granted_by_chain_records: chain,
    }, expr)).toBe(false);
  });
});

describe('ORD-5 — library-evaluated capability_scope vocabulary harmonization (PR-A2.2)', () => {
  it('marks ORD-5 evaluator as library', () => {
    expect(rule('ORD-5').evaluator).toBe('library');
  });

  it('declares severity warning (soak mode); cycle-005 escalates to error', () => {
    expect(rule('ORD-5').severity).toBe('warning');
  });

  it('targets the capability_scope field', () => {
    expect(rule('ORD-5').fields).toEqual(['capability_scope']);
  });

  it('evaluation_note describes vocabulary harmonization + the canonical 6-member set', () => {
    const note = rule('ORD-5').evaluation_note ?? '';
    expect(note.length).toBeGreaterThan(0);
    expect(note).toContain('CapabilityScope');
    expect(note).toContain('vocabulary');
  });

  it('evaluation_note explicitly distinguishes library evaluator from runtime-deferred', () => {
    // ORD-5 IS library-evaluated (the vocabulary check is performed by the
    // library), so its manifest emission semantics differ from ORD-1 / ORD-2 /
    // ORD-4 which all carry consumer obligations the library cannot evaluate.
    const note = rule('ORD-5').evaluation_note ?? '';
    expect(note).toContain("'library'");
    expect(note).toContain("'runtime-deferred'");
  });

  it('evaluation_note pins the cycle-005 escalation path + R3 soak-window reference', () => {
    const note = rule('ORD-5').evaluation_note ?? '';
    expect(note.toLowerCase()).toContain('cycle-005');
    expect(note).toContain('R3');
    expect(note).toContain('error');
  });

  it("evaluation_note carries the vocabulary_drift manifest reason vocabulary token", () => {
    const note = rule('ORD-5').evaluation_note ?? '';
    expect(note).toContain('vocabulary_drift');
  });

  it('does NOT appear in the unverified-obligations manifest (library-evaluated rules are not deferred)', () => {
    // The manifest is the runtime-deferred catalogue: rules the library
    // CANNOT evaluate. ORD-5 IS library-evaluated, so by construction it must
    // not surface in the manifest. Concretely: only ORD-1, ORD-2, ORD-4
    // (runtime-deferred) appear; ORD-3 and ORD-5 (library-evaluated) do not.
    const manifest = buildUnverifiedObligationsManifest(constraintFile, FROZEN_TIMESTAMP);
    expect(manifest).toBeDefined();
    const ord5 = manifest!.unverified_rules.find((e) => e.rule_id === 'ORD-5');
    expect(ord5).toBeUndefined();
    const ord3 = manifest!.unverified_rules.find((e) => e.rule_id === 'ORD-3');
    expect(ord3).toBeUndefined();
  });

  it('shares the canonical CapabilityScope vocabulary with Layer-2 and Layer-3 (Phase 4 plug-point)', () => {
    // The full evaluation_note text MUST reference both layers — vocabulary
    // harmonization is the cross-layer contract that PRD Phase 4 locked in,
    // and any consumer-side scope-key drift in ORD-5 is the same drift Layer
    // 2 (SignerEntry.scoped_trust) and Layer 3 (SignerCompetenceRule
    // .required_capability_scopes) will silently inherit.
    const note = rule('ORD-5').evaluation_note ?? '';
    expect(note).toContain('SignerEntry');
    expect(note).toContain('SignerCompetenceRule');
  });
});

describe('ORD-3 — evaluation_note documents the synthetic-genesis-terminator pattern', () => {
  it('records the synthetic-genesis-terminator pattern + chain assembly obligation', () => {
    const note = rule('ORD-3').evaluation_note ?? '';
    expect(note).toContain('synthetic terminator');
    expect(note).toContain("genesis:org-public-key");
    expect(note).toContain('granted_by_chain_records');
  });

  it('discloses the context-absent open-fail behavior so consumers do not misread the rule', () => {
    const note = rule('ORD-3').evaluation_note ?? '';
    expect(note).toContain('CONTEXT-ABSENT BEHAVIOR');
    expect(note).toContain('vacuous');
    expect(note).toContain('configuration error');
  });

  it('documents the De Morgan transformation used in the third clause', () => {
    const note = rule('ORD-3').evaluation_note ?? '';
    expect(note).toContain('De Morgan');
    expect(note).toContain('.every()');
    expect(note).toContain('.some()');
  });
});
