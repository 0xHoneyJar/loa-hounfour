/**
 * v8.8.0 (SDD §3, FR-C4) — ManifestConsumptionReceipt constraints file,
 * cross-field validator branches, and the MCR-3 receipt/manifest join.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  joinReceiptToManifest,
  validateManifestConsumptionReceipt,
  type ManifestConsumptionDecision,
  type ManifestConsumptionDecisionKind,
  type ManifestConsumptionReceipt,
} from '../../src/constraints/manifest-consumption-receipt.js';
import type {
  UnverifiedObligationEntry,
  UnverifiedObligationsManifest,
} from '../../src/constraints/unverified-obligations.js';
import { getCrossFieldValidatorSchemas } from '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'constraints', 'ManifestConsumptionReceipt.constraints.json'), 'utf8'),
) as {
  schema_id: string;
  contract_version: string;
  constraints: Array<{ id: string; evaluator: string; severity: string; expression: string; evaluation_note: string }>;
};

describe('ManifestConsumptionReceipt.constraints.json', () => {
  const byId = (id: string) => FILE.constraints.find((c) => c.id === id)!;

  it('declares schema_id and contract_version 8.8.0', () => {
    expect(FILE.schema_id).toBe('ManifestConsumptionReceipt');
    expect(FILE.contract_version).toBe('8.8.0');
  });

  it('publishes exactly MCR-1..MCR-3', () => {
    expect(FILE.constraints.map((c) => c.id)).toEqual(['MCR-1', 'MCR-2', 'MCR-3']);
  });

  it('MCR-1 is a library unique_values rule', () => {
    expect(byId('MCR-1').evaluator).toBe('library');
    expect(byId('MCR-1').expression).toBe("unique_values(decisions, 'rule_id')");
  });

  it('MCR-2 is library (structural restatement) and names the rejected/escalated case', () => {
    expect(byId('MCR-2').evaluator).toBe('library');
    expect(byId('MCR-2').expression).toContain("decision == 'rejected'");
    expect(byId('MCR-2').expression).toContain("decision == 'escalated'");
  });

  it('MCR-3 is runtime-deferred and points at joinReceiptToManifest', () => {
    expect(byId('MCR-3').evaluator).toBe('runtime-deferred');
    expect(byId('MCR-3').evaluation_note).toContain('joinReceiptToManifest');
  });

  it('every rule is error severity', () => {
    for (const c of FILE.constraints) expect(c.severity).toBe('error');
  });

  it('MCR-N1 (judgements are not graded) is stated', () => {
    expect(byId('MCR-2').evaluation_note).toContain('MCR-N1');
  });

  it('the cross-field validator is registered', () => {
    expect(getCrossFieldValidatorSchemas()).toContain('ManifestConsumptionReceipt');
  });
});

describe('validateManifestConsumptionReceipt', () => {
  const d = (rule_id: string): Record<string, unknown> => ({ rule_id, decision: 'rejected' });

  it('rejects null, arrays and primitives with a precondition error', () => {
    for (const bad of [null, [], 'x', 1, undefined]) {
      const r = validateManifestConsumptionReceipt(bad);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatch(/^MCR: structural shape precondition/);
    }
  });

  it('rejects a non-array decisions field', () => {
    const r = validateManifestConsumptionReceipt({ decisions: {} });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('decisions must be an array');
  });

  it('accepts distinct rule_ids', () => {
    expect(validateManifestConsumptionReceipt({ decisions: [d('A'), d('B')] })).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('reports one MCR-1 error per duplicated rule_id with all indices', () => {
    const r = validateManifestConsumptionReceipt({ decisions: [d('A'), d('B'), d('A'), d('B'), d('A')] });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(2);
    expect(r.errors.find((e) => e.includes('"A"'))).toContain('0, 2, 4');
    expect(r.errors.find((e) => e.includes('"B"'))).toContain('1, 3');
  });

  it('skips non-object decision elements (structural tier rejects them first)', () => {
    expect(validateManifestConsumptionReceipt({ decisions: [null, 'x', d('A')] }).valid).toBe(true);
  });
});

// -------------------------------------------------------------------------
// joinReceiptToManifest
// -------------------------------------------------------------------------

const HEADER = { schema_id: 'S', contract_version: '8.8.0', manifest_emitted_at: '2026-10-14T00:00:00Z' };

function entry(rule_id: string, reason?: UnverifiedObligationEntry['reason']): UnverifiedObligationEntry {
  return {
    rule_id,
    rule: 'r',
    evaluator: 'consumer',
    ...(reason ? { reason } : {}),
    evaluation_note: 'n',
    consumer_acknowledgment_required: true,
  };
}
function manifest(entries: UnverifiedObligationEntry[]): UnverifiedObligationsManifest {
  return { ...HEADER, unverified_rules: entries };
}
function decision(rule_id: string, kind: ManifestConsumptionDecisionKind = 'verified_externally', reason?: string): ManifestConsumptionDecision {
  return {
    rule_id,
    ...(reason ? { reason } : {}),
    decision: kind,
    judgement: 'Yes.',
    decided_by: 'approver',
    decided_at: '2026-10-14T00:01:00Z',
  };
}
function receipt(decisions: ManifestConsumptionDecision[], over: Partial<ManifestConsumptionReceipt> = {}): ManifestConsumptionReceipt {
  return {
    receipt_id: '7f9c2b1e-3a4d-4e5f-8a6b-1c2d3e4f5a6b',
    ...HEADER,
    consumer_id: 'c',
    decisions,
    decided_at: '2026-10-14T00:02:00Z',
    ...over,
  };
}

describe('joinReceiptToManifest — branches', () => {
  it('complete + mc1_satisfied when every rule is verified', () => {
    const r = joinReceiptToManifest(
      manifest([entry('CRYPTO_DEFERRED', 'crypto_deferred'), entry('ORD-3', 'context_absent')]),
      receipt([decision('CRYPTO_DEFERRED', 'verified_externally', 'crypto_deferred'), decision('ORD-3', 'accepted_risk')]),
    );
    expect(r).toEqual({
      header_mismatches: [],
      undecided_rule_ids: [],
      unknown_rule_ids: [],
      reason_mismatch_rule_ids: [],
      rejected_rule_ids: [],
      escalated_rule_ids: [],
      complete: true,
      mc1_satisfied: true,
    });
  });

  it('one decision covers several entries sharing a rule_id (ORD-5 per drift key)', () => {
    const r = joinReceiptToManifest(
      manifest([entry('ORD-5', 'vocabulary_drift'), entry('ORD-5', 'vocabulary_drift')]),
      receipt([decision('ORD-5', 'accepted_risk', 'vocabulary_drift')]),
    );
    expect(r.complete).toBe(true);
  });

  it('reports each header mismatch', () => {
    const r = joinReceiptToManifest(
      manifest([entry('A')]),
      receipt([decision('A')], { schema_id: 'T', contract_version: '8.7.0', manifest_emitted_at: '2026-10-14T00:00:01Z' }),
    );
    expect(r.header_mismatches).toEqual(['schema_id', 'contract_version', 'manifest_emitted_at']);
    expect(r.complete).toBe(false);
    expect(r.mc1_satisfied).toBe(false);
  });

  it('reports undecided rules', () => {
    const r = joinReceiptToManifest(manifest([entry('B'), entry('A'), entry('C')]), receipt([decision('B')]));
    expect(r.undecided_rule_ids).toEqual(['A', 'C']);
    expect(r.complete).toBe(false);
  });

  it('reports decisions for rules not in the manifest', () => {
    const r = joinReceiptToManifest(manifest([entry('A')]), receipt([decision('A'), decision('Z')]));
    expect(r.unknown_rule_ids).toEqual(['Z']);
    expect(r.complete).toBe(false);
  });

  it('reports a decision reason that no entry with that rule_id carries', () => {
    const r = joinReceiptToManifest(
      manifest([entry('ORD-3', 'context_absent'), entry('X')]),
      receipt([decision('ORD-3', 'verified_externally', 'pattern_matching'), decision('X', 'verified_externally', 'crypto_deferred')]),
    );
    expect(r.reason_mismatch_rule_ids).toEqual(['ORD-3', 'X']);
    expect(r.complete).toBe(false);
  });

  it('a decision without reason never reason-mismatches', () => {
    const r = joinReceiptToManifest(manifest([entry('ORD-3', 'context_absent')]), receipt([decision('ORD-3')]));
    expect(r.reason_mismatch_rule_ids).toEqual([]);
  });

  it('complete but rejected: mc1_satisfied false (fail closed)', () => {
    const r = joinReceiptToManifest(manifest([entry('A'), entry('B')]), receipt([decision('A', 'rejected'), decision('B')]));
    expect(r.complete).toBe(true);
    expect(r.rejected_rule_ids).toEqual(['A']);
    expect(r.mc1_satisfied).toBe(false);
  });

  it('complete but escalated: mc1_satisfied false', () => {
    const r = joinReceiptToManifest(manifest([entry('A')]), receipt([decision('A', 'escalated')]));
    expect(r.complete).toBe(true);
    expect(r.escalated_rule_ids).toEqual(['A']);
    expect(r.mc1_satisfied).toBe(false);
  });

  it('does not mutate its inputs', () => {
    const m = manifest([entry('A', 'crypto_deferred')]);
    const rc = receipt([decision('A')]);
    const before = JSON.stringify([m, rc]);
    joinReceiptToManifest(m, rc);
    expect(JSON.stringify([m, rc])).toBe(before);
  });
});

describe('joinReceiptToManifest — properties', () => {
  const ruleId = fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F');
  const kind = fc.constantFrom<ManifestConsumptionDecisionKind>('verified_externally', 'accepted_risk', 'rejected', 'escalated');
  const manifestArb = fc.array(ruleId, { minLength: 1, maxLength: 8 }).map((ids) => manifest(ids.map((id) => entry(id))));
  const decisionsArb = fc
    .uniqueArray(fc.tuple(ruleId, kind), { selector: ([id]) => id, minLength: 1, maxLength: 6 })
    .map((xs) => xs.map(([id, k]) => decision(id, k)));

  it('undecided and decided-known rule_ids partition the manifest rule_id set', () => {
    fc.assert(
      fc.property(manifestArb, decisionsArb, (m, ds) => {
        const r = joinReceiptToManifest(m, receipt(ds));
        const manifestIds = new Set(m.unverified_rules.map((e) => e.rule_id));
        const decidedKnown = ds.map((d) => d.rule_id).filter((id) => manifestIds.has(id));
        const union = new Set([...r.undecided_rule_ids, ...decidedKnown]);
        expect([...union].sort()).toEqual([...manifestIds].sort());
        for (const id of r.undecided_rule_ids) expect(decidedKnown).not.toContain(id);
        for (const id of r.unknown_rule_ids) expect(manifestIds.has(id)).toBe(false);
      }),
    );
  });

  it('monotonic: adding a decision for an undecided rule never grows undecided_rule_ids', () => {
    fc.assert(
      fc.property(manifestArb, decisionsArb, kind, (m, ds, k) => {
        const before = joinReceiptToManifest(m, receipt(ds));
        fc.pre(before.undecided_rule_ids.length > 0);
        const next = [...ds, decision(before.undecided_rule_ids[0], k)];
        const after = joinReceiptToManifest(m, receipt(next));
        expect(after.undecided_rule_ids.length).toBe(before.undecided_rule_ids.length - 1);
      }),
    );
  });

  it('flipping any decision to rejected makes mc1_satisfied false', () => {
    fc.assert(
      fc.property(manifestArb, decisionsArb, fc.nat(), (m, ds, i) => {
        const idx = i % ds.length;
        const flipped = ds.map((d, j) => (j === idx ? { ...d, decision: 'rejected' as const } : d));
        expect(joinReceiptToManifest(m, receipt(flipped)).mc1_satisfied).toBe(false);
      }),
    );
  });

  it('mc1_satisfied implies complete, and complete is exactly the conjunction of the four empty lists', () => {
    fc.assert(
      fc.property(manifestArb, decisionsArb, (m, ds) => {
        const r = joinReceiptToManifest(m, receipt(ds));
        if (r.mc1_satisfied) expect(r.complete).toBe(true);
        expect(r.complete).toBe(
          r.header_mismatches.length === 0
            && r.undecided_rule_ids.length === 0
            && r.unknown_rule_ids.length === 0
            && r.reason_mismatch_rule_ids.length === 0,
        );
      }),
    );
  });

  it('deciding every manifest rule as verified_externally is always mc1_satisfied', () => {
    fc.assert(
      fc.property(manifestArb, (m) => {
        const ids = [...new Set(m.unverified_rules.map((e) => e.rule_id))];
        expect(joinReceiptToManifest(m, receipt(ids.map((id) => decision(id)))).mc1_satisfied).toBe(true);
      }),
    );
  });
});
