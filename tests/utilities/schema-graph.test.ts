/**
 * Tests for schema graph utility (S2-T4).
 *
 * Validates x-references extraction and graph building.
 */
import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import {
  extractReferences,
  buildSchemaGraph,
  type SchemaReference,
} from '../../src/utilities/schema-graph.js';
import { InterAgentTransactionAuditSchema } from '../../src/schemas/inter-agent-transaction-audit.js';
import { AuditTrailEntrySchema } from '../../src/schemas/audit-trail-entry.js';
import { PerformanceRecordSchema } from '../../src/schemas/performance-record.js';
import { JwtBoundarySpecSchema } from '../../src/economy/jwt-boundary.js';

describe('extractReferences', () => {
  it('extracts references from InterAgentTransactionAudit', () => {
    const refs = extractReferences(InterAgentTransactionAuditSchema, 'InterAgentTransactionAudit');
    expect(refs.length).toBeGreaterThanOrEqual(1);

    const chainRef = refs.find(r => r.target_schema === 'DelegationChain');
    expect(chainRef).toBeDefined();
    expect(chainRef!.source_field).toBe('delegation_chain_id');
    expect(chainRef!.target_field).toBe('chain_id');
    expect(chainRef!.relationship).toBe('references');
  });

  it('extracts nested references from governance_context.proposal_id', () => {
    const refs = extractReferences(InterAgentTransactionAuditSchema, 'InterAgentTransactionAudit');
    const proposalRef = refs.find(r => r.target_schema === 'ConstraintProposal');
    expect(proposalRef).toBeDefined();
    expect(proposalRef!.source_field).toBe('governance_context.proposal_id');
  });

  it('extracts references from AuditTrailEntry', () => {
    const refs = extractReferences(AuditTrailEntrySchema, 'AuditTrailEntry');
    expect(refs).toHaveLength(2);

    const completionRef = refs.find(r => r.target_schema === 'InvokeResponse');
    expect(completionRef).toBeDefined();
    expect(completionRef!.source_field).toBe('completion_id');

    const billingRef = refs.find(r => r.target_schema === 'BillingEntry');
    expect(billingRef).toBeDefined();
    expect(billingRef!.source_field).toBe('billing_entry_id');
  });

  it('extracts references from PerformanceRecord', () => {
    const refs = extractReferences(PerformanceRecordSchema, 'PerformanceRecord');
    expect(refs).toHaveLength(1);
    expect(refs[0].target_schema).toBe('BillingEntry');
  });

  it('extracts references from JwtBoundarySpec', () => {
    const refs = extractReferences(JwtBoundarySpecSchema, 'JwtBoundarySpec');
    expect(refs).toHaveLength(1);
    expect(refs[0].source_field).toBe('claims_schema_ref');
    expect(refs[0].target_schema).toBe('schemas/index.json');
  });

  it('returns empty array for schema with no x-references', () => {
    const plain = Type.Object({
      id: Type.String(),
      name: Type.String(),
    });
    expect(extractReferences(plain, 'Plain')).toEqual([]);
  });
});

describe('buildSchemaGraph', () => {
  it('builds graph with correct edges', () => {
    const schemas = new Map([
      ['AuditTrailEntry', AuditTrailEntrySchema],
      ['PerformanceRecord', PerformanceRecordSchema],
    ]);
    const graph = buildSchemaGraph(schemas);

    const auditNode = graph.find(n => n.schema_id === 'AuditTrailEntry');
    expect(auditNode).toBeDefined();
    expect(auditNode!.outgoing_references).toHaveLength(2);
    expect(auditNode!.incoming_references).toHaveLength(0);

    // BillingEntry is a target — should be auto-created as a node
    const billingNode = graph.find(n => n.schema_id === 'BillingEntry');
    expect(billingNode).toBeDefined();
    expect(billingNode!.incoming_references.length).toBeGreaterThanOrEqual(2);
    expect(billingNode!.outgoing_references).toHaveLength(0);
  });

  it('creates nodes for referenced targets not in input', () => {
    const schemas = new Map([
      ['AuditTrailEntry', AuditTrailEntrySchema],
    ]);
    const graph = buildSchemaGraph(schemas);

    // InvokeResponse and BillingEntry are referenced but not provided
    const invokeNode = graph.find(n => n.schema_id === 'InvokeResponse');
    expect(invokeNode).toBeDefined();
    expect(invokeNode!.incoming_references).toHaveLength(1);
  });

  it('handles empty input', () => {
    const graph = buildSchemaGraph(new Map());
    expect(graph).toEqual([]);
  });
});


describe('extractReferences — deep nesting (medium-3)', () => {
  it('extracts references at depth 2', () => {
    const deepSchema = Type.Object({
      outer: Type.Object({
        inner: Type.Object({
          ref_field: Type.String({
            'x-references': [{ target_schema: 'DeepTarget', target_field: 'id', relationship: 'references' }],
          } as Record<string, unknown>),
        }),
      }),
    }) as TObject;

    const refs = extractReferences(deepSchema, 'DeepSchema');
    expect(refs).toHaveLength(1);
    expect(refs[0].source_field).toBe('outer.inner.ref_field');
    expect(refs[0].target_schema).toBe('DeepTarget');
  });

  it('extracts references inside array items', () => {
    const arraySchema = Type.Object({
      items: Type.Array(Type.Object({
        target_id: Type.String({
          'x-references': [{ target_schema: 'ArrayTarget', target_field: 'id', relationship: 'contains' }],
        } as Record<string, unknown>),
      })),
    }) as TObject;

    const refs = extractReferences(arraySchema, 'ArraySchema');
    expect(refs).toHaveLength(1);
    expect(refs[0].source_field).toBe('items[].target_id');
    expect(refs[0].target_schema).toBe('ArrayTarget');
    expect(refs[0].relationship).toBe('contains');
  });

  it('respects MAX_REFERENCE_DEPTH', () => {
    // Build a schema nested 7 levels deep — should stop at depth 5
    let innermost = Type.Object({
      deep_ref: Type.String({
        'x-references': [{ target_schema: 'TooDeep', target_field: 'id', relationship: 'references' }],
      } as Record<string, unknown>),
    });
    // Wrap it 6 more levels (total 7 nesting levels)
    for (let i = 0; i < 6; i++) {
      innermost = Type.Object({ [`level_${i}`]: innermost });
    }
    const veryDeep = Type.Object({ root: innermost }) as TObject;

    const refs = extractReferences(veryDeep, 'VeryDeep');
    // Should NOT find the reference because it's deeper than 5
    expect(refs).toHaveLength(0);
  });

  it('handles allOf/anyOf compositions', () => {
    // Simulate a TypeBox Intersect — it generates allOf in JSON Schema
    const intersectSchema = Type.Object({
      composite: Type.Intersect([
        Type.Object({
          ref_a: Type.String({
            'x-references': [{ target_schema: 'TargetA', target_field: 'id', relationship: 'references' }],
          } as Record<string, unknown>),
        }),
        Type.Object({
          ref_b: Type.String({
            'x-references': [{ target_schema: 'TargetB', target_field: 'id', relationship: 'references' }],
          } as Record<string, unknown>),
        }),
      ]),
    }) as TObject;

    const refs = extractReferences(intersectSchema, 'IntersectSchema');
    expect(refs.length).toBeGreaterThanOrEqual(2);
    expect(refs.some(r => r.target_schema === 'TargetA')).toBe(true);
    expect(refs.some(r => r.target_schema === 'TargetB')).toBe(true);
  });
});
