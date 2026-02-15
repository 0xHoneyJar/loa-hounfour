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
