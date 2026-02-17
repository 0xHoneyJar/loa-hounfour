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
import type { TObject, TProperties } from '@sinclair/typebox';

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
 * Maximum depth for recursive reference extraction.
 * Prevents unbounded traversal of deeply nested or circular schema structures.
 */
const MAX_REFERENCE_DEPTH = 5;

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
export function extractReferences(schema: TObject, schemaId: string): SchemaReference[] {
  const refs: SchemaReference[] = [];
  const properties = schema.properties as TProperties;

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    walkSchemaNode(fieldSchema as Record<string, unknown>, schemaId, fieldName, refs, 0);
  }

  return refs;
}

/**
 * Recursively walk a schema node extracting x-references at any depth.
 * Handles object types, array items, allOf/anyOf/oneOf compositions.
 *
 * @param node - The schema node to inspect
 * @param schemaId - Source schema identifier
 * @param fieldPath - Dot-separated path from root (e.g., "config.exchange.rate")
 * @param refs - Accumulator for discovered references
 * @param depth - Current recursion depth (bounded by MAX_REFERENCE_DEPTH)
 */
function walkSchemaNode(
  node: Record<string, unknown>,
  schemaId: string,
  fieldPath: string,
  refs: SchemaReference[],
  depth: number,
): void {
  if (depth > MAX_REFERENCE_DEPTH) return;
  if (node == null || typeof node !== 'object') return;

  // Extract x-references from this node
  const xRefs = node['x-references'];
  if (Array.isArray(xRefs)) {
    for (const ref of xRefs) {
      if (ref && typeof ref === 'object' && 'target_schema' in ref && 'target_field' in ref) {
        refs.push({
          source_schema: schemaId,
          source_field: fieldPath,
          target_schema: String((ref as Record<string, unknown>).target_schema),
          target_field: String((ref as Record<string, unknown>).target_field),
          relationship: String((ref as Record<string, unknown>).relationship ?? 'references'),
        });
      }
    }
  }

  // Recurse into nested object properties
  if (node.type === 'object' && node.properties != null && typeof node.properties === 'object') {
    for (const [nestedField, nestedSchema] of Object.entries(node.properties as Record<string, unknown>)) {
      if (nestedSchema != null && typeof nestedSchema === 'object') {
        walkSchemaNode(nestedSchema as Record<string, unknown>, schemaId, `${fieldPath}.${nestedField}`, refs, depth + 1);
      }
    }
  }

  // Recurse into array items
  if (node.type === 'array' && node.items != null && typeof node.items === 'object') {
    walkSchemaNode(node.items as Record<string, unknown>, schemaId, `${fieldPath}[]`, refs, depth + 1);
  }

  // Recurse into composition keywords (allOf, anyOf, oneOf — TypeBox Intersect/Union)
  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    const compositions = node[keyword];
    if (Array.isArray(compositions)) {
      for (let i = 0; i < compositions.length; i++) {
        const comp = compositions[i];
        if (comp != null && typeof comp === 'object') {
          walkSchemaNode(comp as Record<string, unknown>, schemaId, fieldPath, refs, depth + 1);
        }
      }
    }
  }
}

/**
 * Build a full schema reference graph from multiple schemas.
 *
 * @param schemas - Map of schema_id → TObject schema
 * @returns Array of graph nodes with incoming and outgoing edges
 */
export function buildSchemaGraph(schemas: Map<string, TObject>): SchemaGraphNode[] {
  // Extract all references
  const allRefs: SchemaReference[] = [];
  for (const [id, schema] of schemas) {
    allRefs.push(...extractReferences(schema, id));
  }

  // Build node map (include all schema IDs and any referenced targets)
  const nodeMap = new Map<string, SchemaGraphNode>();
  const ensureNode = (id: string): SchemaGraphNode => {
    let node = nodeMap.get(id);
    if (!node) {
      node = { schema_id: id, outgoing_references: [], incoming_references: [] };
      nodeMap.set(id, node);
    }
    return node;
  };

  for (const id of schemas.keys()) {
    ensureNode(id);
  }

  // Populate edges
  for (const ref of allRefs) {
    ensureNode(ref.source_schema).outgoing_references.push(ref);
    ensureNode(ref.target_schema).incoming_references.push(ref);
  }

  return [...nodeMap.values()];
}

// ---------------------------------------------------------------------------
// Graph Operations (v6.0.0, FR-4)
// ---------------------------------------------------------------------------

/**
 * Build adjacency list from graph nodes (outgoing edges).
 */
function toAdjacencyList(graph: SchemaGraphNode[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const node of graph) {
    if (!adj.has(node.schema_id)) adj.set(node.schema_id, new Set());
    for (const ref of node.outgoing_references) {
      adj.get(node.schema_id)!.add(ref.target_schema);
      if (!adj.has(ref.target_schema)) adj.set(ref.target_schema, new Set());
    }
  }
  return adj;
}

