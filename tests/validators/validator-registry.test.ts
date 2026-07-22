/**
 * Validator registry determinism regressions (issues #121, #124, #130,
 * #136, #138, #139, #143, #148, #150).
 *
 * - Compile cache: keyed by `$id` + content fingerprint, never `$id`
 *   alone; bounded with FIFO eviction; observable and clearable.
 * - Cross-field registry: duplicate registration throws unless override
 *   is explicit.
 * - Warning metadata: `warning_details` travels in lockstep with the
 *   legacy `warnings` strings through validate(), and `strictWarnings`
 *   promotes them to `<CODE>: <message>` errors.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { Type } from '@sinclair/typebox';
import {
  validate,
  registerCrossFieldValidator,
  getValidatorCacheStats,
  clearValidatorCache,
} from '../../src/validators/index.js';

beforeEach(() => {
  clearValidatorCache();
});

describe('compile cache keying (issues #121 / #136)', () => {
  it('two different schemas sharing an $id never reuse each other\'s validator', () => {
    const sharedId = 'test:cache-collision';
    const stringSchema = Type.Object({ value: Type.String() }, { $id: sharedId });
    const numberSchema = Type.Object({ value: Type.Number() }, { $id: sharedId });

    // Prime the cache with the string variant, then validate against the
    // number variant. Under $id-only keying the second call reused the
    // string validator and returned the wrong verdicts.
    expect(validate(stringSchema, { value: 'hello' }).valid).toBe(true);
    expect(validate(numberSchema, { value: 'hello' }).valid).toBe(false);
    expect(validate(numberSchema, { value: 42 }).valid).toBe(true);
    expect(validate(stringSchema, { value: 42 }).valid).toBe(false);
  });

  it('repeat validations of the same schema object reuse one cache entry', () => {
    const schema = Type.Object({ n: Type.Integer() }, { $id: 'test:cache-single' });
    validate(schema, { n: 1 });
    const size = getValidatorCacheStats().size;
    validate(schema, { n: 2 });
    validate(schema, { n: 3 });
    expect(getValidatorCacheStats().size).toBe(size);
  });
});

describe('compile cache bounds and observability (issue #148)', () => {
  it('exposes size and maxSize, and clearValidatorCache() resets it', () => {
    const before = getValidatorCacheStats();
    expect(before.size).toBe(0);
    expect(before.maxSize).toBeGreaterThan(0);

    validate(Type.Object({ a: Type.String() }, { $id: 'test:cache-stats' }), { a: 'x' });
    expect(getValidatorCacheStats().size).toBe(1);

    clearValidatorCache();
    expect(getValidatorCacheStats().size).toBe(0);
  });

  it('by-reference fast path cannot retain validators past eviction (bound holds)', () => {
    clearValidatorCache();
    const { maxSize } = getValidatorCacheStats();

    // A long-lived consumer schema object (e.g. plugin/tenant registry)
    const pinned = Type.Object({ x: Type.String() }, { $id: 'test:cache-pinned' });
    expect(validate(pinned, { x: 'v' }).valid).toBe(true);

    // Flood the cache far past the bound so the pinned entry is evicted
    for (let i = 0; i < maxSize + 8; i++) {
      const s = Type.Object({ x: Type.String() }, { $id: `test:cache-flood-${i}` });
      validate(s, { x: 'v' });
    }
    expect(getValidatorCacheStats().size).toBeLessThanOrEqual(maxSize);

    // The same schema OBJECT still validates (recompiled into the bounded
    // map, not resurrected from an unbounded side channel) and the stats
    // bound still holds afterwards.
    expect(validate(pinned, { x: 'v' }).valid).toBe(true);
    expect(getValidatorCacheStats().size).toBeLessThanOrEqual(maxSize);
    clearValidatorCache();
  });

  it('recompiles when a schema object is mutated in place (no stale reuse)', () => {
    // Dynamic registries can mutate a long-lived schema object (issue: the
    // by-reference fast path returned the stale compiled validator). The
    // cache key is recomputed from current content on every call, so the
    // mutated object must validate under its NEW rules.
    const schema = Type.Object({ x: Type.String() }, { $id: 'test:cache-mutated' });
    expect(validate(schema, { x: 'v' }).valid).toBe(true);
    expect(validate(schema, { x: 42 }).valid).toBe(false);

    (schema as unknown as { properties: unknown }).properties = { x: Type.Integer() };
    expect(validate(schema, { x: 42 }).valid).toBe(true);
    expect(validate(schema, { x: 'v' }).valid).toBe(false);
  });

  it('never grows past maxSize (FIFO eviction)', () => {
    const { maxSize } = getValidatorCacheStats();
    for (let i = 0; i <= maxSize; i++) {
      validate(Type.Object({ tag: Type.Literal(i) }, { $id: 'test:cache-evict' }), { tag: i });
    }
    expect(getValidatorCacheStats().size).toBeLessThanOrEqual(maxSize);
  });
});

describe('cross-field registration (issues #124 / #138)', () => {
  const ok = () => ({ valid: true, errors: [], warnings: [] });

  it('throws on duplicate registration for the same schema id', () => {
    const id = `test:dup-${Date.now()}`;
    registerCrossFieldValidator(id, ok);
    expect(() => registerCrossFieldValidator(id, ok)).toThrow(/already registered/);
  });

  it('replaces only with an explicit override', () => {
    const id = `test:override-${Date.now()}`;
    const schema = Type.Object({ x: Type.String() }, { $id: id });
    registerCrossFieldValidator(id, ok);
    registerCrossFieldValidator(
      id,
      () => ({ valid: false, errors: ['replaced'], warnings: [] }),
      { override: true },
    );
    expect(validate(schema, { x: 'v' })).toEqual({ valid: false, errors: ['replaced'] });
  });
});

describe('warning metadata (issues #130 / #139 / #143 / #150)', () => {
  const id = 'test:warning-details';
  const schema = Type.Object({ x: Type.String() }, { $id: id });
  registerCrossFieldValidator(id, () => ({
    valid: true,
    errors: [],
    warnings: ['provenance gap: missing source'],
    warning_details: [{ code: 'TEST_PROVENANCE_GAP', message: 'provenance gap: missing source' }],
  }));

  it('carries warnings and warning_details in lockstep on valid results', () => {
    const result = validate(schema, { x: 'v' });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual(['provenance gap: missing source']);
    expect(result.warning_details).toEqual([
      { code: 'TEST_PROVENANCE_GAP', message: 'provenance gap: missing source' },
    ]);
    expect(result.warning_details).toHaveLength(result.warnings!.length);
  });

  it('strictWarnings promotes warnings to <CODE>: <message> errors', () => {
    const result = validate(schema, { x: 'v' }, { strictWarnings: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['TEST_PROVENANCE_GAP: provenance gap: missing source']);
    expect(result.warnings).toEqual(['provenance gap: missing source']);
  });

  it('strictWarnings promotes EVERY warning when warning_details is partial', () => {
    // Extension validators may supply details for only some warnings; the
    // undetailed ones must still escalate (as their raw warning text).
    const partialId = 'test:warning-details-partial';
    const partialSchema = Type.Object({ x: Type.String() }, { $id: partialId });
    registerCrossFieldValidator(partialId, () => ({
      valid: true,
      errors: [],
      warnings: ['detailed warning', 'undetailed warning'],
      warning_details: [{ code: 'TEST_DETAILED', message: 'detailed warning' }],
    }));

    const result = validate(partialSchema, { x: 'v' }, { strictWarnings: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'TEST_DETAILED: detailed warning',
      'undetailed warning',
    ]);
    expect(result.warnings).toEqual(['detailed warning', 'undetailed warning']);
  });

  it('strictWarnings keeps distinct codes for duplicate messages (index-aligned lockstep)', () => {
    // Two warnings may share a display message but carry different codes;
    // `code` is the stable machine-readable value, so a message-keyed
    // lookup must not promote both under the first code.
    const dupId = 'test:warning-details-duplicate-message';
    const dupSchema = Type.Object({ x: Type.String() }, { $id: dupId });
    registerCrossFieldValidator(dupId, () => ({
      valid: true,
      errors: [],
      warnings: ['threshold exceeded', 'threshold exceeded'],
      warning_details: [
        { code: 'TEST_SOFT_LIMIT', message: 'threshold exceeded' },
        { code: 'TEST_HARD_LIMIT', message: 'threshold exceeded' },
      ],
    }));

    const result = validate(dupSchema, { x: 'v' }, { strictWarnings: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'TEST_SOFT_LIMIT: threshold exceeded',
      'TEST_HARD_LIMIT: threshold exceeded',
    ]);
  });
});
