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
 * @param remoteVersion - The version string from the remote service
 * @returns Compatibility result with optional warning or error
 */
export declare function validateCompatibility(remoteVersion: string): CompatibilityResult;
//# sourceMappingURL=compatibility.d.ts.map