/**
 * Build reverse adjacency list (incoming edges — who references this schema?).
 */
function toReverseAdjacencyList(graph: SchemaGraphNode[]): Map<string, Set<string>> {
  const rev = new Map<string, Set<string>>();
  for (const node of graph) {
    if (!rev.has(node.schema_id)) rev.set(node.schema_id, new Set());
    for (const ref of node.incoming_references) {
      if (!rev.has(ref.source_schema)) rev.set(ref.source_schema, new Set());
      rev.get(node.schema_id)!.add(ref.source_schema);
    }
  }
  return rev;
}

/**
 * Check if `to` is reachable from `from` in the schema graph.
 * Uses BFS on outgoing edges.
 *
 * @see SDD §2.4.1 — Schema Graph Reachability
 */
export function isReachable(graph: SchemaGraphNode[], from: string, to: string): boolean {
  if (from === to) return true;
  const adj = toAdjacencyList(graph);
  const visited = new Set<string>();
  const queue = [from];
  visited.add(from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (neighbor === to) return true;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

/**
 * Compute the transitive closure: all schemas reachable from `source`.
 *
 * @see SDD §2.4.1 — Schema Graph Reachability
 */
export function reachableFrom(graph: SchemaGraphNode[], source: string): Set<string> {
  const adj = toAdjacencyList(graph);
  const visited = new Set<string>();
  const queue = [source];
  visited.add(source);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Remove source from the result (reachable means "can reach", not self)
  visited.delete(source);
  return visited;
}

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
export function detectCycles(graph: SchemaGraphNode[]): CycleDetectionResult {
  const adj = toAdjacencyList(graph);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];

  for (const id of adj.keys()) {
    color.set(id, WHITE);
  }

  function dfs(u: string): void {
    color.set(u, GRAY);
    const neighbors = adj.get(u);
    if (neighbors) {
      for (const v of neighbors) {
        if (color.get(v) === GRAY) {
          // Back edge → cycle found. Reconstruct cycle.
          const cycle: string[] = [v];
          let curr = u;
          while (curr !== v) {
            cycle.push(curr);
            curr = parent.get(curr) ?? v;
          }
          cycle.push(v);
          cycle.reverse();
          cycles.push(cycle);
        } else if (color.get(v) === WHITE) {
          parent.set(v, u);
          dfs(v);
        }
      }
    }
    color.set(u, BLACK);
  }

  for (const id of adj.keys()) {
    if (color.get(id) === WHITE) {
      parent.set(id, null);
      dfs(id);
    }
  }

  return { has_cycles: cycles.length > 0, cycles };
}

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
export function analyzeImpact(
  graph: SchemaGraphNode[],
  schemaId: string,
  constraintFiles?: Map<string, string[]>,
): ImpactReport {
  const rev = toReverseAdjacencyList(graph);

  // Direct: schemas that directly reference this schema
  const directSet = rev.get(schemaId) ?? new Set<string>();
  const directly_affected = [...directSet];

  // Transitive: BFS on reverse adjacency from direct dependents
  const transitiveSet = new Set<string>();
  const queue = [...directSet];
  const visited = new Set<string>([schemaId, ...directSet]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const parents = rev.get(current);
    if (!parents) continue;
    for (const p of parents) {
      if (!visited.has(p)) {
        visited.add(p);
        transitiveSet.add(p);
        queue.push(p);
      }
    }
  }
  const transitively_affected = [...transitiveSet];

  // Affected constraints: constraints that reference this schema or any affected schema
  const allAffected = new Set([schemaId, ...directly_affected, ...transitively_affected]);
  const affected_constraints: string[] = [];
  if (constraintFiles) {
    for (const affectedId of allAffected) {
      const constraints = constraintFiles.get(affectedId);
      if (constraints) {
        affected_constraints.push(...constraints);
      }
    }
  }

  return {
    schema_id: schemaId,
    directly_affected,
    transitively_affected,
    affected_constraints,
    total_impact_radius: directly_affected.length + transitively_affected.length,
  };
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns sorted array (dependency-first) or null if cycles exist.
 *
 * @see SDD §2.4.4 — Topological Sort
 */
export function topologicalSort(graph: SchemaGraphNode[]): string[] | null {
  const adj = toAdjacencyList(graph);
  const inDegree = new Map<string, number>();

  // Initialize in-degree
  for (const id of adj.keys()) {
    if (!inDegree.has(id)) inDegree.set(id, 0);
  }
  for (const [, neighbors] of adj) {
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) + 1);
    }
  }

  // Start with nodes that have no incoming edges
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }
  queue.sort(); // Deterministic ordering for same-degree nodes

  const result: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    const neighbors = adj.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
          queue.sort(); // Maintain deterministic ordering
        }
      }
    }
  }

  // If we didn't visit all nodes, there's a cycle
  if (result.length !== adj.size) return null;
  return result;
}
