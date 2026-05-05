/**
 * Tests for the Unverified-Obligations Manifest helper (FR-C1, v8.4.0).
 *
 * Validates that `buildUnverifiedObligationsManifest()` correctly:
 *   - Selects only `evaluator: 'runtime-deferred'` rules.
 *   - Returns `undefined` (NOT `null`, NOT empty manifest) when no
 *     runtime-deferred rules apply, so callers can omit the field.
 *   - Pins `consumer_acknowledgment_required: true` on every entry.
 *   - Carries `schema_id` + `contract_version` from the constraint file.
 *
 * @see SDD section 5.8 — Unverified-Obligations Manifest Emission Contract
 */
import { describe, it, expect } from 'vitest';
import {
  buildUnverifiedObligationsManifest,
  hasUnverifiedObligations,
  type UnverifiedObligationsManifest,
} from '../../src/constraints/unverified-obligations.js';
import type { ConstraintFile } from '../../src/constraints/types.js';

const FROZEN_TIMESTAMP = '2026-05-05T00:00:00Z';

const baseFile: ConstraintFile = {
  $schema: 'https://schemas.0xhoneyjar.com/loa-hounfour/constraint-file/8.3.1',
  schema_id: 'TestSchema',
  contract_version: '8.4.0',
  expression_version: '2.0',
  constraints: [],
};

describe('buildUnverifiedObligationsManifest', () => {
  it('returns undefined when the constraint file has zero runtime-deferred rules', () => {
    const file: ConstraintFile = {
      ...baseFile,
      constraints: [
        {
          id: 'TS-1',
          expression: 'amount >= 0',
          severity: 'error',
          message: 'amount must be non-negative',
          fields: ['amount'],
          // evaluator omitted — defaults to 'library'
        },
        {
          id: 'TS-2',
          expression: 'is_valid_dag(items, "id", "next")',
          severity: 'error',
          message: 'items must form a DAG',
          fields: ['items'],
          evaluator: 'library',
        },
      ],
    };
    expect(buildUnverifiedObligationsManifest(file, FROZEN_TIMESTAMP)).toBeUndefined();
  });

  it('emits one entry per runtime-deferred rule', () => {
    const file: ConstraintFile = {
      ...baseFile,
      schema_id: 'OrgRepresentativeDelegation',
      constraints: [
        {
          id: 'ORD-1',
          expression: 'consumer verifies Ed25519 signature over RFC 8785 canonical JSON',
          severity: 'error',
          message: 'signature verification is consumer-side',
          fields: ['signature', 'signed_by', 'signing_key_id'],
          evaluator: 'runtime-deferred',
          evaluation_note: 'Cryptographic verification is consumer-side per NF-1.',
        },
        {
          id: 'ORD-2',
          expression: 'revocation.revoked is append-only',
          severity: 'error',
          message: 'revocation cannot un-revoke',
          fields: ['revocation'],
          evaluator: 'runtime-deferred',
          evaluation_note: 'Temporal append-only invariant unprovable from a single record.',
        },
        {
          id: 'ORD-3',
          expression: 'is_valid_dag(...)',
          severity: 'error',
          message: 'chain must terminate at genesis',
          fields: ['granted_by'],
          evaluator: 'library',
        },
      ],
    };

    const manifest = buildUnverifiedObligationsManifest(file, FROZEN_TIMESTAMP);
    expect(manifest).toBeDefined();
    if (manifest === undefined) return;

    expect(manifest.schema_id).toBe('OrgRepresentativeDelegation');
    expect(manifest.contract_version).toBe('8.4.0');
    expect(manifest.manifest_emitted_at).toBe(FROZEN_TIMESTAMP);
    expect(manifest.unverified_rules).toHaveLength(2);

    const rule1 = manifest.unverified_rules[0];
    expect(rule1.rule_id).toBe('ORD-1');
    expect(rule1.evaluator).toBe('runtime-deferred');
    expect(rule1.evaluation_note).toContain('Cryptographic verification');
    expect(rule1.consumer_acknowledgment_required).toBe(true);

    const rule2 = manifest.unverified_rules[1];
    expect(rule2.rule_id).toBe('ORD-2');
    expect(rule2.evaluator).toBe('runtime-deferred');
    expect(rule2.evaluation_note).toContain('append-only');
  });

  it('falls back to empty evaluation_note when the field is absent (lint-flagged but well-formed)', () => {
    const file: ConstraintFile = {
      ...baseFile,
      constraints: [
        {
          id: 'X-1',
          expression: 'consumer enforces',
          severity: 'error',
          message: 'msg',
          fields: [],
          evaluator: 'runtime-deferred',
          // evaluation_note intentionally absent
        },
      ],
    };
    const manifest = buildUnverifiedObligationsManifest(file, FROZEN_TIMESTAMP);
    expect(manifest?.unverified_rules[0].evaluation_note).toBe('');
  });

  it('uses real wall-clock when emittedAt argument is omitted', () => {
    const file: ConstraintFile = {
      ...baseFile,
      constraints: [
        {
          id: 'X-1',
          expression: 'consumer enforces',
          severity: 'error',
          message: 'msg',
          fields: [],
          evaluator: 'runtime-deferred',
          evaluation_note: 'documented obligation',
        },
      ],
    };
    const manifest = buildUnverifiedObligationsManifest(file);
    expect(manifest?.manifest_emitted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/);
  });
});

describe('hasUnverifiedObligations type guard', () => {
  it('returns true when the result carries a non-empty manifest', () => {
    const manifest: UnverifiedObligationsManifest = {
      schema_id: 'X',
      contract_version: '8.4.0',
      unverified_rules: [
        {
          rule_id: 'R-1',
          rule: 'consumer enforces',
          evaluator: 'runtime-deferred',
          evaluation_note: 'documented',
          consumer_acknowledgment_required: true,
        },
      ],
      manifest_emitted_at: FROZEN_TIMESTAMP,
    };
    const result = { valid: true as const, unverified_obligations: manifest };
    expect(hasUnverifiedObligations(result)).toBe(true);
  });

  it('returns false when the manifest is absent', () => {
    expect(hasUnverifiedObligations({ valid: true as const })).toBe(false);
  });

  it('returns false when the manifest exists but is empty', () => {
    const manifest: UnverifiedObligationsManifest = {
      schema_id: 'X',
      contract_version: '8.4.0',
      unverified_rules: [],
      manifest_emitted_at: FROZEN_TIMESTAMP,
    };
    expect(
      hasUnverifiedObligations({ valid: true as const, unverified_obligations: manifest }),
    ).toBe(false);
  });
});
