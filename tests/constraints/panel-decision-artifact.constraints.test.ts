/**
 * Tests for the PanelDecisionArtifact constraint file (PR-A1.4, v8.4.0).
 *
 * Covers PDA-1 .. PDA-5 from SDD section 3.6:
 *   - PDA-1: every claim carries a non-null grounding
 *   - PDA-2: claims form a valid DAG (uses is_valid_dag builtin)
 *   - PDA-3: tool_output groundings carry a sha256:<64hex> output_hash (length 71)
 *   - PDA-4: speculative claims require routing_decision == 'panel'
 *   - PDA-5: acknowledged_judgment groundings carry source + non-empty justification
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'PanelDecisionArtifact.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function ruleExpr(id: string): string {
  const rule = constraintFile.constraints.find((c: { id: string }) => c.id === id);
  if (!rule) throw new Error(`rule ${id} not found`);
  return rule.expression as string;
}

const validHash = `sha256:${'a'.repeat(64)}`;

describe('PanelDecisionArtifact constraint file structure', () => {
  it('targets the PanelDecisionArtifact schema', () => {
    expect(constraintFile.schema_id).toBe('PanelDecisionArtifact');
  });

  it('declares contract_version 8.4.0', () => {
    expect(constraintFile.contract_version).toBe('8.4.0');
  });

  it('contains exactly 5 constraints (PDA-1 .. PDA-5)', () => {
    expect(constraintFile.constraints).toHaveLength(5);
    const ids = constraintFile.constraints.map((c: { id: string }) => c.id);
    expect(ids).toEqual(['PDA-1', 'PDA-2', 'PDA-3', 'PDA-4', 'PDA-5']);
  });

  it('marks every constraint evaluator as library', () => {
    for (const c of constraintFile.constraints) {
      expect(c.evaluator).toBe('library');
    }
  });
});

describe('PDA-1 — claims.every(c => c.grounding != null)', () => {
  const expr = ruleExpr('PDA-1');

  it('passes when every claim carries a grounding', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'tool_output', output_hash: validHash } },
        { claim_id: 'b', grounding: { type: 'claim_reference', claim_id: 'a' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when any claim has a null grounding', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'tool_output', output_hash: validHash } },
        { claim_id: 'b', grounding: null },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});

describe('PDA-2 — is_valid_dag(claims, claim_id, grounding.artifact_id, grounding.claim_id)', () => {
  const expr = ruleExpr('PDA-2');

  it('passes for a linear DAG over claim_reference edges', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'tool_output', output_hash: validHash } },
        { claim_id: 'b', grounding: { type: 'claim_reference', claim_id: 'a' } },
        { claim_id: 'c', grounding: { type: 'claim_reference', claim_id: 'b' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails on a self-cycle', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'claim_reference', claim_id: 'a' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails on a two-node cycle through grounding.claim_id', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'claim_reference', claim_id: 'b' } },
        { claim_id: 'b', grounding: { type: 'claim_reference', claim_id: 'a' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when an edge points at a missing node (dangling ref)', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'claim_reference', claim_id: 'missing' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});

describe('PDA-3 — tool_output groundings require sha256:<64hex> output_hash (length 71)', () => {
  const expr = ruleExpr('PDA-3');

  it('passes when tool_output groundings carry a 71-char output_hash', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'tool_output', output_hash: validHash } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when no tool_output groundings are present (vacuous)', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'acknowledged_judgment', source: { agent_id: 's' }, justification: 'why' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when a tool_output grounding carries a too-short output_hash', () => {
    const data = {
      claims: [
        { claim_id: 'a', grounding: { type: 'tool_output', output_hash: 'sha256:short' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});

describe('PDA-4 — speculative claims require routing_decision == "panel"', () => {
  const expr = ruleExpr('PDA-4');

  it('passes when a speculative claim is on the panel routing path', () => {
    const data = {
      claims: [{ claim_id: 'a', confidence: 'speculative' }],
      trust_context: { routing_decision: 'panel' },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when no claims are speculative (vacuous)', () => {
    const data = {
      claims: [{ claim_id: 'a', confidence: 'high_confidence' }],
      trust_context: { routing_decision: 'auto-honor' },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when a speculative claim is auto-honored', () => {
    const data = {
      claims: [{ claim_id: 'a', confidence: 'speculative' }],
      trust_context: { routing_decision: 'auto-honor' },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when a speculative claim is auto-rejected', () => {
    const data = {
      claims: [{ claim_id: 'a', confidence: 'speculative' }],
      trust_context: { routing_decision: 'auto-reject' },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});

describe('PDA-5 — acknowledged_judgment groundings require source + non-empty justification', () => {
  const expr = ruleExpr('PDA-5');

  it('passes when an acknowledged_judgment carries source and justification', () => {
    const data = {
      claims: [{
        claim_id: 'a',
        grounding: {
          type: 'acknowledged_judgment',
          source: { agent_id: 'human-1' },
          justification: 'rationale text',
        },
      }],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when no acknowledged_judgment groundings are present (vacuous)', () => {
    const data = {
      claims: [{ claim_id: 'a', grounding: { type: 'tool_output', output_hash: validHash } }],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when source is null on an acknowledged_judgment', () => {
    const data = {
      claims: [{
        claim_id: 'a',
        grounding: { type: 'acknowledged_judgment', source: null, justification: 'rationale' },
      }],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when justification is empty on an acknowledged_judgment', () => {
    const data = {
      claims: [{
        claim_id: 'a',
        grounding: { type: 'acknowledged_judgment', source: { agent_id: 'human-1' }, justification: '' },
      }],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});
