import type { ProviderType } from '../schemas/model/routing/provider-type.js';

/**
 * Human-readable display names for each provider type.
 * Used in UIs, logs, and documentation.
 */
export const PROVIDER_DISPLAY_NAMES: Record<ProviderType, string> = {
  'claude-code': 'Anthropic (Claude Code)',
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-Compatible',
  anthropic: 'Anthropic',
  google: 'Google',
  custom: 'Custom Provider',
};

/**
 * Get display name for a provider type, with fallback for unknown values.
 */
export function getProviderDisplayName(providerType: string): string {
  return (
    PROVIDER_DISPLAY_NAMES[providerType as ProviderType] ??
    `Unknown (${providerType})`
  );
}
