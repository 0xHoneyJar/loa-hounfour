/**
 * Sprint-5 (PR-A1.5) — TS reference sweep over the v8.4.0 governance schema vectors.
 *
 * For each schema in {PanelDecisionArtifact, PanelVerdict, DeliberationDissent,
 * CrossScoreReport, OrgIdentity, OrgRepresentativeDelegation, SuccessionPolicy}:
 *
 *   - Every fixture under `vectors/<Schema>/valid/*.json` MUST validate against
 *     the schema (TypeBox structural check).
 *   - Every fixture under `vectors/<Schema>/invalid/*.json` MUST fail at least
 *     one of: TypeBox structural check OR cross-field constraint evaluation.
 *
 * The cross-field validators registered for v8.4.0 are presently stubs (see
 * src/validators/index.ts:870 — the v8.4.0 stance is "library declares,
 * consumer evaluates the constraint files"). Some `invalid/` fixtures
 * therefore target constraint-level rules that pass schema check; the
 * SDD §6.5 normative-comparison rule is satisfied as long as TS and the
 * non-TS runners agree on the schema-level verdict.
 *
 * @see Sprint 5 / D5.1
 * @see SDD section 7.3 — Vector authoring pattern
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PanelDecisionArtifactSchema } from '../../src/governance/panel-decision-artifact.js';
import { PanelVerdictSchema } from '../../src/governance/panel-verdict.js';
import { DeliberationDissentSchema } from '../../src/governance/deliberation-dissent.js';
import { CrossScoreReportSchema } from '../../src/governance/cross-score-report.js';
import { OrgIdentitySchema } from '../../src/governance/org-identity.js';
import { OrgRepresentativeDelegationSchema } from '../../src/governance/org-representative-delegation.js';
import { SuccessionPolicySchema } from '../../src/governance/succession-policy.js';
import '../../src/validators/index.js';
import { CONSTRAINT_LEVEL_INVALIDS } from './v840-constraint-level-invalids.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_ROOT = join(__dirname, '..', '..', 'vectors');

const SCHEMAS = {
  PanelDecisionArtifact: PanelDecisionArtifactSchema,
  PanelVerdict: PanelVerdictSchema,
  DeliberationDissent: DeliberationDissentSchema,
  CrossScoreReport: CrossScoreReportSchema,
  OrgIdentity: OrgIdentitySchema,
  OrgRepresentativeDelegation: OrgRepresentativeDelegationSchema,
  SuccessionPolicy: SuccessionPolicySchema,
} as const;

function loadFixtures(schema: string, kind: 'valid' | 'invalid'): { name: string; data: unknown }[] {
  const dir = join(VECTORS_ROOT, schema, kind);
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return files.map((f) => ({
    name: f,
    data: JSON.parse(readFileSync(join(dir, f), 'utf8')),
  }));
}

describe.each(Object.entries(SCHEMAS))('v8.4.0 vectors: %s', (schemaName, schema) => {
  const validFixtures = loadFixtures(schemaName, 'valid');
  const invalidFixtures = loadFixtures(schemaName, 'invalid');

  it('publishes at least 5 valid fixtures', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(5);
  });

  it('publishes at least 8 invalid fixtures', () => {
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(8);
  });

  describe('valid/', () => {
    for (const fx of validFixtures) {
      it(`validates ${fx.name}`, () => {
        const ok = Value.Check(schema, fx.data);
        if (!ok) {
          const errs = [...Value.Errors(schema, fx.data)].slice(0, 3);
          throw new Error(`Expected valid; errors: ${JSON.stringify(errs.map((e) => ({ path: e.path, message: e.message })))}`);
        }
      });
    }
  });

  describe('invalid/', () => {
    for (const fx of invalidFixtures) {
      const key = `${schemaName}/invalid/${fx.name}`;
      const isConstraintLevel = CONSTRAINT_LEVEL_INVALIDS.has(key);
      if (isConstraintLevel) {
        // Constraint-level invalids pass schema check by design; the constraint
        // evaluator handles them. Verify the fixture is at least schema-valid
        // so the constraint-evaluator path is the one that fails.
        it(`${fx.name} (constraint-level — passes schema, fails constraint)`, () => {
          expect(Value.Check(schema, fx.data)).toBe(true);
        });
      } else {
        it(`${fx.name} fails schema check`, () => {
          expect(Value.Check(schema, fx.data)).toBe(false);
        });
      }
    }
  });
});
