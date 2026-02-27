import { Type } from '@sinclair/typebox';
/**
 * Provider type vocabulary for model routing.
 * Identifies the provider hosting the model.
 *
 * v5.1.0: Added `anthropic`, `google`, `custom` (additive only — wire stability SKP-002).
 * Existing values unchanged. See MIGRATION.md for exhaustive switch guidance (IMP-006).
 *
 * @governance registry-extensible
 */
export const ProviderTypeSchema = Type.Union([
    // Original v5.0.0 values (wire-stable)
    Type.Literal('claude-code'),
    Type.Literal('openai'),
    Type.Literal('openai-compatible'),
    // v5.1.0 additions
    Type.Literal('anthropic'),
    Type.Literal('google'),
    Type.Literal('custom'),
], {
    $id: 'ProviderType',
    $comment: 'Provider type vocabulary for model routing. See RFC #31 (The Hounfour RFC): https://github.com/0xHoneyJar/loa-finn/issues/31',
});
/** All known provider type values. */
export const KNOWN_PROVIDER_TYPES = [
    'claude-code',
    'openai',
    'openai-compatible',
    'anthropic',
    'google',
    'custom',
];
/**
 * Check if a string is a known provider type.
 * Use this instead of exhaustive switches to safely handle future additions (IMP-006).
 */
export function isKnownProviderType(value) {
    return KNOWN_PROVIDER_TYPES.includes(value);
}
//# sourceMappingURL=provider-type.js.map