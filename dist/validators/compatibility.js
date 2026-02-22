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
/**
 * Compare two parsed semver versions.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
function compareSemver(a, b) {
    if (a.major !== b.major)
        return a.major < b.major ? -1 : 1;
    if (a.minor !== b.minor)
        return a.minor < b.minor ? -1 : 1;
    if (a.patch !== b.patch)
        return a.patch < b.patch ? -1 : 1;
    return 0;
}
/**
 * Check if a remote contract version is compatible with this package.
 *
 * Compatibility window: [MIN_SUPPORTED_VERSION, CONTRACT_VERSION].
 * - remote < MIN_SUPPORTED_VERSION → incompatible
 * - remote > CONTRACT_VERSION (future major) → incompatible
 * - remote in window, different major → compatible with warning
 * - remote in window, same major, different minor → compatible with warning
 * - remote in window, same major+minor → fully compatible
 *
 * @param remoteVersion - The version string from the remote service
 * @returns Compatibility result with optional warning or error
 */
export function validateCompatibility(remoteVersion) {
    let remote;
    try {
        remote = parseSemver(remoteVersion);
    }
    catch {
        return {
            compatible: false,
            error: `Invalid contract version format: "${remoteVersion}". Expected semver (e.g., ${CONTRACT_VERSION}).`,
        };
    }
    const local = parseSemver(CONTRACT_VERSION);
    const min = parseSemver(MIN_SUPPORTED_VERSION);
    // Below minimum supported — incompatible
    if (compareSemver(remote, min) < 0) {
        return {
            compatible: false,
            error: `Version ${remoteVersion} is below minimum supported ${MIN_SUPPORTED_VERSION}.`,
        };
    }
    // Future major version — incompatible (we cannot forward-compat to unknown majors)
    if (remote.major > local.major) {
        return {
            compatible: false,
            error: `Version ${remoteVersion} is a future major version (local=${CONTRACT_VERSION}). ` +
                `Upgrade this package to support ${remoteVersion}.`,
        };
    }
    // Cross-major within support window — compatible with warning
    if (remote.major < local.major) {
        return {
            compatible: true,
            warning: `Cross-major version: remote=${remoteVersion}, local=${CONTRACT_VERSION}. ` +
                `Remote is within support window (>= ${MIN_SUPPORTED_VERSION}). ` +
                `Set X-Contract-Version-Warning header.`,
        };
    }
    // Same major, minor version difference — compatible with warning
    if (remote.minor !== local.minor) {
        return {
            compatible: true,
            warning: `Minor version mismatch: remote=${remoteVersion}, local=${CONTRACT_VERSION}. ` +
                `Some features may not be available. Set X-Contract-Version-Warning header.`,
        };
    }
    // Exact match or patch difference — fully compatible
    return { compatible: true };
}
//# sourceMappingURL=compatibility.js.map