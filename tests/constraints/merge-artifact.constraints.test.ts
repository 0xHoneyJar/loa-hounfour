/**
 * PR-A4.5 (FR-G5) — Tests for `MergeArtifact.constraints.json`.
 *
 * MergeArtifact has NO new LOCAL helpers (all library-evaluable
 * invariants are pure TypeBox structural patterns). This file
 * exercises only the constraint-file structure.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTRAINT_FILE = join(
  __dirname,
  '..',
  '..',
  'constraints',
  'MergeArtifact.constraints.json',
);

describe('MergeArtifact.constraints.json — file structure', () => {
  const constraintFile = JSON.parse(readFileSync(CONSTRAINT_FILE, 'utf8')) as {
    schema_id: string;
    contract_version: string;
    expression_version: string;
    constraints: Array<{
      id: string;
      severity: string;
      evaluator: string;
      fields: string[];
    }>;
  };

  it('declares schema_id MergeArtifact', () => {
    expect(constraintFile.schema_id).toBe('MergeArtifact');
  });

  it('pins contract_version to 8.7.0', () => {
    expect(constraintFile.contract_version).toBe('8.7.0');
  });

  it('publishes exactly the MA-1..MA-4 constraint set', () => {
    const ids = constraintFile.constraints.map((c) => c.id);
    expect(ids).toEqual(['MA-1', 'MA-2', 'MA-3', 'MA-4']);
  });

  it('marks MA-1, MA-2, MA-3 as library-evaluable (TypeBox structural)', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    expect(lookup('MA-1')?.evaluator).toBe('library');
    expect(lookup('MA-2')?.evaluator).toBe('library');
    expect(lookup('MA-3')?.evaluator).toBe('library');
  });

  it('marks MA-4 as runtime-deferred warning (canonicalization-provenance consumer-state)', () => {
    const ma4 = constraintFile.constraints.find((c) => c.id === 'MA-4');
    expect(ma4?.evaluator).toBe('runtime-deferred');
    expect(ma4?.severity).toBe('warning');
  });

  it('marks MA-1, MA-2, MA-3 as severity error', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    for (const id of ['MA-1', 'MA-2', 'MA-3']) {
      expect(lookup(id)?.severity).toBe('error');
    }
  });

  it('MA-1 fields reference merged_commit_sha', () => {
    expect(
      constraintFile.constraints.find((c) => c.id === 'MA-1')?.fields,
    ).toEqual(['merged_commit_sha']);
  });

  it('MA-2 fields reference master_content_hash', () => {
    expect(
      constraintFile.constraints.find((c) => c.id === 'MA-2')?.fields,
    ).toEqual(['master_content_hash']);
  });

  it('MA-3 fields reference merged_at', () => {
    expect(
      constraintFile.constraints.find((c) => c.id === 'MA-3')?.fields,
    ).toEqual(['merged_at']);
  });

  it('MA-4 fields reference master_content_hash', () => {
    expect(
      constraintFile.constraints.find((c) => c.id === 'MA-4')?.fields,
    ).toEqual(['master_content_hash']);
  });
});
