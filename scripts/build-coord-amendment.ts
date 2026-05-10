#!/usr/bin/env node
/**
 * `scripts/build-coord-amendment.ts` — generate the cross-repo
 * coordination reply as a `PlanAmendmentRequest`-shaped JSON object.
 *
 * Why JSON-from-this-repo's-vocabulary instead of free-text:
 * the coord receiver runs `coord-sync.sh` which propagates replies
 * structurally. Free-text replies risk pollution-invariant leaks
 * from upstream-text-paste. This script emits a content-typed JSON
 * document validated against `PlanAmendmentRequestSchema` (v8.6.0);
 * every field is enum-validated against this-repo's vocabulary.
 *
 * Usage:
 *   node scripts/build-coord-amendment.ts > /tmp/cycle-007-amendment.json
 *   gh issue comment 85 --body-file /tmp/cycle-007-amendment.json
 *
 * Variants (selected via --variant flag):
 *   - --variant kickoff (default): cycle-007 PR-A4.0 amendment
 *     documenting rename + carry-forward + deferral.
 *   - --variant release: post-PR-A4.7 reply with v8.7.0 release URL
 *     and tarball SHA-256 (lands when PR-A4.7 ships).
 *
 * Output:
 *   stdout: validated JSON envelope ready for `gh issue comment`
 *   exit 0 on success; non-zero if validation against
 *   PlanAmendmentRequestSchema fails.
 *
 * @since cycle-007 PR-A4.0
 */
import { Value } from '@sinclair/typebox/value';
import { PlanAmendmentRequestSchema } from '../src/governance/plan-amendment-request.js';
import { CONTRACT_VERSION } from '../src/version.js';

const ZERO_SHA256 =
  'sha256:0000000000000000000000000000000000000000000000000000000000000000';

interface CliArgs {
  variant: 'kickoff' | 'release';
  releaseUrl?: string;
  tarballSha256?: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { variant: 'kickoff' };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--variant') {
      const v = argv[++i];
      if (v !== 'kickoff' && v !== 'release') {
        throw new Error(`unknown --variant: ${v}`);
      }
      args.variant = v;
    } else if (flag === '--release-url') {
      args.releaseUrl = argv[++i];
    } else if (flag === '--tarball-sha256') {
      args.tarballSha256 = argv[++i];
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }
  }
  return args;
}

