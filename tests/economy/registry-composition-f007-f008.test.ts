/**
 * Tests for F-007 (withAnnotation utility) and F-008 (BridgeInvariant ID pattern expansion).
 *
 * @see SDD §2.1.1 — F-007: TypeBox Cross-Field Annotation Type Safety
 * @see SDD §2.1.2 — F-008: BridgeInvariant ID Pattern Expansion
 * @since v7.0.0 (Sprint 1)
 */
import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  withAnnotation,
  BridgeInvariantSchema,
  RegistryBridgeSchema,
} from '../../src/economy/registry-composition.js';

// ---------------------------------------------------------------------------
// F-007: withAnnotation utility
// ---------------------------------------------------------------------------

describe('withAnnotation (F-007)', () => {
  it('adds custom annotation to TypeBox schema', () => {
    const base = Type.Object({ name: Type.String() });
    const annotated = withAnnotation(base, { 'x-custom': true });
    expect((annotated as Record<string, unknown>)['x-custom']).toBe(true);
  });

  it('preserves existing schema properties', () => {
    const base = Type.Object({ id: Type.String() }, { $id: 'TestSchema' });
    const annotated = withAnnotation(base, { 'x-validated': 'yes' });
    expect(annotated.$id).toBe('TestSchema');
    expect(annotated.properties).toBeDefined();
  });

  it('produces valid JSON Schema output with annotation', () => {
    const annotated = withAnnotation(
      Type.Object({ value: Type.Number() }),
      { 'x-cross-field-validated': true },
    );
    const json = JSON.parse(JSON.stringify(annotated));
    expect(json['x-cross-field-validated']).toBe(true);
    expect(json.type).toBe('object');
    expect(json.properties.value.type).toBe('number');
  });

  it('allows multiple annotations', () => {
    const annotated = withAnnotation(
      Type.String(),
      { 'x-a': 1, 'x-b': 'two', 'x-c': [3] },
    );
    expect((annotated as Record<string, unknown>)['x-a']).toBe(1);
    expect((annotated as Record<string, unknown>)['x-b']).toBe('two');
    expect((annotated as Record<string, unknown>)['x-c']).toEqual([3]);
  });

  it('RegistryBridgeSchema has x-cross-field-validated annotation', () => {
    const json = JSON.parse(JSON.stringify(RegistryBridgeSchema));
    expect(json['x-cross-field-validated']).toBe(true);
  });

  it('RegistryBridgeSchema still validates correct data', () => {
    const bridge = {
      bridge_id: '00000000-0000-0000-0000-000000000001',
      source_registry_id: '00000000-0000-0000-0000-000000000002',
      target_registry_id: '00000000-0000-0000-0000-000000000003',
      bridge_invariants: [{
        invariant_id: 'B-1',
        name: 'Conservation',
        description: 'source.debit == target.credit',
        ltl_formula: 'G(transfer → conserved)',
        enforcement: 'atomic',
      }],
      exchange_rate: {
        rate_type: 'fixed',
        value: '1.0',
        governance_proposal_required: false,
        staleness_threshold_seconds: 3600,
      },
      settlement: 'immediate',
      contract_version: '7.0.0',
    };
    expect(Value.Check(RegistryBridgeSchema, bridge)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// F-008: BridgeInvariant ID pattern expansion
// ---------------------------------------------------------------------------

describe('BridgeInvariant ID pattern expansion (F-008)', () => {
  const makeInvariant = (id: string) => ({
    invariant_id: id,
    name: 'Test invariant',
    description: 'Test description',
    ltl_formula: 'G(true)',
    enforcement: 'atomic' as const,
  });

  it('B-1 is valid', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('B-1'))).toBe(true);
  });

  it('B-99 is valid', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('B-99'))).toBe(true);
  });

  it('B-100 is valid (was previously rejected)', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('B-100'))).toBe(true);
  });

  it('B-9999 is valid', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('B-9999'))).toBe(true);
  });

  it('B-10000 is rejected (5 digits)', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('B-10000'))).toBe(false);
  });

  it('B-0 is valid (single digit)', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('B-0'))).toBe(true);
  });

  it('B- without digits is rejected', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('B-'))).toBe(false);
  });

  it('X-99 prefix is rejected', () => {
    expect(Value.Check(BridgeInvariantSchema, makeInvariant('X-99'))).toBe(false);
  });
});
