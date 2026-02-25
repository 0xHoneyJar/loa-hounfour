/**
 * Contract version for the loa-hounfour protocol package.
 *
 * Versioning policy:
 * - PATCH: Bug fixes, documentation updates
 * - MINOR: Additive-only changes (new optional fields, new schemas)
 * - MAJOR: Required-field additions, breaking schema changes
 *
 * N/N-1 support: consumers must accept current and previous minor version.
 * On minor mismatch: `X-Contract-Version-Warning` header.
 * On major mismatch: 400 with `CONTRACT_VERSION_MISMATCH` error.
 */
export const CONTRACT_VERSION = '8.2.0';
export const MIN_SUPPORTED_VERSION = '6.0.0';
/**
 * Base URL for resolvable JSON Schema $id URIs.
 *
 * Full $id format: `{SCHEMA_BASE_URL}/{CONTRACT_VERSION}/{schema-name}`
 *
 * @see BB-ADV-008 — Resolvable $id URLs for ecosystem tooling
 * @since v3.2.0
 */
export const SCHEMA_BASE_URL = 'https://schemas.0xhoneyjar.com/loa-hounfour';
/**
 * Parse a semver string into components.
 */
export function parseSemver(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match)
        throw new Error(`Invalid semver: ${version}`);
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
    };
}
//# sourceMappingURL=version.js.map