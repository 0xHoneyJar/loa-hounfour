import type { ProviderType } from '../schemas/model/routing/provider-type.js';
/**
 * Human-readable display names for each provider type.
 * Used in UIs, logs, and documentation.
 */
export declare const PROVIDER_DISPLAY_NAMES: Record<ProviderType, string>;
/**
 * Get display name for a provider type, with fallback for unknown values.
 */
export declare function getProviderDisplayName(providerType: string): string;
//# sourceMappingURL=provider-display-names.d.ts.map