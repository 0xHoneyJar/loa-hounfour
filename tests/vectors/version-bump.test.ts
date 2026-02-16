/**
 * Tests for v5.2.0 version bump (S8-T4).
 *
 * Validates CONTRACT_VERSION, MIN_SUPPORTED_VERSION, package.json,
 * schemas/index.json, and vectors/VERSION are all in sync.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION } from '../../src/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

describe('v5.2.0 version bump (S8-T4)', () => {
  it('CONTRACT_VERSION is 5.2.0', () => {
    expect(CONTRACT_VERSION).toBe('5.2.0');
  });

  it('MIN_SUPPORTED_VERSION is 5.0.0', () => {
    expect(MIN_SUPPORTED_VERSION).toBe('5.0.0');
  });

  it('package.json version matches CONTRACT_VERSION', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('5.2.0');
  });

  it('schemas/index.json version matches CONTRACT_VERSION', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    expect(index.version).toBe('5.2.0');
  });

  it('vectors/VERSION matches CONTRACT_VERSION', () => {
    const version = readFileSync(join(root, 'vectors', 'VERSION'), 'utf-8').trim();
    expect(version).toBe('5.2.0');
  });

  it('schemas/index.json includes v5.1.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    expect(names).toContain('model-provider-spec');
    expect(names).toContain('conformance-level');
    expect(names).toContain('conformance-vector');
    expect(names).toContain('sanction-severity');
    expect(names).toContain('reconciliation-mode');
  });

  it('schemas/index.json includes v5.2.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    expect(names).toContain('agent-capacity-reservation');
    expect(names).toContain('reservation-tier');
    expect(names).toContain('reservation-enforcement');
    expect(names).toContain('reservation-state');
    expect(names).toContain('conservation-status');
    expect(names).toContain('audit-trail-entry');
  });

  it('schemas/index.json schema $ids all use 5.2.0', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    for (const schema of index.schemas) {
      expect(schema.$id).toMatch(/\/5\.2\.0\//);
    }
  });

  it('schemas/index.json has 59 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    expect(index.schemas).toHaveLength(59);
  });
});