function nowSecondsZ(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

function buildKickoffAmendment(): unknown {
  const proposedDelta = [
    'cycle-007 / v8.7.0 amendment to upstream Sprint 2 Track A2 kickoff (hounfour#85 comment 4412531467).',
    '',
    'Three structural changes filed against the kickoff comment scope:',
    '',
    '1. RENAME: the upstream-named cluster-run-series schema (kickoff',
    '   comment’s spelling) -> ClusterRunSeriesSchema. This repo carries',
    '   a pollution invariant forbidding the upstream term in committed',
    '   surface; the rename mirrors v8.6.0 PR-A3.8 which renamed the',
    '   v8.6.0 canonical-run schema for the same reason. Cycle-005 PRD',
    '   section 4.5 already locked this rename for v8.7.0. Recommended',
    '   action upstream: master plan content-hash should reference',
    '   ClusterRunSeriesSchema post-amendment.',
    '',
    '2. CARRY-FORWARD: SubscriptionPoolStateSchema (cycle-005 FR-E3).',
    '   Scheduled for v8.7.0 in cycle-005 forward plan but not in the',
    '   kickoff comment. Including it in cycle-007 scope to preserve',
    '   cycle-005 locked decisions absent explicit operator re-scoping.',
    '   If the operator session intentionally dropped FR-E3, please reply',
    '   on this issue and v8.7.0 will exclude it.',
    '',
    '3. DEFERRAL: RotationSeamCertificateSchema -> upstream Sprint 7.',
    '   Per kickoff caveat ("flagged as maybe-defer-to-S7 if underspec-d',
    '   at the schema level - your call"). Schema-level shape is',
    '   under-specified at the field level pending rotation-seam',
    '   semantic lock at S7 design step. Locking under-specified shape',
    '   into the v8.x.y additive surface is irreversible without a major bump.',
    '',
    'Net cycle-007 scope: 5 schemas (ClusterRunSeries, InterSeriesScoping,',
    'SubscriptionPoolState carry-forward, RevocationList, MergeArtifact)',
    '+ 1 non-published bin script (conformance-replay).',
    '',
    'Phase 0 review converged after 3 multi-model adversarial-review',
    'runs. RFC committed at docs/rfcs/v8.7.0-conformance-measurability.md.',
    'PR-A4.0 scaffolds: 5 schema stubs (Type.Never reservations) + 3',
    'cross-runner SSOT files + this amendment script. Constraint files',
    'land per-schema in PR-A4.1..A4.5 alongside the bodies.',
  ].join('\n');

  return {
    envelope_kind: 'plan_amendment_request',
    contract_version: '8.6.0',
    ts: nowSecondsZ(),
    cluster_id: 'cycle-007-coord',
    actor_id: 'jani',
    parent_signoff_id: 'hounfour-85-comment-4412531467',
    parent_plan_hash: ZERO_SHA256,
    proposed_delta: proposedDelta,
    severity: 'minor',
    trigger_class: 'ambiguity',
    rationale:
      'Kickoff comment ambiguity on rename and FR-E3 omission. Three ' +
      'structural changes filed for coord-sync.sh propagation: rename ' +
      '(pollution invariant), carry-forward (cycle-005 forward plan ' +
      'preservation), deferral (per kickoff S7 caveat).',
    recommended_paths: [
      {
        id: 'accept-amendment',
        summary:
          'Upstream master plan accepts the rename, carry-forward, and ' +
          'deferral; v8.7.0 ships with 5 schemas as listed.',
        tradeoff:
          'Master plan content-hash bumps; coord-sync.sh propagates the ' +
          'change. Zero hounfour-side rework.',
      },
      {
        id: 'reject-carry-forward',
        summary:
          'Operator session intentionally dropped FR-E3; instructs ' +
          'cycle-007 to exclude SubscriptionPoolStateSchema.',
        tradeoff:
          'Cycle-007 ships 4 schemas instead of 5. FR-E3 returns at ' +
          'v8.8.0 or later if and when consumer-corpus signal warrants.',
      },
      {
        id: 'override-rename',
        summary:
          'Upstream rejects the rename and requires the literal ' +
          'kickoff name. Hounfour cannot comply without violating ' +
          'its pollution invariant.',
        tradeoff:
          'Cycle-007 stalls; conflict requires maintainer-level ' +
          'resolution between the upstream session policy and this ' +
          'repo CLAUDE.local.md invariant. Not recommended.',
      },
    ],
    jury_recommendation: null,
    chain_refs: {
      prev_envelope_hash: ZERO_SHA256,
    },
  };
}

function buildReleaseAmendment(args: CliArgs): unknown {
  if (!args.releaseUrl) throw new Error('--release-url required for release variant');
  if (!args.tarballSha256)
    throw new Error('--tarball-sha256 required for release variant');

  const proposedDelta = [
    `cycle-007 / v${CONTRACT_VERSION} ship notification.`,
    '',
    `Release URL: ${args.releaseUrl}`,
    `Tarball SHA-256: ${args.tarballSha256}`,
    '',
    'Net cycle-007 deliverables:',
    '- 5 schemas: ClusterRunSeries, InterSeriesScoping,',
    '  SubscriptionPoolState, RevocationList, MergeArtifact.',
    '- bin/conformance-replay.ts (non-published; offline replay tool).',
    '- RFC 8785 JCS canonicalization adopted for cross-runner byte-identity.',
    '- 3-tier post-merge rollback playbook in docs/release-recovery.md.',
    '',
    'Strict-additive on v8.6.0 surface preserved (NFR-1).',
    'Cross-runner CI green across TS + Python + Go + Rust.',
    'tools/hounfour-stub/ deleted in PR-A4.7 per cycle-005 PRD FR-E4.',
  ].join('\n');

  return {
    envelope_kind: 'plan_amendment_request',
    contract_version: '8.6.0',
    ts: nowSecondsZ(),
    cluster_id: 'cycle-007-coord',
    actor_id: 'jani',
    parent_signoff_id: 'hounfour-85-comment-4412531467',
    parent_plan_hash: ZERO_SHA256,
    proposed_delta: proposedDelta,
    severity: 'minor',
    trigger_class: 'ambiguity',
    rationale:
      `cycle-007 / v${CONTRACT_VERSION} ship complete. Release URL ` +
      'and tarball SHA-256 propagated for cross-repo coord-sync. Filed ' +
      'as PlanAmendmentRequest-shape because no other v8.6.0 shape ' +
      'fits a release notification; future cycles may add a dedicated ' +
      'release-notification envelope.',
    recommended_paths: [
      {
        id: 'acknowledge-release',
        summary:
          'Upstream acknowledges v' +
          CONTRACT_VERSION +
          ' ship; coord-sync.sh propagates the release URL.',
        tradeoff:
          'Zero rework. Track B1 hook (consumer side) may now bump ' +
          'against the published tarball.',
      },
    ],
    jury_recommendation: null,
    chain_refs: {
      prev_envelope_hash: ZERO_SHA256,
    },
  };
}

function main(): void {
  const args = parseArgs(process.argv);
  const amendment =
    args.variant === 'kickoff'
      ? buildKickoffAmendment()
      : buildReleaseAmendment(args);

  // Validate against the v8.6.0 PlanAmendmentRequestSchema. Any field
  // drift from the schema breaks the build before pollution can leak.
  if (!Value.Check(PlanAmendmentRequestSchema, amendment)) {
    const errors = [...Value.Errors(PlanAmendmentRequestSchema, amendment)];
    process.stderr.write(
      `build-coord-amendment: amendment failed PlanAmendmentRequest validation:\n`,
    );
    for (const err of errors) {
      process.stderr.write(`  - ${err.path}: ${err.message}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(amendment, null, 2));
  process.stdout.write('\n');
}

main();
