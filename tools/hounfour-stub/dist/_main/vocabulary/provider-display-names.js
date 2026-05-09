/**
 * Human-readable display names for each provider type.
 * Used in UIs, logs, and documentation.
 */
export const PROVIDER_DISPLAY_NAMES = {
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
export function getProviderDisplayName(providerType) {
    return (PROVIDER_DISPLAY_NAMES[providerType] ??
        `Unknown (${providerType})`);
}
//# sourceMappingURL=provider-display-names.js.map