/**
 * Contract version compatibility checker.
 *
 * Implements N/N-1 support per SDD 4.1:
 * - Same major + minor: COMPATIBLE
 * - Same major, minor ±1: COMPATIBLE_WITH_WARNING (X-Contract-Version-Warning header)
 * - Different major: INCOMPATIBLE (400 CONTRACT_VERSION_MISMATCH)
 *
 * @see SDD 4.1 — Version Negotiation
 */
import { CONTRACT_VERSION, MIN_SUPPORTED_VERSION, parseSemver } from '../version.js';

export type CompatibilityResult =
  | { compatible: true; warning?: string }
  | { compatible: false; error: string };

/**
 * Check if a remote contract version is compatible with this package.
 *
 * @param remoteVersion - The version string from the remote service
 * @returns Compatibility result with optional warning or error
 */
export function validateCompatibility(remoteVersion: string): CompatibilityResult {
  let remote;
  try {
    remote = parseSemver(remoteVersion);
  } catch {
    return {
      compatible: false,
      error: `Invalid contract version format: "${remoteVersion}". Expected semver (e.g., ${CONTRACT_VERSION}).`,
    };
  }

  const local = parseSemver(CONTRACT_VERSION);
  const min = parseSemver(MIN_SUPPORTED_VERSION);

  // Major version mismatch — incompatible
  if (remote.major !== local.major) {
    return {
      compatible: false,
      error: `Major version mismatch: remote=${remoteVersion}, local=${CONTRACT_VERSION}. ` +
        `Major version changes require coordinated upgrade.`,
    };
  }

  // Below minimum supported
  if (
    remote.major < min.major ||
    (remote.major === min.major && remote.minor < min.minor)
  ) {
    return {
      compatible: false,
      error: `Version ${remoteVersion} is below minimum supported ${MIN_SUPPORTED_VERSION}.`,
    };
  }

  // Minor version difference — compatible with warning
  const minorDiff = Math.abs(remote.minor - local.minor);
  if (minorDiff > 0) {
    return {
      compatible: true,
      warning: `Minor version mismatch: remote=${remoteVersion}, local=${CONTRACT_VERSION}. ` +
        `Some features may not be available. Set X-Contract-Version-Warning header.`,
    };
  }

  // Exact match or patch difference — fully compatible
  return { compatible: true };
}
