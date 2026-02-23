export type CompatibilityResult = {
    compatible: true;
    warning?: string;
} | {
    compatible: false;
    error: string;
};
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
export declare function validateCompatibility(remoteVersion: string): CompatibilityResult;
//# sourceMappingURL=compatibility.d.ts.map