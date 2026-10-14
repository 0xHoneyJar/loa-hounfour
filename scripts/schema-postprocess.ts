/**
 * Shared post-processing for generated JSON Schema files.
 *
 * TypeBox generates pure JSON Schema from TypeBox definitions, but some
 * cross-field constraints (if/then) can't be expressed in TypeBox and must
 * be injected during generation. This module centralizes those transforms
 * so `generate-schemas.ts` and `check-schemas.ts` stay in sync.
 *
 * @see BB-V3-F002 — Extract duplicated if/then injection
 */

/**
 * Apply post-generation transforms to a JSON Schema object.
 *
 * Currently handles:
 * - ConversationSealingPolicy if/then encryption invariant (BB-V3-008)
 * - Stripping `$id` from inlined sub-schemas so the only `$id` remaining
 *   is the top-level versioned URI set by `generate-schemas.ts`. TypeBox
 *   inlines literal-union and object schemas with their declared `$id`
 *   per-occurrence; under JSON Schema 2020-12 those duplicate identifiers
 *   are ambiguous (e.g., `TrustLevel` appearing 6+ times in a single
 *   document, each with the same `$id: 'TrustLevel'`).
 *
 * @param name - Schema name (e.g., 'conversation')
 * @param jsonSchema - Mutable JSON Schema object to transform in place
 */
export function postProcessSchema(
  name: string,
  jsonSchema: Record<string, unknown>,
): void {
  if (name === 'conversation') {
    injectSealingPolicyConstraint(jsonSchema);
  }
  stripNestedIds(jsonSchema);
}

/**
 * Recursively remove `$id` from every nested object inside `jsonSchema`,
 * leaving the top-level `$id` untouched. Caller invokes after
 * `generate-schemas.ts` has set the canonical top-level `$id` (versioned
 * URI), so the only identifier remaining in the document is the unambiguous
 * one for the schema as a whole.
 *
 * Implementation note: we walk every `properties[*]`, `items`, `anyOf[*]`,
 * `oneOf[*]`, `allOf[*]`, `not`, `additionalProperties`, `if`/`then`/`else`,
 * `patternProperties[*]`, and bare object children. The walk is depth-first
 * and in-place; values that aren't plain objects (primitives, arrays of
 * non-objects) are skipped.
 */
function stripNestedIds(jsonSchema: Record<string, unknown>): void {
  for (const key of Object.keys(jsonSchema)) {
    if (key === '$id' || key === '$schema' || key === '$comment') continue;
    walkAndStrip(jsonSchema[key]);
  }
}

function walkAndStrip(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) walkAndStrip(item);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if ('$id' in obj) {
      delete obj.$id;
    }
    for (const key of Object.keys(obj)) {
      walkAndStrip(obj[key]);
    }
  }
}

/**
 * Inject cross-field validation for ConversationSealingPolicy (BB-V3-008).
 *
 * JSON Schema 2020-12 if/then expresses the invariant that Go/Python
 * validators can enforce natively without reading TypeScript source:
 * when encryption_scheme !== 'none', key_reference is required and
 * key_derivation must not be 'none'.
 */
function injectSealingPolicyConstraint(
  jsonSchema: Record<string, unknown>,
): void {
  const props = jsonSchema.properties as Record<string, unknown> | undefined;
  if (!props?.sealing_policy) return;

  const sp = props.sealing_policy as Record<string, unknown>;
  sp.if = {
    properties: { encryption_scheme: { not: { const: 'none' } } },
    required: ['encryption_scheme'],
  };
  sp.then = {
    required: ['key_reference'],
    properties: {
      key_derivation: { not: { const: 'none' } },
    },
  };
}
