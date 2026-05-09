/**
 * Schema Graph — extract cross-schema references and build adjacency graph.
 *
 * Walks TypeBox schemas looking for `x-references` metadata annotations
 * and builds a directed graph of schema relationships. Provides graph
 * operations: reachability, cycle detection, impact analysis, topological sort.
 *
 * @see SDD §2.4.1-2.4.5 — Schema Graph Operations (FR-4)
 * @since v5.5.0 (extract, build), v6.0.0 (reachability, cycles, impact, topo sort)
 */
import type { TObject } from '@sinclair/typebox';
/**
 * A single cross-schema reference edge.
 */
export interface SchemaReference {
    source_schema: string;
    source_field: string;
    target_schema: string;
    target_field: string;
    relationship: string;
}
/**
 * A node in the schema reference graph.
 */
export interface SchemaGraphNode {
    schema_id: string;
    outgoing_references: SchemaReference[];
    incoming_references: SchemaReference[];
}
/**
 * Extract x-references from a single TypeBox schema.
 *
 * Recursively walks all properties (including nested objects, arrays, and
 * intersect/union compositions) looking for `x-references` metadata arrays.
 * Each x-reference entry should have: { target_schema, target_field, relationship }.
 *
 * Depth-limited to MAX_REFERENCE_DEPTH (5) to prevent unbounded traversal.
 *
 * @see SDD §2.4.1-2.4.5 — Schema Graph Operations (FR-4)
 * @see medium-3 resolution — deep reference extraction
 */
export declare function extractReferences(schema: TObject, schemaId: string): SchemaReference[];
/**
 * Build a full schema reference graph from multiple schemas.
 *
 * @param schemas - Map of schema_id → TObject schema
 * @returns Array of graph nodes with incoming and outgoing edges
 */
export declare function buildSchemaGraph(schemas: Map<string, TObject>): SchemaGraphNode[];
/**
 * Check if `to` is reachable from `from` in the schema graph.
 * Uses BFS on outgoing edges.
 *
 * @see SDD §2.4.1 — Schema Graph Reachability
 */
export declare function isReachable(graph: SchemaGraphNode[], from: string, to: string): boolean;
/**
 * Compute the transitive closure: all schemas reachable from `source`.
 *
 * @see SDD §2.4.1 — Schema Graph Reachability
 */
export declare function reachableFrom(graph: SchemaGraphNode[], source: string): Set<string>;
/**
 * Cycle detection result.
 */
export interface CycleDetectionResult {
    has_cycles: boolean;
    cycles: string[][];
}
/**
 * Detect cycles in the schema graph using DFS with 3-coloring.
 * White=unvisited, Gray=in-progress, Black=completed.
 *
 * @see SDD §2.4.2 — Cycle Detection
 */
export declare function detectCycles(graph: SchemaGraphNode[]): CycleDetectionResult;
/**
 * Impact analysis report for a schema change.
 */
export interface ImpactReport {
    schema_id: string;
    directly_affected: string[];
    transitively_affected: string[];
    affected_constraints: string[];
    total_impact_radius: number;
}
/**
 * Analyze the impact of changing a schema.
 * Follows incoming edges (who references this schema?) transitively.
 *
 * @param graph - Schema graph nodes
 * @param schemaId - The schema being changed
 * @param constraintFiles - Optional map of schema_id → constraint file IDs
 * @see SDD §2.4.3 — Impact Analysis
 */
export declare function analyzeImpact(graph: SchemaGraphNode[], schemaId: string, constraintFiles?: Map<string, string[]>): ImpactReport;
/**
 * Topological sort using Kahn's algorithm.
 * Returns sorted array (dependency-first) or null if cycles exist.
 *
 * @see SDD §2.4.4 — Topological Sort
 */
export declare function topologicalSort(graph: SchemaGraphNode[]): string[] | null;
//# sourceMappingURL=schema-graph.d.ts.map