/**
 * Tests for conformance vector manifest, loader, and listing.
 *
 * @see SDD §4.12 — Conformance Vector Distribution (FR-4)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  VectorManifestSchema,
  VectorManifestEntrySchema,
  loadManifest,
  loadVector,
  listVectors,
  type VectorManifest,
} from '../../src/commons/vectors/index.js';

describe('VectorManifestEntry schema', () => {
  it('accepts a valid entry', () => {
    const entry = {
      vector_id: 'test-001',
      category: 'agent-identity',
      path: 'conformance/agent-identity/valid.json',
      layer: 1,
      description: 'Valid agent identity',
      contract_version: '7.11.0',
      expected_valid: true,
    };
    expect(Value.Check(VectorManifestEntrySchema, entry)).toBe(true);
  });

  it('rejects invalid layer', () => {
    const entry = {
      vector_id: 'test-001',
      category: 'agent-identity',
      path: 'conformance/agent-identity/valid.json',
      layer: 3,
      description: 'Valid agent identity',
      contract_version: '7.11.0',
      expected_valid: true,
    };
    expect(Value.Check(VectorManifestEntrySchema, entry)).toBe(false);
  });

  it('rejects empty vector_id', () => {
    const entry = {
      vector_id: '',
      category: 'agent-identity',
      path: 'conformance/agent-identity/valid.json',
      layer: 1,
      description: 'Valid agent identity',
      contract_version: '7.11.0',
      expected_valid: true,
    };
    expect(Value.Check(VectorManifestEntrySchema, entry)).toBe(false);
  });
});

describe('VectorManifest schema', () => {
  it('accepts a valid manifest', () => {
    const manifest = {
      manifest_version: '1.0.0',
      generated_at: '2026-02-25T10:00:00Z',
      contract_version: '7.11.0',
      total_vectors: 1,
      vectors: [
        {
          vector_id: 'test-001',
          category: 'test',
          path: 'conformance/test/valid.json',
          layer: 1,
          description: 'Test vector',
          contract_version: '7.11.0',
          expected_valid: true,
        },
      ],
    };
    expect(Value.Check(VectorManifestSchema, manifest)).toBe(true);
  });

  it('rejects wrong manifest_version', () => {
    const manifest = {
      manifest_version: '2.0.0',
      generated_at: '2026-02-25T10:00:00Z',
      contract_version: '7.11.0',
      total_vectors: 0,
      vectors: [],
    };
    expect(Value.Check(VectorManifestSchema, manifest)).toBe(false);
  });
});

describe('loadManifest()', () => {
  it('loads the generated manifest', () => {
    const manifest = loadManifest();
    expect(manifest.manifest_version).toBe('1.0.0');
    expect(manifest.total_vectors).toBeGreaterThan(0);
    expect(manifest.vectors.length).toBe(manifest.total_vectors);
  });

  it('validates against VectorManifest schema', () => {
    const manifest = loadManifest();
    expect(Value.Check(VectorManifestSchema, manifest)).toBe(true);
  });
});

describe('loadVector()', () => {
  it('loads a vector by id', () => {
    const manifest = loadManifest();
    const firstVector = manifest.vectors[0];
    const vector = loadVector(firstVector.vector_id);
    expect(vector).toBeDefined();
    expect(vector.vector_id).toBe(firstVector.vector_id);
  });

  it('throws for nonexistent vector_id', () => {
    expect(() => loadVector('nonexistent-vector-id-12345')).toThrow(
      /not found in manifest/,
    );
  });
});

describe('listVectors()', () => {
  it('returns all vectors when no filter', () => {
    const manifest = loadManifest();
    const all = listVectors();
    expect(all.length).toBe(manifest.total_vectors);
  });

  it('filters by category', () => {
    const agents = listVectors({ category: 'agent-identity' });
    expect(agents.length).toBeGreaterThan(0);
    for (const v of agents) {
      expect(v.category).toBe('agent-identity');
    }
  });

  it('filters by layer', () => {
    const layer1 = listVectors({ layer: 1 });
    expect(layer1.length).toBeGreaterThan(0);
    for (const v of layer1) {
      expect(v.layer).toBe(1);
    }
  });

  it('filters by both category and layer', () => {
    const result = listVectors({ category: 'agent-identity', layer: 1 });
    for (const v of result) {
      expect(v.category).toBe('agent-identity');
      expect(v.layer).toBe(1);
    }
  });

  it('returns empty for nonexistent category', () => {
    const result = listVectors({ category: 'nonexistent-category-xyz' });
    expect(result).toEqual([]);
  });

  it('includes commons audit-trail vectors', () => {
    const commons = listVectors({ category: 'commons' });
    expect(commons.length).toBeGreaterThan(0);
  });

  it('manifest entries match layer tag spec (layer 1 or 2)', () => {
    const all = listVectors();
    for (const v of all) {
      expect([1, 2]).toContain(v.layer);
    }
  });
});
