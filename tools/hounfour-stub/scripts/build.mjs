#!/usr/bin/env node
/**
 * `tools/hounfour-stub/scripts/build.mjs` — bundle main's dist into the
 * stub package so `file:./` consumer installs resolve all imports
 * within the stub's package boundary.
 *
 * **Why this exists** (PR-A3.11 iter-2 BLOCKER mitigation):
 *
 * Modern npm/pnpm `file:./` installs COPY package contents into the
 * consumer's `node_modules/` rather than symlinking. The cycle-005
 * stub's prior architecture re-exported from `../../../dist/...`
 * (reaching outside the stub's package directory); after the npm
 * copy, those paths resolve to a non-existent location in the
 * consumer's tree and Node throws ERR_MODULE_NOT_FOUND.
 *
 * This script bundles main's compiled dist into the stub's dist as
 * `_main/`. Stub's index.js then re-exports from `./_main/...`
 * (relative within the package boundary), and after the npm copy
 * everything resolves correctly within the consumer's
 * `node_modules/@0xhoneyjar/loa-hounfour-stub/dist/`.
 *
 * **Determinism**:
 *   - Files copied verbatim (no transformation).
 *   - Generated `index.js` + `index.d.ts` carry the cycle-005 cluster
 *     export list as a fixed string, written deterministically.
 *   - No timestamps, no random IDs in generated output.
 *
 * **Lifecycle**:
 *   - `pnpm install` at repo root invokes the root tsc; this script
 *     runs after main's dist is current.
 *   - Build script invocation: `node tools/hounfour-stub/scripts/build.mjs`
 *     (run from repo root) OR via `pnpm --filter @0xhoneyjar/loa-hounfour-stub run build`.
 *   - The stub's resulting dist/ is COMMITTED so `file:./` consumers
 *     don't need to run the build themselves; check:dist-parity
 *     verifies stub-dist matches its build output across CI runs.
 *
 * @since v8.6.0 — PR-A3.11 (FR-D1) iter-3
 */
