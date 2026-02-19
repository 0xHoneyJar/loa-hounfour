/**
 * Tests for schema graph operations: reachability, cycle detection,
 * impact analysis, and topological sort (S2-T6, S2-T7, S2-T8).
 */
import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import {
  buildSchemaGraph,
  isReachable,
  reachableFrom,
  detectCycles,
  analyzeImpact,
  topologicalSort,
  type SchemaGraphNode,
} from '../../src/utilities/schema-graph.js';

/**
 * Helper: build a simple graph from an adjacency list.
 * Each entry is [source, target] representing an outgoing reference.
 */
function buildTestGraph(edges: [string, string][]): SchemaGraphNode[] {
  const nodeMap = new Map<string, SchemaGraphNode>();
  const ensureNode = (id: string): SchemaGraphNode => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { schema_id: id, outgoing_references: [], incoming_references: [] });
    }
    return nodeMap.get(id)!;
  };

  for (const [source, target] of edges) {
    ensureNode(source);
    ensureNode(target);
    const ref = {
      source_schema: source,
      source_field: 'ref',
      target_schema: target,
      target_field: 'id',
      relationship: 'references',
    };
    nodeMap.get(source)!.outgoing_references.push(ref);
    nodeMap.get(target)!.incoming_references.push(ref);
  }

  return [...nodeMap.values()];
}

// ---------------------------------------------------------------------------
// Reachability (S2-T6)
// ---------------------------------------------------------------------------

describe('isReachable', () => {
  const graph = buildTestGraph([
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['A', 'E'],
  ]);

  it('returns true for directly connected nodes', () => {
    expect(isReachable(graph, 'A', 'B')).toBe(true);
  });

  it('returns true for transitively connected nodes', () => {
    expect(isReachable(graph, 'A', 'D')).toBe(true);
  });

  it('returns false for unreachable nodes', () => {
    expect(isReachable(graph, 'D', 'A')).toBe(false);
  });

  it('returns true for self-reachability', () => {
    expect(isReachable(graph, 'A', 'A')).toBe(true);
  });

  it('handles disconnected components', () => {
    const disconnected = buildTestGraph([['A', 'B'], ['C', 'D']]);
    expect(isReachable(disconnected, 'A', 'D')).toBe(false);
    expect(isReachable(disconnected, 'C', 'D')).toBe(true);
  });

  it('handles empty graph', () => {
    expect(isReachable([], 'A', 'B')).toBe(false);
  });
});

