/**
 * Graph sub-package barrel.
 *
 * Re-exports schema graph operations: reference extraction, adjacency graph,
 * reachability, cycle detection, impact analysis, topological sort.
 *
 * @since v6.0.0
 */
export {
  extractReferences,
  buildSchemaGraph,
  type SchemaReference,
  type SchemaGraphNode,
} from '../utilities/schema-graph.js';
