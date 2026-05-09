/**
 * PR-A3.11 (FR-D1) — Differential test: stub vs main package surface.
 *
 * Asserts that `tools/hounfour-stub/src/index.ts` re-exports the
 * exact same v8.6.0 cycle-005 cluster schemas + 4 FR-C builtins as
 * the main `src/index.ts` exposes. The contract: every schema's
 * canonical-JSON serialization is byte-identical between stub and
 * main, and the schema $id strings retain the production namespace.
 *
 * Drift between stub and main is a hard CI failure — consumers
 * aliased to `file:./tools/hounfour-stub` during the v8.6.0 RC
 * window must see the same surface they'll see post-GA.
 *
 * **Architecture note**: the stub's `src/index.ts` directly
 * `export {...} from '../../../src/...'` rather than maintaining
 * its own schema definitions. This makes the differential test
 * almost-trivial today (same TypeBox object reference resolves on
 * both sides). The test stays load-bearing because:
 *
 *   1. A future refactor that splits the stub off (e.g., to ship
 *      independently-built schemas to break a build-graph cycle)
 *      would surface as a canonical-JSON divergence here.
 *   2. The `$id` discipline check anchors the NA-2 contract: stub
 *      schemas MUST carry production namespace identifiers so
 *      consumers transitioning from `file:./` alias to published
 *      package don't observe an `$id`-string change.
 *   3. The package.json `private: true` assertion verifies the
 *      `EPRIVATE` publish-prevention contract from sprint.md.
 *
 * @since v8.6.0 — PR-A3.11 (FR-D1)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Stub from '../../tools/hounfour-stub/src/index.js';
// Import the same schemas directly from main for the byte-equality
// comparison. The stub re-exports these — so the diff test is a
// structural-equality assertion, not a deep canonicalization one.
import { PhaseCompletionEnvelopeTier1Schema } from '../../src/integrity/phase-completion-envelope-tier1.js';
import { PhaseCompletionEnvelopeSchema } from '../../src/integrity/phase-completion-envelope.js';
import { OracleDigestSchema, PulseKindSchema } from '../../src/operations/oracle-digest.js';
import { OracleHealthEnvelopeSchema } from '../../src/operations/oracle-health-envelope.js';
import { EscalationEnvelopeSchema } from '../../src/operations/escalation-envelope.js';
import { RollbackPlanSchema } from '../../src/operations/rollback-plan.js';
import { LatencyHistogramEnvelopeSchema } from '../../src/operations/latency-histogram-envelope.js';
import { EpicCheckpointSchema } from '../../src/operations/epic-checkpoint.js';
import {
  PlanSignoffEnvelopeSchema,
  SignoffActorClassSchema,
  SignoffTierSchema,
} from '../../src/governance/plan-signoff-envelope.js';
import { PlanAmendmentRequestSchema } from '../../src/governance/plan-amendment-request.js';
import { ChallengeSchema } from '../../src/governance/challenge.js';
import {
  ChallengeTypeSchema,
  ChallengeRequestedEffectSchema,
  CHALLENGE_TYPES,
  CHALLENGE_REQUESTED_EFFECTS,
} from '../../src/governance/challenge-types.js';
import {
  CanonicalRunSchema,
  RequiredPhaseSchema,
} from '../../src/canonical/canonical-run.js';
import { PhaseKindSchema, PHASE_KINDS } from '../../src/canonical/phase-kinds.js';
import { CONTRACT_VERSION } from '../../src/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const STUB_PKG_PATH = join(REPO_ROOT, 'tools', 'hounfour-stub', 'package.json');

/**
 * Recursive sorted-key canonicalization. Matches the cross-runner
 * harness's canonicalJson per `scripts/cross-runner.ts` so the
 * differential test asserts the same byte-equality semantics the
 * cross-language runners enforce.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ':' +
          canonicalJson((value as Record<string, unknown>)[k]),
      )
      .join(',') +
    '}'
  );
}

const SCHEMA_PAIRS: Array<{ name: string; stub: unknown; main: unknown }> = [
  { name: 'PhaseCompletionEnvelopeTier1', stub: Stub.PhaseCompletionEnvelopeTier1Schema, main: PhaseCompletionEnvelopeTier1Schema },
  { name: 'PhaseCompletionEnvelope', stub: Stub.PhaseCompletionEnvelopeSchema, main: PhaseCompletionEnvelopeSchema },
  { name: 'OracleDigest', stub: Stub.OracleDigestSchema, main: OracleDigestSchema },
  { name: 'PulseKind', stub: Stub.PulseKindSchema, main: PulseKindSchema },
  { name: 'OracleHealthEnvelope', stub: Stub.OracleHealthEnvelopeSchema, main: OracleHealthEnvelopeSchema },
  { name: 'EscalationEnvelope', stub: Stub.EscalationEnvelopeSchema, main: EscalationEnvelopeSchema },
  { name: 'RollbackPlan', stub: Stub.RollbackPlanSchema, main: RollbackPlanSchema },
  { name: 'LatencyHistogramEnvelope', stub: Stub.LatencyHistogramEnvelopeSchema, main: LatencyHistogramEnvelopeSchema },
  { name: 'EpicCheckpoint', stub: Stub.EpicCheckpointSchema, main: EpicCheckpointSchema },
  { name: 'PlanSignoffEnvelope', stub: Stub.PlanSignoffEnvelopeSchema, main: PlanSignoffEnvelopeSchema },
  { name: 'SignoffActorClass', stub: Stub.SignoffActorClassSchema, main: SignoffActorClassSchema },
  { name: 'SignoffTier', stub: Stub.SignoffTierSchema, main: SignoffTierSchema },
  { name: 'PlanAmendmentRequest', stub: Stub.PlanAmendmentRequestSchema, main: PlanAmendmentRequestSchema },
  { name: 'Challenge', stub: Stub.ChallengeSchema, main: ChallengeSchema },
  { name: 'ChallengeType', stub: Stub.ChallengeTypeSchema, main: ChallengeTypeSchema },
  { name: 'ChallengeRequestedEffect', stub: Stub.ChallengeRequestedEffectSchema, main: ChallengeRequestedEffectSchema },
  { name: 'CanonicalRun', stub: Stub.CanonicalRunSchema, main: CanonicalRunSchema },
  { name: 'RequiredPhase', stub: Stub.RequiredPhaseSchema, main: RequiredPhaseSchema },
  { name: 'PhaseKind', stub: Stub.PhaseKindSchema, main: PhaseKindSchema },
];

describe('hounfour-stub: package.json surface contract (PR-A3.11 / FR-D1)', () => {
  const pkg = JSON.parse(readFileSync(STUB_PKG_PATH, 'utf8')) as {
    name: string;
    version: string;
    private?: boolean;
  };

  it('declares the stub-namespaced package name (NA-2 fix)', () => {
    expect(pkg.name).toBe('@0xhoneyjar/loa-hounfour-stub');
  });

  it('declares the cycle-005 stub version (not a real semver line)', () => {
    expect(pkg.version).toBe('0.0.0-cycle-005-stub');
  });

  it('is `private: true` so `npm publish` errors with EPRIVATE', () => {
    // The cycle-005 sprint plan acceptance criterion is "npm publish
    // from tools/hounfour-stub/ errors EPRIVATE". The mechanism is
    // package.json's `private: true` field — npm refuses to publish
    // any package with that flag set, emitting the EPRIVATE error
    // code. We verify the field at the source rather than running
    // npm publish in CI (which would require credentials and side-
    // effects).
    expect(pkg.private).toBe(true);
  });
});

describe('hounfour-stub: surface differential vs main (PR-A3.11 / FR-D1)', () => {
  it.each(SCHEMA_PAIRS)('$name — stub-exported schema is referentially equal to main', ({ name: _name, stub, main }) => {
    // The cycle-005 design has the stub re-export FROM main, so
    // referential equality is the expected outcome. If a future
    // refactor splits the stub to its own definitions, this
    // assertion fails — alerting reviewers that the canonical-JSON
    // pair-by-pair byte-equality check below is now actually
    // load-bearing rather than tautological.
    expect(stub).toBe(main);
  });

  it.each(SCHEMA_PAIRS)('$name — canonical-JSON byte-equal stub vs main', ({ name: _name, stub, main }) => {
    // Even when referential equality holds, recompute canonical-JSON
    // on each side independently — the test as a contract DEFENDS
    // the post-PR-A3.11 invariant that consumer-observable schema
    // bytes are identical between stub and main. Future drift
    // surfaces here.
    expect(canonicalJson(stub)).toBe(canonicalJson(main));
  });

  it('every v8.6.0 schema has a $id retaining the production namespace', () => {
    // NA-2 fix per cycle-005 PRD: stub schemas keep production
    // $id values so consumers querying Schema.$id see the same
    // identifier across the file:./ alias and the published
    // package.
    for (const { name: _name, stub } of SCHEMA_PAIRS) {
      const id = (stub as { $id?: string }).$id;
      expect(id, `${_name}: missing $id`).toBeDefined();
      // $id values should be PascalCase (cycle-005 convention).
      expect(id).toMatch(/^[A-Z][A-Za-z0-9]+$/);
    }
  });
});

describe('hounfour-stub: builtin re-exports (PR-A3.11 / FR-D1)', () => {
  // The four FR-C constraint builtins are pure functions; we assert
  // the stub re-exports the same function references as main.
  it('evaluateNonceUniquePerSignerWindow is referentially equal', async () => {
    const main = await import('../../src/constraints/builtins/nonce-unique-per-signer-window.js');
    expect(Stub.evaluateNonceUniquePerSignerWindow).toBe(main.evaluateNonceUniquePerSignerWindow);
  });

  it('evaluateSequenceMonotonicPerCluster is referentially equal', async () => {
    const main = await import('../../src/constraints/builtins/sequence-monotonic-per-cluster.js');
    expect(Stub.evaluateSequenceMonotonicPerCluster).toBe(main.evaluateSequenceMonotonicPerCluster);
  });

  it('evaluateChainValidatorPrevHash is referentially equal', async () => {
    const main = await import('../../src/constraints/builtins/chain-validator-prev-hash.js');
    expect(Stub.evaluateChainValidatorPrevHash).toBe(main.evaluateChainValidatorPrevHash);
  });

  it('evaluatePlanContentHashUnchangedSinceSignoff is referentially equal', async () => {
    const main = await import('../../src/constraints/builtins/plan-content-hash-unchanged-since-signoff.js');
    expect(Stub.evaluatePlanContentHashUnchangedSinceSignoff).toBe(main.evaluatePlanContentHashUnchangedSinceSignoff);
  });

  it('CHALLENGE_TYPES + CHALLENGE_REQUESTED_EFFECTS canonical arrays are referentially equal', () => {
    expect(Stub.CHALLENGE_TYPES).toBe(CHALLENGE_TYPES);
    expect(Stub.CHALLENGE_REQUESTED_EFFECTS).toBe(CHALLENGE_REQUESTED_EFFECTS);
    expect(Stub.PHASE_KINDS).toBe(PHASE_KINDS);
  });

  it('CONTRACT_VERSION re-export matches main', () => {
    expect(Stub.CONTRACT_VERSION).toBe(CONTRACT_VERSION);
  });
});
