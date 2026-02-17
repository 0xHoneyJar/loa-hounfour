/**
 * Schema Graph — extract cross-schema references and build adjacency graph.
 *
 * Walks TypeBox schemas looking for `x-references` metadata annotations
 * and builds a directed graph of schema relationships.
 *
 * @see SDD §2.4.3 — Schema Graph Utility (FR-4)
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
 * Extract x-references from a single TypeBox schema.
 *
 * Walks all properties looking for `x-references` metadata arrays.
 * Each x-reference entry should have: { target_schema, target_field, relationship }.
 *
 * NOTE: Only walks one level of nested objects. References on deeply nested
 * properties (depth > 1) or inside Type.Array/Type.Intersect compositions
 * are not discovered. See: bridge-20260217-v55 iter1 finding medium-3.
 */
export function extractReferences(schema: TObject, schemaId: string): SchemaReference[] {
  const refs: SchemaReference[] = [];
  const properties = schema.properties as TProperties;

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const xRefs = (fieldSchema as Record<string, unknown>)['x-references'];
    if (Array.isArray(xRefs)) {
      for (const ref of xRefs) {
        if (ref && typeof ref === 'object' && 'target_schema' in ref && 'target_field' in ref) {
          refs.push({
            source_schema: schemaId,
            source_field: fieldName,
            target_schema: String(ref.target_schema),
            target_field: String(ref.target_field),
            relationship: String((ref as Record<string, unknown>).relationship ?? 'references'),
          });
        }
      }
    }

    // Check nested objects for x-references (one level deep)
    if ((fieldSchema as Record<string, unknown>).type === 'object') {
      const nested = (fieldSchema as Record<string, unknown>).properties as Record<string, unknown> | undefined;
      if (nested) {
        for (const [nestedField, nestedSchema] of Object.entries(nested)) {
          const nestedRefs = (nestedSchema as Record<string, unknown>)['x-references'];
          if (Array.isArray(nestedRefs)) {
            for (const ref of nestedRefs) {
              if (ref && typeof ref === 'object' && 'target_schema' in ref && 'target_field' in ref) {
                refs.push({
                  source_schema: schemaId,
                  source_field: `${fieldName}.${nestedField}`,
                  target_schema: String(ref.target_schema),
                  target_field: String(ref.target_field),
                  relationship: String((ref as Record<string, unknown>).relationship ?? 'references'),
                });
              }
            }
          }
        }
      }
    }
  }

  return refs;
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
