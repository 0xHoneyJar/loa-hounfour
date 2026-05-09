import { type Static } from '@sinclair/typebox';
/**
 * Provider type vocabulary for model routing.
 * Identifies the provider hosting the model.
 *
 * v5.1.0: Added `anthropic`, `google`, `custom` (additive only — wire stability SKP-002).
 * Existing values unchanged. See MIGRATION.md for exhaustive switch guidance (IMP-006).
 *
 * @governance registry-extensible
 */
export declare const ProviderTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"claude-code">, import("@sinclair/typebox").TLiteral<"openai">, import("@sinclair/typebox").TLiteral<"openai-compatible">, import("@sinclair/typebox").TLiteral<"anthropic">, import("@sinclair/typebox").TLiteral<"google">, import("@sinclair/typebox").TLiteral<"custom">]>;
export type ProviderType = Static<typeof ProviderTypeSchema>;
/** All known provider type values. */
export declare const KNOWN_PROVIDER_TYPES: readonly ProviderType[];
/**
 * Check if a string is a known provider type.
 * Use this instead of exhaustive switches to safely handle future additions (IMP-006).
 */
export declare function isKnownProviderType(value: string): value is ProviderType;
//# sourceMappingURL=provider-type.d.ts.map