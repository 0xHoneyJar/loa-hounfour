/**
 * Tests for v7.0.0 version bump (S4-T1).
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

describe('version bump', () => {
  it('CONTRACT_VERSION matches current version', () => {
    expect(CONTRACT_VERSION).toBe('7.5.0');
  });

  it('MIN_SUPPORTED_VERSION is 6.0.0', () => {
    expect(MIN_SUPPORTED_VERSION).toBe('6.0.0');
  });

  it('package.json version matches CONTRACT_VERSION', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('7.5.0');
  });

  it('schemas/index.json version matches CONTRACT_VERSION', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    expect(index.version).toBe('7.5.0');
  });

  it('vectors/VERSION matches CONTRACT_VERSION', () => {
    const version = readFileSync(join(root, 'vectors', 'VERSION'), 'utf-8').trim();
    expect(version).toBe('7.5.0');
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

  it('schemas/index.json includes v5.3.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    expect(names).toContain('governance-config');
  });

  it('schemas/index.json includes v5.4.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    expect(names).toContain('delegation-chain');
    expect(names).toContain('inter-agent-transaction-audit');
    expect(names).toContain('ensemble-capability-profile');
  });

  it('schemas/index.json includes v5.5.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    expect(names).toContain('conservation-property-registry');
    expect(names).toContain('jwt-boundary-spec');
    expect(names).toContain('outbound-claims');
    expect(names).toContain('inbound-claims');
    expect(names).toContain('agent-identity');
  });

  it('schemas/index.json includes v6.0.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // Sprint 1: Liveness + Scoped Trust
    expect(names).toContain('liveness-property');
    expect(names).toContain('timeout-behavior');
    expect(names).toContain('capability-scope');
    expect(names).toContain('capability-scoped-trust');
    // Sprint 2: Type System
    expect(names).toContain('constraint-type');
    expect(names).toContain('constraint-type-signature');
    // Sprint 3: Composition
    expect(names).toContain('bridge-enforcement');
    expect(names).toContain('bridge-invariant');
    expect(names).toContain('exchange-rate-type');
    expect(names).toContain('exchange-rate-spec');
    expect(names).toContain('settlement-policy');
    expect(names).toContain('registry-bridge');
    expect(names).toContain('minting-policy');
    expect(names).toContain('fork-type');
    expect(names).toContain('tree-node-status');
    expect(names).toContain('tree-strategy');
    expect(names).toContain('budget-allocation');
    expect(names).toContain('delegation-tree-node');
    expect(names).toContain('delegation-tree');
  });

  it('schemas/index.json includes v7.0.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    expect(names).toContain('bridge-transfer-saga');
    expect(names).toContain('monetary-policy');
    expect(names).toContain('delegation-outcome');
    expect(names).toContain('permission-boundary');
    expect(names).toContain('governance-proposal');
  });

  it('schemas/index.json includes v7.3.0+ schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    expect(names).toContain('aggregate-snapshot');
    expect(names).toContain('reputation-credential');
  });

  it('schemas/index.json schema $ids all use 7.5.0', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    for (const schema of index.schemas) {
      expect(schema.$id).toMatch(/\/7\.5\.0\//);
    }
  });

  it('schemas/index.json has 117 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    expect(index.schemas).toHaveLength(117);
  });
});