import { mkdirSync, copyFileSync, readdirSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUB_ROOT = join(__dirname, '..');
const REPO_ROOT = join(STUB_ROOT, '..', '..');
const MAIN_DIST = join(REPO_ROOT, 'dist');
const STUB_DIST = join(STUB_ROOT, 'dist');
const BUNDLED_MAIN = join(STUB_DIST, '_main');

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) {
      copyTree(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

// Reset stub dist (start fresh; deterministic output).
try {
  rmSync(STUB_DIST, { recursive: true, force: true });
} catch (e) {
  // ignore — directory may not exist on first build
  void e;
}
mkdirSync(STUB_DIST, { recursive: true });

// Copy main's compiled dist tree into stub's dist/_main/.
console.log(`[stub-build] Copying ${MAIN_DIST} → ${BUNDLED_MAIN} ...`);
copyTree(MAIN_DIST, BUNDLED_MAIN);

// Cycle-005 cluster export list. Mirrored across this file (build),
// the differential test (parity verification), and consumer-facing
// README. Adding a new export to the cluster requires updating all
// three; the differential test catches any mismatch.
const CYCLE_005_EXPORTS = [
  // Schemas — integrity / phase completion (FR-B2)
  ["PhaseCompletionEnvelopeTier1Schema", "_main/integrity/phase-completion-envelope-tier1.js"],
  ["type PhaseCompletionEnvelopeTier1", "_main/integrity/phase-completion-envelope-tier1.js"],
  ["PhaseCompletionEnvelopeSchema", "_main/integrity/phase-completion-envelope.js"],
  ["type PhaseCompletionEnvelope", "_main/integrity/phase-completion-envelope.js"],
  // Operations cluster (FR-B3..B8)
  ["OracleDigestSchema", "_main/operations/oracle-digest.js"],
  ["PulseKindSchema", "_main/operations/oracle-digest.js"],
  ["type OracleDigest", "_main/operations/oracle-digest.js"],
  ["type PulseKind", "_main/operations/oracle-digest.js"],
  ["OracleHealthEnvelopeSchema", "_main/operations/oracle-health-envelope.js"],
  ["type OracleHealthEnvelope", "_main/operations/oracle-health-envelope.js"],
  ["EscalationEnvelopeSchema", "_main/operations/escalation-envelope.js"],
  ["type EscalationEnvelope", "_main/operations/escalation-envelope.js"],
  ["RollbackPlanSchema", "_main/operations/rollback-plan.js"],
  ["type RollbackPlan", "_main/operations/rollback-plan.js"],
  ["LatencyHistogramEnvelopeSchema", "_main/operations/latency-histogram-envelope.js"],
  ["type LatencyHistogramEnvelope", "_main/operations/latency-histogram-envelope.js"],
  ["EpicCheckpointSchema", "_main/operations/epic-checkpoint.js"],
  ["type EpicCheckpoint", "_main/operations/epic-checkpoint.js"],
  // Plan-governance (FR-B9, FR-B10)
  ["PlanSignoffEnvelopeSchema", "_main/governance/plan-signoff-envelope.js"],
  ["SignoffActorClassSchema", "_main/governance/plan-signoff-envelope.js"],
  ["SignoffTierSchema", "_main/governance/plan-signoff-envelope.js"],
  ["type PlanSignoffEnvelope", "_main/governance/plan-signoff-envelope.js"],
  ["type SignoffActorClass", "_main/governance/plan-signoff-envelope.js"],
  ["type SignoffTier", "_main/governance/plan-signoff-envelope.js"],
  ["PlanAmendmentRequestSchema", "_main/governance/plan-amendment-request.js"],
  ["type PlanAmendmentRequest", "_main/governance/plan-amendment-request.js"],
  // Challenge layer (FR-A1)
  ["ChallengeSchema", "_main/governance/challenge.js"],
  ["type Challenge", "_main/governance/challenge.js"],
  ["ChallengeTypeSchema", "_main/governance/challenge-types.js"],
  ["ChallengeRequestedEffectSchema", "_main/governance/challenge-types.js"],
  ["CHALLENGE_TYPES", "_main/governance/challenge-types.js"],
  ["CHALLENGE_REQUESTED_EFFECTS", "_main/governance/challenge-types.js"],
  ["type ChallengeType", "_main/governance/challenge-types.js"],
  ["type ChallengeRequestedEffect", "_main/governance/challenge-types.js"],
  // CanonicalRun (FR-B1)
  ["CanonicalRunSchema", "_main/canonical/canonical-run.js"],
  ["RequiredPhaseSchema", "_main/canonical/canonical-run.js"],
  ["validateCanonicalRunCR1", "_main/canonical/canonical-run.js"],
  ["type CanonicalRun", "_main/canonical/canonical-run.js"],
  ["type RequiredPhase", "_main/canonical/canonical-run.js"],
  ["PhaseKindSchema", "_main/canonical/phase-kinds.js"],
  ["PHASE_KINDS", "_main/canonical/phase-kinds.js"],
  ["type PhaseKind", "_main/canonical/phase-kinds.js"],
  // FR-C constraint builtins
  ["evaluateNonceUniquePerSignerWindow", "_main/constraints/builtins/nonce-unique-per-signer-window.js"],
  ["evaluateSequenceMonotonicPerCluster", "_main/constraints/builtins/sequence-monotonic-per-cluster.js"],
  ["evaluateChainValidatorPrevHash", "_main/constraints/builtins/chain-validator-prev-hash.js"],
  ["evaluatePlanContentHashUnchangedSinceSignoff", "_main/constraints/builtins/plan-content-hash-unchanged-since-signoff.js"],
  // Version constants
  ["CONTRACT_VERSION", "_main/version.js"],
  ["MIN_SUPPORTED_VERSION", "_main/version.js"],
  ["SCHEMA_BASE_URL", "_main/version.js"],
];

// Group exports by source module so we emit `export { a, b } from 'mod'`
// blocks rather than one line per export.
const byModule = new Map();
for (const [name, path] of CYCLE_005_EXPORTS) {
  if (!byModule.has(path)) byModule.set(path, []);
  byModule.get(path).push(name);
}

const HEADER = `// Generated by tools/hounfour-stub/scripts/build.mjs — DO NOT EDIT BY HAND.
// Cycle-005 RC-staging stub for @0xhoneyjar/loa-hounfour. Re-exports
// the v8.6.0 cluster (16 schemas + 4 FR-C builtins + version
// constants + canonical arrays) from the bundled main dist at ./_main/.
// See ../README.md for consumer-aliasing guidance.
`;

let indexJs = HEADER + "\n";
let indexDts = HEADER + "\n";
for (const [path, names] of byModule) {
  // Filter out type-only exports for the .js (TypeScript syntax-only).
  const valueExports = names.filter((n) => !n.startsWith("type "));
  if (valueExports.length > 0) {
    indexJs += `export { ${valueExports.join(", ")} } from './${path}';\n`;
  }
  // .d.ts gets all of them (including types).
  indexDts += `export { ${names.join(", ")} } from './${path}';\n`;
}

writeFileSync(join(STUB_DIST, "index.js"), indexJs);
writeFileSync(join(STUB_DIST, "index.d.ts"), indexDts);

// Reviewers' note: PR-A3.11 iter-4 lock-de-scope disposition for
// findings about the bundled main code. Written into `_main/` on
// every build so it survives the rmSync at the top of this script.
const REVIEWERS_NOTE = `# Reviewers' note for \`tools/hounfour-stub/dist/_main/\`

This directory is a **build artifact**, not source code authored by PR-A3.11.

\`tools/hounfour-stub/scripts/build.mjs\` copies the loa-hounfour main package's
compiled \`dist/\` tree into this \`_main/\` directory at stub build time. The
resulting bundle lets \`file:./tools/hounfour-stub\` consumer installs resolve
all imports within the stub's package boundary (npm copies the stub's contents
into the consumer's \`node_modules/\`; relative imports reaching outside the
package boundary break under that copy behavior — verified empirically before
iter-3).

## Findings about \`_main/\` contents are out of scope for the stub PR

Every file under \`_main/\` is a verbatim copy of the corresponding file at the
main package's \`dist/\`. Real concerns about the bundled code (validator
registration semantics, schema-graph guard logic, DAG recursion bounds, etc.)
ARE valid — but they apply to \`src/<original-path>\`, not to anything authored
by PR-A3.11. The correct review channel is a separate PR against the main
\`src/\`, citing this directory as the surface that surfaced the latent issue.

The \`check:dist-parity\` gate verifies \`_main/\` is byte-equal to main's \`dist/\`
on every CI run; drift between them is a hard failure. Iterating on stub
content does not change \`_main/\` — it changes \`tools/hounfour-stub/scripts/build.mjs\`
or \`dist/index.js\` directly.

## Cycle-005 lifecycle context

The \`_main/\` bundle is transient: cycle-005 v8.6.0 ships (PR-A3.12), the stub
follows for ~1 week of RC consumer aliasing, then v8.7.0 deletes the stub
when the registry-published GA is canonical (operator-private specs cover
the broader stub lifecycle).

@since v8.6.0 — PR-A3.11 (FR-D1) iter-4 (cycle-005)
`;
writeFileSync(join(BUNDLED_MAIN, "REVIEWERS_NOTE.md"), REVIEWERS_NOTE);

console.log(`[stub-build] OK: stub/dist/index.js + index.d.ts + _main/REVIEWERS_NOTE.md written; bundled main dist at ${BUNDLED_MAIN}.`);