describe('reachableFrom', () => {
  const graph = buildTestGraph([
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['A', 'E'],
  ]);

  it('returns all transitively reachable nodes', () => {
    const result = reachableFrom(graph, 'A');
    expect(result).toEqual(new Set(['B', 'C', 'D', 'E']));
  });

  it('returns empty set for leaf nodes', () => {
    const result = reachableFrom(graph, 'D');
    expect(result.size).toBe(0);
  });

  it('returns partial set for mid-chain nodes', () => {
    const result = reachableFrom(graph, 'B');
    expect(result).toEqual(new Set(['C', 'D']));
  });

  it('handles single-node graph', () => {
    const single = buildTestGraph([]);
    const singleNode: SchemaGraphNode = {
      schema_id: 'X',
      outgoing_references: [],
      incoming_references: [],
    };
    const result = reachableFrom([singleNode], 'X');
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle Detection (S2-T6)
// ---------------------------------------------------------------------------

describe('detectCycles', () => {
  it('reports no cycles in DAG', () => {
    const dag = buildTestGraph([
      ['A', 'B'],
      ['B', 'C'],
      ['A', 'C'],
    ]);
    const result = detectCycles(dag);
    expect(result.has_cycles).toBe(false);
    expect(result.cycles).toHaveLength(0);
  });

  it('detects simple cycle', () => {
    const cyclic = buildTestGraph([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ]);
    const result = detectCycles(cyclic);
    expect(result.has_cycles).toBe(true);
    expect(result.cycles.length).toBeGreaterThanOrEqual(1);
  });

  it('detects self-loop', () => {
    const selfLoop = buildTestGraph([['A', 'A']]);
    const result = detectCycles(selfLoop);
    expect(result.has_cycles).toBe(true);
  });

  it('handles empty graph', () => {
    const result = detectCycles([]);
    expect(result.has_cycles).toBe(false);
    expect(result.cycles).toHaveLength(0);
  });

  it('handles disconnected components with one cycle', () => {
    const graph = buildTestGraph([
      ['A', 'B'],
      ['C', 'D'],
      ['D', 'C'],
    ]);
    const result = detectCycles(graph);
    expect(result.has_cycles).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Impact Analysis (S2-T7)
// ---------------------------------------------------------------------------

describe('analyzeImpact', () => {
  // Graph: AuditTrailEntry → BillingEntry, AuditTrailEntry → InvokeResponse
  //        PerformanceRecord → BillingEntry
  const graph = buildTestGraph([
    ['AuditTrailEntry', 'BillingEntry'],
    ['AuditTrailEntry', 'InvokeResponse'],
    ['PerformanceRecord', 'BillingEntry'],
    ['DelegationChain', 'AgentIdentity'],
    ['InterAgentTransaction', 'DelegationChain'],
    ['InterAgentTransaction', 'AgentIdentity'],
  ]);

  it('identifies directly affected schemas', () => {
    const report = analyzeImpact(graph, 'BillingEntry');
    expect(report.directly_affected).toContain('AuditTrailEntry');
    expect(report.directly_affected).toContain('PerformanceRecord');
  });

  it('identifies transitively affected schemas', () => {
    const report = analyzeImpact(graph, 'AgentIdentity');
    expect(report.directly_affected).toContain('DelegationChain');
    expect(report.directly_affected).toContain('InterAgentTransaction');
  });

  it('includes affected constraints when provided', () => {
    const constraints = new Map([
      ['AgentIdentity', ['agent-identity-delegation-requires-trust']],
      ['DelegationChain', ['delegation-chain-depth-limit', 'delegation-chain-authority']],
    ]);
    const report = analyzeImpact(graph, 'AgentIdentity', constraints);
    expect(report.affected_constraints).toContain('agent-identity-delegation-requires-trust');
    expect(report.affected_constraints).toContain('delegation-chain-depth-limit');
  });

  it('reports total impact radius', () => {
    const report = analyzeImpact(graph, 'BillingEntry');
    expect(report.total_impact_radius).toBe(report.directly_affected.length + report.transitively_affected.length);
  });

  it('handles leaf node with no incoming references', () => {
    const report = analyzeImpact(graph, 'InterAgentTransaction');
    expect(report.directly_affected).toHaveLength(0);
    expect(report.total_impact_radius).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Topological Sort (S2-T7)
// ---------------------------------------------------------------------------

describe('topologicalSort', () => {
  it('produces valid dependency-first ordering for DAG', () => {
    const dag = buildTestGraph([
      ['A', 'B'],
      ['B', 'C'],
      ['A', 'C'],
    ]);
    const result = topologicalSort(dag);
    expect(result).not.toBeNull();
    expect(result!.indexOf('A')).toBeLessThan(result!.indexOf('B'));
    expect(result!.indexOf('B')).toBeLessThan(result!.indexOf('C'));
  });

  it('returns null for cyclic graph', () => {
    const cyclic = buildTestGraph([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ]);
    expect(topologicalSort(cyclic)).toBeNull();
  });

  it('handles empty graph', () => {
    const result = topologicalSort([]);
    expect(result).toEqual([]);
  });

  it('handles single node', () => {
    const single: SchemaGraphNode[] = [{
      schema_id: 'X',
      outgoing_references: [],
      incoming_references: [],
    }];
    const result = topologicalSort(single);
    expect(result).toEqual(['X']);
  });

  it('handles disconnected components', () => {
    const disconnected = buildTestGraph([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const result = topologicalSort(disconnected);
    expect(result).not.toBeNull();
    expect(result!.indexOf('A')).toBeLessThan(result!.indexOf('B'));
    expect(result!.indexOf('C')).toBeLessThan(result!.indexOf('D'));
  });

  it('includes all nodes in result', () => {
    const dag = buildTestGraph([
      ['A', 'B'],
      ['B', 'C'],
      ['D', 'C'],
    ]);
    const result = topologicalSort(dag);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
    expect(new Set(result)).toEqual(new Set(['A', 'B', 'C', 'D']));
  });
});

// ---------------------------------------------------------------------------
// Schema Graph Acyclic Constraint (S2-T8)
// ---------------------------------------------------------------------------

describe('Schema Graph Acyclic Constraint', () => {
  it('production schema graph is acyclic', () => {
    // Build a representative subset of the production schema graph
    const schemas = new Map<string, any>();
    // Use Type.Object with x-references to simulate real schemas
    schemas.set('AuditTrailEntry', Type.Object({
      completion_id: Type.String({
        'x-references': [{ target_schema: 'InvokeResponse', target_field: 'billing_id', relationship: 'references' }],
      }),
      billing_entry_id: Type.String({
        'x-references': [{ target_schema: 'BillingEntry', target_field: 'id', relationship: 'references' }],
      }),
    }));
    schemas.set('PerformanceRecord', Type.Object({
      billing_entry_id: Type.String({
        'x-references': [{ target_schema: 'BillingEntry', target_field: 'id', relationship: 'references' }],
      }),
    }));
    schemas.set('BillingEntry', Type.Object({
      id: Type.String(),
    }));
    schemas.set('InvokeResponse', Type.Object({
      billing_id: Type.String(),
    }));

    const graph = buildSchemaGraph(schemas);
    const result = detectCycles(graph);
    expect(result.has_cycles).toBe(false);

    // Verify topological sort succeeds
    const sorted = topologicalSort(graph);
    expect(sorted).not.toBeNull();
  });

  it('intentionally cyclic graph is detected', () => {
    const schemas = new Map<string, any>();
    schemas.set('SchemaA', Type.Object({
      ref_b: Type.String({
        'x-references': [{ target_schema: 'SchemaB', target_field: 'id', relationship: 'references' }],
      }),
    }));
    schemas.set('SchemaB', Type.Object({
      ref_c: Type.String({
        'x-references': [{ target_schema: 'SchemaC', target_field: 'id', relationship: 'references' }],
      }),
    }));
    schemas.set('SchemaC', Type.Object({
      ref_a: Type.String({
        'x-references': [{ target_schema: 'SchemaA', target_field: 'id', relationship: 'references' }],
      }),
    }));

    const graph = buildSchemaGraph(schemas);
    const result = detectCycles(graph);
    expect(result.has_cycles).toBe(true);
    expect(result.cycles.length).toBeGreaterThanOrEqual(1);

    // Topological sort should return null
    expect(topologicalSort(graph)).toBeNull();
  });
});
