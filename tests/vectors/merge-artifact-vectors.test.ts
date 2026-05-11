/**
 * PR-A4.5 (FR-G5) — Vector-fixture conformance runner for
 * `MergeArtifactSchema`.
 *
 * MergeArtifact has NO cross-field validator (MA-1 + MA-3 pure
 * structural; MA-2 + MA-4 consumer-state). The runner exercises
 * only the structural tier + canonical-form idempotency. No
 * `invalid-cross-field` bucket.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MergeArtifactSchema } from '../../src/canonical/merge-artifact.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function vectorsRoot(): string {
  return join(__dirname, '..', '..', 'vectors', 'MergeArtifact', 'v8.7.0');
}

function loadFixture(
  bucket: string,
  name: string,
): { data: unknown; comment?: string } {
  const raw = JSON.parse(
    readFileSync(join(vectorsRoot(), bucket, name), 'utf8'),
  ) as Record<string, unknown>;
  const { _comment, ...data } = raw;
  return { data, comment: typeof _comment === 'string' ? _comment : undefined };
}

function listFixtures(bucket: string): string[] {
  const dir = join(vectorsRoot(), bucket);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

describe('MergeArtifact vector fixtures (FR-G5 / PR-A4.5)', () => {
  const validFixtures = listFixtures('valid');
  const invalidFixtures = listFixtures('invalid');

  it('publishes the expected fixture cardinality (≥15 valid + ≥10 invalid)', () => {
    expect(validFixtures.length).toBeGreaterThanOrEqual(15);
    expect(invalidFixtures.length).toBeGreaterThanOrEqual(10);
  });

  describe('valid/ — structural (Value.Check)', () => {
    for (const f of validFixtures) {
      it(`Value.Check ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const ok = Value.Check(MergeArtifactSchema, data);
        if (!ok) {
          const errs = [...Value.Errors(MergeArtifactSchema, data)].slice(0, 3);
          throw new Error(
            `Expected structural-valid; errors: ${JSON.stringify(
              errs.map((e) => ({ path: e.path, message: e.message })),
            )}`,
          );
        }
      });
    }
  });

  describe('valid/ — in-runtime canonical-form idempotency (V8 determinism pin)', () => {
    const EXPECTED_TOP_LEVEL_KEY_ORDER = [
      'envelope_kind',
      'contract_version',
      'cluster_id',
      'epic_checkpoint_id',
      'repo_slug',
      'pr_number',
      'merged_commit_sha',
      'master_content_hash',
      'merged_at',
      'merger_actor_id',
    ];

    for (const f of validFixtures) {
      it(`canonical-form idempotency ${f}`, () => {
        const { data } = loadFixture('valid', f);
        const canonical = JSON.stringify(data);
        const reSerialized = JSON.stringify(JSON.parse(canonical));
        expect(reSerialized).toBe(canonical);
        const observedKeys = Object.keys(data as Record<string, unknown>);
        expect(observedKeys).toEqual(EXPECTED_TOP_LEVEL_KEY_ORDER);
      });
    }
  });

  describe('invalid/ — structural rejection (Value.Check tier)', () => {
    for (const f of invalidFixtures) {
      it(`fails Value.Check ${f}`, () => {
        const { data } = loadFixture('invalid', f);
        expect(Value.Check(MergeArtifactSchema, data)).toBe(false);
      });
    }
  });
});

describe('MergeArtifact valid-fixture coverage breadth (FR-G5 / PR-A4.5)', () => {
  function listValid(): string[] {
    return readdirSync(join(vectorsRoot(), 'valid'))
      .filter((f) => f.endsWith('.json'))
      .sort();
  }

  it('covers a minimal envelope with no EpicCheckpoint linkage', () => {
    expect(listValid().filter((f) => f.includes('minimal'))).toHaveLength(1);
  });

  it('covers an envelope with non-null epic_checkpoint_id', () => {
    expect(
      listValid().filter((f) => f.includes('with-epic-checkpoint')),
    ).toHaveLength(1);
  });

  it('covers a bot merger_actor_id', () => {
    expect(listValid().filter((f) => f.includes('bot-actor'))).toHaveLength(1);
  });

  it('covers a large pr_number (Number.MAX_SAFE_INTEGER region)', () => {
    expect(
      listValid().filter((f) => f.includes('large-pr-number')),
    ).toHaveLength(1);
  });

  it('covers merger_actor_id at the 256-char maxLength boundary', () => {
    expect(
      listValid().filter((f) => f.includes('merger-actor-max-length')),
    ).toHaveLength(1);
  });

  it('covers a fractional-second merged_at (3-digit milliseconds)', () => {
    expect(
      listValid().filter((f) => f.includes('merged-at-fractional-seconds')),
    ).toHaveLength(1);
  });

  it('covers a 9-digit nanosecond merged_at (pattern max precision)', () => {
    expect(
      listValid().filter((f) => f.includes('nanosecond-precision')),
    ).toHaveLength(1);
  });
});
