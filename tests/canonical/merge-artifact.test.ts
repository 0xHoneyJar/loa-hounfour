/**
 * PR-A4.5 (FR-G5) — Schema-shape unit tests for `MergeArtifactSchema`.
 *
 * MergeArtifact has NO cross-field validator (MA-1 + MA-3 are pure
 * TypeBox structural; MA-2 + MA-4 are consumer-state per ADR-010).
 * The vector runner at `tests/vectors/merge-artifact-vectors.test.ts`
 * exercises the structural tier only — no `invalid-cross-field`
 * bucket.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MergeArtifactSchema } from '../../src/canonical/index.js';

const SAMPLE_SHA1 = 'abcdef1234567890abcdef1234567890abcdef12';
const SAMPLE_SHA256 = 'sha256:' + '0'.repeat(64);

function baseEnvelope(): Record<string, unknown> {
  return {
    envelope_kind: 'merge_artifact',
    contract_version: '8.7.0',
    cluster_id: 'cluster-test',
    epic_checkpoint_id: null,
    repo_slug: 'owner/repo',
    pr_number: 42,
    merged_commit_sha: SAMPLE_SHA1,
    master_content_hash: SAMPLE_SHA256,
    merged_at: '2026-05-01T00:00:00Z',
    merger_actor_id: 'github-user-alice',
  };
}

describe('MergeArtifactSchema structural (FR-G5)', () => {
  it('admits a minimal well-formed envelope', () => {
    expect(Value.Check(MergeArtifactSchema, baseEnvelope())).toBe(true);
  });

  it('rejects envelope_kind mismatch', () => {
    const env = baseEnvelope();
    env.envelope_kind = 'subscription_pool_state';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('rejects contract_version mismatch', () => {
    const env = baseEnvelope();
    env.contract_version = '8.6.0';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('rejects additional properties on the envelope', () => {
    const env = { ...baseEnvelope(), extra: 'no' };
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('admits null epic_checkpoint_id (no checkpoint binding)', () => {
    const env = baseEnvelope();
    env.epic_checkpoint_id = null;
    expect(Value.Check(MergeArtifactSchema, env)).toBe(true);
  });

  it('admits non-empty string epic_checkpoint_id', () => {
    const env = baseEnvelope();
    env.epic_checkpoint_id = 'epic-checkpoint-001';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(true);
  });

  it('rejects empty-string epic_checkpoint_id (canonical "no link" is null)', () => {
    const env = baseEnvelope();
    env.epic_checkpoint_id = '';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('rejects malformed repo_slug (no slash)', () => {
    const env = baseEnvelope();
    env.repo_slug = 'no-slash-here';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('rejects repo_slug with whitespace', () => {
    const env = baseEnvelope();
    env.repo_slug = 'owner name/repo';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('admits pr_number at the minimum (1)', () => {
    const env = baseEnvelope();
    env.pr_number = 1;
    expect(Value.Check(MergeArtifactSchema, env)).toBe(true);
  });

  it('rejects pr_number 0', () => {
    const env = baseEnvelope();
    env.pr_number = 0;
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('rejects pr_number above Number.MAX_SAFE_INTEGER', () => {
    const env = baseEnvelope();
    env.pr_number = 9_007_199_254_740_992;
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('MA-1: admits lowercase 40-hex merged_commit_sha', () => {
    const env = baseEnvelope();
    env.merged_commit_sha = '0123456789abcdef0123456789abcdef01234567';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(true);
  });

  it('MA-1: rejects uppercase merged_commit_sha (lowercase-only lock)', () => {
    const env = baseEnvelope();
    env.merged_commit_sha = '0123456789ABCDEF0123456789ABCDEF01234567';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('MA-1: rejects merged_commit_sha shorter than 40 chars', () => {
    const env = baseEnvelope();
    env.merged_commit_sha = 'abcdef1234';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('MA-1: rejects merged_commit_sha longer than 40 chars', () => {
    const env = baseEnvelope();
    env.merged_commit_sha = '0'.repeat(64);
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('MA-1: rejects merged_commit_sha with non-hex chars', () => {
    const env = baseEnvelope();
    env.merged_commit_sha = 'g'.repeat(40);
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('MA-2: rejects malformed master_content_hash', () => {
    const env = baseEnvelope();
    env.master_content_hash = 'not-sha256';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('MA-3: rejects non-UTC merged_at', () => {
    const env = baseEnvelope();
    env.merged_at = '2026-05-01T00:00:00+02:00';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('MA-3: admits fractional-second merged_at (pattern allows up to 9 digits)', () => {
    const env = baseEnvelope();
    env.merged_at = '2026-05-01T12:30:45.123456789Z';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(true);
  });

  it('admits merger_actor_id at the 256-char maximum', () => {
    const env = baseEnvelope();
    env.merger_actor_id = 'a'.repeat(256);
    expect(Value.Check(MergeArtifactSchema, env)).toBe(true);
  });

  it('rejects merger_actor_id over 256 chars', () => {
    const env = baseEnvelope();
    env.merger_actor_id = 'a'.repeat(257);
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('rejects empty merger_actor_id', () => {
    const env = baseEnvelope();
    env.merger_actor_id = '';
    expect(Value.Check(MergeArtifactSchema, env)).toBe(false);
  });

  it('carries the PascalCase $id per cycle-005 convention', () => {
    expect(MergeArtifactSchema.$id).toBe('MergeArtifact');
  });

  it('does NOT carry x-crypto-bearing or x-chain-bearing', () => {
    const schema = MergeArtifactSchema as Record<string, unknown>;
    expect(schema['x-crypto-bearing']).toBeUndefined();
    expect(schema['x-chain-bearing']).toBeUndefined();
  });
});

describe('MergeArtifact published JSON Schema $id contract', () => {
  it('the published JSON Schema $id is the canonical versioned URI', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'merge-artifact.schema.json',
    );
    const generated = JSON.parse(readFileSync(schemaPath, 'utf8')) as {
      $id: string;
    };
    expect(generated.$id).toBe(
      'https://schemas.0xhoneyjar.com/loa-hounfour/8.7.0/merge-artifact',
    );
  });

  it('the published JSON Schema carries zero $ref values', () => {
    const schemaPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schemas',
      'merge-artifact.schema.json',
    );
    const raw = readFileSync(schemaPath, 'utf8');
    expect(raw).not.toContain('"$ref"');
  });

  it('MergeArtifact IS in the cross-field validator registry as a defensive-shim (satisfies the constraint-coverage gate; no library-evaluable cross-field invariants in v8.7.0)', async () => {
    const { getCrossFieldValidatorSchemas } = await import(
      '../../src/validators/index.js'
    );
    const registered = getCrossFieldValidatorSchemas();
    expect(registered).toContain(MergeArtifactSchema.$id);
    expect(MergeArtifactSchema.$id).toBe('MergeArtifact');
  });
});
