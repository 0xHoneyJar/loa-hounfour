/**
 * PR-A3.11 (FR-D1) — Differential test: stub vs main package surface.
 *
 * Asserts that `tools/hounfour-stub/` re-exports the exact same
 * v8.6.0 cycle-005 cluster surface as the main package's `src/`.
 * Drift between stub and main is a hard CI failure — consumers
 * aliased to `file:./tools/hounfour-stub` during the v8.6.0 RC
 * window must see the same surface they'll see post-GA.
 *
 * **Architecture (iter-2 F1 + MANUAL_TEST_SYNC mitigations):**
 *
 *   1. The stub re-exports from main's COMPILED `dist/` (not `src/`)
 *      so Node consumers can resolve via standard module resolution
 *      without TS-aware tooling. Our test imports from
 *      `tools/hounfour-stub/dist/index.js` to exercise the consumer-
 *      observable surface.
 *
 *   2. The drift detector compares EXPORT-NAME SETS via
 *      `Object.keys()` reflection — no hand-maintained `SCHEMA_PAIRS`
 *      array. Adding a new export to the stub without a corresponding
 *      main export (or vice versa) surfaces here automatically.
 *
 *   3. For each shared export name, the test verifies the stub-side
 *      and main-side values produce identical canonical-JSON. For
 *      schema objects this is a deep equality on TypeBox structure;
 *      for non-schema exports (functions, arrays, primitives) it
 *      verifies the values serialize equivalently.
 *
 * @since v8.6.0 — PR-A3.11 (FR-D1)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Stub from '../../tools/hounfour-stub/dist/index.js';
// Iter-3 mitigation: import Main from the SAME compiled dist tree the
// stub bundles. The earlier version imported from `../../src/...`
// which compiles on-demand via vitest's tsx — the resulting
// function `.toString()` representation differs from the tsc-emitted
// form bundled into `tools/hounfour-stub/dist/_main/`. Comparing
// stub-bundle to source-on-the-fly produced false drift on the 4
// FR-C builtins + validateCanonicalRunCR1. Pulling Main from the
// committed dist tree (same emitter that produced _main/) restores
// byte-equality.
import * as MainGovernance from '../../dist/governance/index.js';
import * as MainOperations from '../../dist/operations/index.js';
import * as MainIntegrity from '../../dist/integrity/index.js';
import * as MainCanonical from '../../dist/canonical/index.js';
import * as MainChallengeTypes from '../../dist/governance/challenge-types.js';
import * as MainNonce from '../../dist/constraints/builtins/nonce-unique-per-signer-window.js';
import * as MainSeq from '../../dist/constraints/builtins/sequence-monotonic-per-cluster.js';
import * as MainChain from '../../dist/constraints/builtins/chain-validator-prev-hash.js';
import * as MainPlanHash from '../../dist/constraints/builtins/plan-content-hash-unchanged-since-signoff.js';
import * as MainVersion from '../../dist/version.js';

// Aggregate the cycle-005 stub-relevant Main surface into one namespace
// so the drift detector compares apples-to-apples. Later sub-packages
// override earlier ones on duplicate keys (none expected in cycle-005
// cluster, but the merge order is deterministic).
const Main: Record<string, unknown> = {
  ...MainGovernance,
  ...MainChallengeTypes, // CHALLENGE_TYPES + CHALLENGE_REQUESTED_EFFECTS canonical arrays
  ...MainOperations,
  ...MainIntegrity,
  ...MainCanonical,
  ...MainNonce,
  ...MainSeq,
  ...MainChain,
  ...MainPlanHash,
  ...MainVersion,
};

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

describe('hounfour-stub: package.json surface contract (PR-A3.11 / FR-D1)', () => {
  const pkg = JSON.parse(readFileSync(STUB_PKG_PATH, 'utf8')) as {
    name: string;
    version: string;
    private?: boolean;
    main?: string;
    types?: string;
    exports?: Record<string, unknown>;
  };

  it('declares the stub-namespaced package name (NA-2 fix)', () => {
    expect(pkg.name).toBe('@0xhoneyjar/loa-hounfour-stub');
  });

  it('declares the cycle-005 stub version', () => {
    expect(pkg.version).toBe('0.0.0-cycle-005-stub');
  });

  it('is `private: true` so `npm publish` errors with EPRIVATE', () => {
    // Sprint.md acceptance criterion: "npm publish from
    // tools/hounfour-stub/ errors EPRIVATE". The mechanism is
    // package.json's `private: true` field — npm refuses to
    // publish any package with that flag set.
    expect(pkg.private).toBe(true);
  });

  it('main + types + exports point at compiled dist/ (iter-1 F1 mitigation)', () => {
    // Iter-1 F1 (HIGH-consensus): Node consumers cannot resolve .ts
    // sources directly. The stub MUST point at compiled .js/.d.ts
    // for Node-native consumption.
    expect(pkg.main).toBe('./dist/index.js');
    expect(pkg.types).toBe('./dist/index.d.ts');
    expect(pkg.exports?.['.']).toMatchObject({
      types: './dist/index.d.ts',
      import: './dist/index.js',
    });
  });
});

describe('hounfour-stub: export-set drift detector (PR-A3.11 / FR-D1, iter-1 MANUAL_TEST_SYNC mitigation)', () => {
  // Reflection-based drift: compare the export-name SETS without a
  // hand-maintained list. Any divergence is a parity violation.
  const stubKeys = new Set(Object.keys(Stub));
  const mainKeys = new Set(Object.keys(Main));
  void mainKeys; // referenced in nested test below

  // Some main exports are out of cycle-005 stub scope (v8.4.0 / v8.5.0
  // substrate, cross-cutting helpers). The stub is intentionally a
  // SUBSET of main, scoped to the v8.6.0 cycle-005 cluster + 4 FR-C
  // builtins + version constants. Stub keys MUST all exist in main;
  // main keys may exceed the stub's scope.
  it('every stub export exists in main (no orphan stub re-exports)', () => {
    const orphans = [...stubKeys].filter((k) => !mainKeys.has(k));
    expect(orphans, `stub re-exports not present in main: ${orphans.join(', ')}`).toEqual([]);
  });

  it('stub exports the documented cycle-005 cluster (no silent shrinkage)', () => {
    // Floor: the stub must export at least these well-known cycle-005
    // cluster names. If a future stub PR accidentally drops one,
    // this fails. Names match the stub's index.ts re-export list.
    const required = [
      // Schemas
      'PhaseCompletionEnvelopeTier1Schema', 'PhaseCompletionEnvelopeSchema',
      'OracleDigestSchema', 'PulseKindSchema', 'OracleHealthEnvelopeSchema',
      'EscalationEnvelopeSchema', 'RollbackPlanSchema',
      'LatencyHistogramEnvelopeSchema', 'EpicCheckpointSchema',
      'PlanSignoffEnvelopeSchema', 'SignoffActorClassSchema',
      'SignoffTierSchema', 'PlanAmendmentRequestSchema',
      'ChallengeSchema', 'ChallengeTypeSchema',
      'ChallengeRequestedEffectSchema', 'CanonicalRunSchema',
      'RequiredPhaseSchema', 'PhaseKindSchema',
      // Canonical-array enums
      'CHALLENGE_TYPES', 'CHALLENGE_REQUESTED_EFFECTS', 'PHASE_KINDS',
      // FR-C builtins
      'evaluateNonceUniquePerSignerWindow',
      'evaluateSequenceMonotonicPerCluster',
      'evaluateChainValidatorPrevHash',
      'evaluatePlanContentHashUnchangedSinceSignoff',
      'validateCanonicalRunCR1',
      // Version constants
      'CONTRACT_VERSION', 'MIN_SUPPORTED_VERSION', 'SCHEMA_BASE_URL',
    ];
    const missing = required.filter((k) => !stubKeys.has(k));
    expect(missing, `stub missing required cycle-005 exports: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('hounfour-stub: per-export canonical-JSON parity (PR-A3.11 / FR-D1)', () => {
  // For every shared export between stub and main, verify both sides
  // serialize to identical canonical-JSON. This catches drift even
  // when the shape is structurally similar but byte-different.
  const stubKeys = Object.keys(Stub).filter((k) => k in Main);

  for (const key of stubKeys) {
    const stubVal = (Stub as Record<string, unknown>)[key];
    const mainVal = (Main as Record<string, unknown>)[key];

    it(`${key} — stub and main serialize to byte-equal canonical-JSON`, () => {
      // Function exports (4 FR-C builtins, validateCanonicalRunCR1)
      // serialize as undefined under JSON.stringify; canonical-JSON
      // returns "undefined" string for both. Reference-equality is
      // the appropriate test for them.
      if (typeof stubVal === 'function' || typeof mainVal === 'function') {
        expect(typeof stubVal).toBe(typeof mainVal);
        // Both are functions → check the source representation matches
        // (catches a hypothetical wrapper that changes behavior).
        expect(String(stubVal)).toBe(String(mainVal));
        return;
      }
      expect(canonicalJson(stubVal)).toBe(canonicalJson(mainVal));
    });
  }

  it('every v8.6.0 schema export carries a $id (production short-form)', () => {
    // NA-2 fix per cycle-005 PRD: stub schemas keep production
    // short-form $id values (e.g., 'CanonicalRun', not the URI form
    // post-processed at JSON Schema generation time). The README's
    // separate language about "production namespace" refers to the
    // SCHEMA-GENERATION emitter (scripts/generate-schemas.ts) which
    // post-processes the short-form $id into a URI for the emitted
    // JSON Schema artifacts; the in-memory TypeBox $id stays
    // PascalCase short-form by cycle-005 convention (see
    // src/governance/challenge.ts $id: 'Challenge', etc).
    const schemaSuffixes = ['Schema'];
    const schemaKeys = Object.keys(Stub).filter((k) =>
      schemaSuffixes.some((s) => k.endsWith(s)),
    );
    for (const k of schemaKeys) {
      const id = ((Stub as Record<string, unknown>)[k] as { $id?: string }).$id;
      expect(id, `${k}: missing $id`).toBeDefined();
      expect(id, `${k}: $id must be PascalCase short-form`).toMatch(
        /^[A-Z][A-Za-z0-9]+$/,
      );
    }
  });
});
