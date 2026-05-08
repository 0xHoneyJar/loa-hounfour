/**
 * PR-A3.5 iter-5 F-002 — Guard test that prevents annotation-vs-registration
 * drift on the `'x-canonical-size-cap-bytes-of-field'` metadata.
 *
 * The byte-cap validator is registered explicitly per schema (see the
 * comment above `registerByteCapValidator` in `src/validators/index.ts`)
 * rather than via a module-load scan, so a contributor who adds the
 * metadata annotation to a new schema can silently ship a schema whose
 * declared invariant is unenforced. This test scans every exported
 * schema, identifies any whose root carries the annotation, and asserts
 * that `registerByteCapValidator` was called for it (the schema's
 * `$id` must appear in the cross-field validator registry).
 *
 * @since v8.6.0 — FR-B3 (PR-A3.5 iter-5 F-002)
 */
import { describe, it, expect } from 'vitest';
import {
  getCrossFieldValidatorSchemas,
} from '../../src/validators/index.js';
import * as operations from '../../src/operations/index.js';

describe('byte-cap registration guard (PR-A3.5 iter-5 F-002)', () => {
  it('every schema carrying x-canonical-size-cap-bytes-of-field has a registered cross-field validator', () => {
    const registered = new Set(getCrossFieldValidatorSchemas());
    const annotated: string[] = [];
    const unregistered: string[] = [];

    for (const value of Object.values(operations)) {
      if (value === null || typeof value !== 'object') continue;
      const record = value as Record<string, unknown>;
      const annotation = record['x-canonical-size-cap-bytes-of-field'];
      const id = record.$id;
      if (
        annotation !== null &&
        typeof annotation === 'object' &&
        typeof id === 'string'
      ) {
        annotated.push(id);
        if (!registered.has(id)) {
          unregistered.push(id);
        }
      }
    }

    expect(annotated.length).toBeGreaterThan(0);
    expect(unregistered).toEqual([]);
  });
});
