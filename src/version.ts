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
export const CONTRACT_VERSION = '1.1.0' as const;
export const MIN_SUPPORTED_VERSION = '1.0.0' as const;

/**
 * Parse a semver string into components.
 */
export function parseSemver(version: string): { major: number; minor: number; patch: number } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}
