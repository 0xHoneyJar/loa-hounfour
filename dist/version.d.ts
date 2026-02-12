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
export declare const CONTRACT_VERSION: "1.1.0";
export declare const MIN_SUPPORTED_VERSION: "1.0.0";
/**
 * Parse a semver string into components.
 */
export declare function parseSemver(version: string): {
    major: number;
    minor: number;
    patch: number;
};
//# sourceMappingURL=version.d.ts.map