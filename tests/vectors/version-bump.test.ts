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
    expect(CONTRACT_VERSION).toBe('8.3.0');
  });

  it('MIN_SUPPORTED_VERSION is 6.0.0', () => {
    expect(MIN_SUPPORTED_VERSION).toBe('6.0.0');
  });

  it('package.json version matches CONTRACT_VERSION', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('8.3.0');
  });

  it('schemas/index.json version matches CONTRACT_VERSION', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    expect(index.version).toBe('8.3.0');
  });

  it('vectors/VERSION matches CONTRACT_VERSION', () => {
    const version = readFileSync(join(root, 'vectors', 'VERSION'), 'utf-8').trim();
    expect(version).toBe('8.3.0');
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

  it('schemas/index.json schema $ids all use 7.11.0', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    for (const schema of index.schemas) {
      expect(schema.$id).toMatch(/\/8\.3\.0\//);
    }
  });

  it('schemas/index.json includes v8.0.0 commons schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // Commons Protocol
    expect(names).toContain('commons/invariant');
    expect(names).toContain('commons/governance-mutation');
    expect(names).toContain('commons/governed-credits');
    expect(names).toContain('commons/conservation-law');
    expect(names).toContain('commons/audit-entry');
    expect(names).toContain('commons/audit-trail');
    expect(names).toContain('commons/state-machine-config');
    expect(names).toContain('commons/state');
    expect(names).toContain('commons/transition');
    expect(names).toContain('commons/dynamic-contract');
    expect(names).toContain('commons/protocol-surface');
    expect(names).toContain('commons/contract-negotiation');
    expect(names).toContain('commons/quarantine-record');
    expect(names).toContain('commons/hash-chain-discontinuity');
    expect(names).toContain('commons/vector-manifest-entry');
    expect(names).toContain('commons/vector-manifest');
  });

  it('schemas/index.json includes v7.6.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // Sprint 1
    expect(names).toContain('demotion-rule');
    expect(names).toContain('reputation-decay-policy');
    expect(names).toContain('collection-governance-config');
    // Sprint 2
    expect(names).toContain('constraint-lifecycle-status');
    expect(names).toContain('constraint-candidate');
    expect(names).toContain('constraint-lifecycle-event');
    // Sprint 3
    expect(names).toContain('routing-signal-type');
    expect(names).toContain('reputation-routing-signal');
    expect(names).toContain('policy-type');
    expect(names).toContain('policy-version');
  });

  it('schemas/index.json includes v7.7.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // Sprint 1: Governance Execution Bridge
    expect(names).toContain('execution-status');
    expect(names).toContain('proposal-execution');
    expect(names).toContain('proposal-event-type');
    expect(names).toContain('proposal-outcome-event');
    // Sprint 2: Economic Membrane
    expect(names).toContain('economic-boundary');
    expect(names).toContain('reputation-economic-impact');
    expect(names).toContain('model-economic-profile');
    // Sprint 3: Community Engagement
    expect(names).toContain('engagement-signal-type');
    expect(names).toContain('community-engagement-signal');
  });

  it('schemas/index.json includes v7.9.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // Sprint 2: Feedback Loop
    expect(names).toContain('performance-outcome-type');
    expect(names).toContain('economic-performance-event');
    expect(names).toContain('quality-bridge-direction');
    expect(names).toContain('performance-quality-bridge');
    // Sprint 3: Dynamic Rebalancing
    expect(names).toContain('basket-composition-entry');
    expect(names).toContain('basket-composition');
    expect(names).toContain('rebalance-trigger-type');
    expect(names).toContain('routing-rebalance-event');
    // Sprint 4: Progressive Execution
    expect(names).toContain('execution-strategy');
    expect(names).toContain('checkpoint-health');
    expect(names).toContain('proceed-decision');
    expect(names).toContain('execution-checkpoint');
    expect(names).toContain('rollback-scope');
  });

  it('schemas/index.json includes v7.9.1 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // Decision Engine Improvements
    expect(names).toContain('denial-code');
    expect(names).toContain('evaluation-gap');
    expect(names).toContain('economic-boundary-evaluation-event');
  });

  it('schemas/index.json includes v7.10.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // Task-Dimensional Reputation
    expect(names).toContain('task-type');
    expect(names).toContain('task-type-cohort');
    expect(names).toContain('quality-signal-event');
    expect(names).toContain('task-completed-event');
    expect(names).toContain('credential-update-event');
    expect(names).toContain('reputation-event');
    expect(names).toContain('scoring-path');
    expect(names).toContain('scoring-path-log');
  });

  it('schemas/index.json includes v8.2.0 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    const names = index.schemas.map((s: { name: string }) => s.name);
    // ModelPerformance Event (Issue #38)
    expect(names).toContain('quality-observation');
    expect(names).toContain('model-performance-event');
  });

  it('schemas/index.json has 191 schemas', () => {
    const index = JSON.parse(readFileSync(join(root, 'schemas', 'index.json'), 'utf-8'));
    expect(index.schemas).toHaveLength(201);
  });
});
