/**
 * Vector Validation Test Harness — S2-T8
 *
 * Dynamically loads all conformance vectors from vectors/conformance/,
 * validates each against ConformanceVectorSchema, and runs the matching
 * engine for expected_valid vectors.
 *
 * @see SDD §5.3, Sprint Plan S2-T8
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Value } from '@sinclair/typebox/value';
import {
  ConformanceVectorSchema,
  type ConformanceVector,
} from '../../src/schemas/model/conformance-vector.js';
import { matchConformanceOutput } from '../../src/utilities/conformance-matcher.js';
import { CONFORMANCE_CATEGORIES } from '../../src/vocabulary/conformance-category.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const conformanceRoot = join(__dirname, '..', '..', 'vectors', 'conformance');

// ---------------------------------------------------------------------------
// Discovery: load all vector files
// ---------------------------------------------------------------------------

interface VectorEntry {
  category: string;
  filename: string;
  path: string;
  data: unknown;
}

function discoverVectors(): VectorEntry[] {
  const entries: VectorEntry[] = [];

  for (const category of readdirSync(conformanceRoot, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryPath = join(conformanceRoot, category.name);
    for (const file of readdirSync(categoryPath, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      const filePath = join(categoryPath, file.name);
      const raw = readFileSync(filePath, 'utf-8');
      entries.push({
        category: category.name,
        filename: file.name,
        path: filePath,
        data: JSON.parse(raw),
      });
    }
  }

  return entries;
}

const allVectors = discoverVectors();

// ---------------------------------------------------------------------------
// Meta-validation: harness itself
// ---------------------------------------------------------------------------

describe('Conformance Vector Harness — Meta', () => {
  it('discovers at least 30 vectors', () => {
    expect(allVectors.length).toBeGreaterThanOrEqual(30);
  });

  it('discovers vectors in all categories', () => {
    const discoveredCategories = new Set(allVectors.map((v) => v.category));
    for (const category of CONFORMANCE_CATEGORIES) {
      expect(discoveredCategories.has(category)).toBe(true);
    }
  });

  it('all vector files parse as valid JSON', () => {
    // If we got here, all files parsed; this is a documentation test
    for (const entry of allVectors) {
      expect(entry.data).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Schema validation: every vector must conform to ConformanceVectorSchema
// ---------------------------------------------------------------------------

describe('Conformance Vector Schema Validation', () => {
  for (const entry of allVectors) {
    it(`${entry.category}/${entry.filename} validates against ConformanceVectorSchema`, () => {
      const valid = Value.Check(ConformanceVectorSchema, entry.data);
      if (!valid) {
        const errors = [...Value.Errors(ConformanceVectorSchema, entry.data)];
        const summary = errors.map((e) => `${e.path}: ${e.message}`).join('; ');
        expect.fail(`Schema validation failed: ${summary}`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Unique vector_id check
// ---------------------------------------------------------------------------

describe('Conformance Vector ID Uniqueness', () => {
  it('all vector_ids are unique across the entire suite', () => {
    const ids = allVectors
      .filter((v) => Value.Check(ConformanceVectorSchema, v.data))
      .map((v) => (v.data as ConformanceVector).vector_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Matching engine validation: run matcher for expected_valid vectors
// ---------------------------------------------------------------------------

describe('Conformance Matching Engine — Vector Driven', () => {
  const validVectors = allVectors
    .filter((v) => Value.Check(ConformanceVectorSchema, v.data))
    .filter((v) => (v.data as ConformanceVector).expected_valid);

  for (const entry of validVectors) {
    const vector = entry.data as ConformanceVector;

    it(`${vector.vector_id}: matching engine accepts expected output`, () => {
      const result = matchConformanceOutput(
        vector.expected_output,
        vector.expected_output,
        vector.matching_rules,
      );
      expect(result.matched).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Category-directory consistency
// ---------------------------------------------------------------------------

describe('Category-Directory Consistency', () => {
  for (const entry of allVectors) {
    if (!Value.Check(ConformanceVectorSchema, entry.data)) continue;
    const vector = entry.data as ConformanceVector;

    it(`${vector.vector_id}: category "${vector.category}" matches directory "${entry.category}"`, () => {
      expect(vector.category).toBe(entry.category);
    });
  }
});

// ---------------------------------------------------------------------------
// Contract version consistency
// ---------------------------------------------------------------------------

describe('Contract Version Consistency', () => {
  const validVectors = allVectors
    .filter((v) => Value.Check(ConformanceVectorSchema, v.data));

  it('all vectors target a valid contract version', () => {
    for (const entry of validVectors) {
      const vector = entry.data as ConformanceVector;
      expect(vector.contract_version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});
