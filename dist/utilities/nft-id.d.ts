import { type Static } from '@sinclair/typebox';
/**
 * Canonical NFT identification: eip155:{chainId}/{collectionAddress}/{tokenId}
 * Used across all agent-related schemas for consistent NFT identification.
 */
export declare const NftIdSchema: import("@sinclair/typebox").TString;
export type NftId = Static<typeof NftIdSchema>;
export declare const NFT_ID_PATTERN: RegExp;
export interface ParsedNftId {
    chainId: number;
    collection: string;
    tokenId: string;
}
/**
 * Parse a canonical NftId string into its components.
 * Accepts any valid hex address (lowercase, uppercase, or mixed-case)
 * and normalizes the collection to EIP-55 checksummed form.
 */
export declare function parseNftId(id: string): ParsedNftId;
/**
 * Format a canonical NftId string from components.
 * Always outputs EIP-55 checksummed collection address.
 */
export declare function formatNftId(chainId: number, collection: string, tokenId: string): NftId;
/**
 * Check whether a string is a syntactically valid NftId.
 * Does NOT verify EIP-55 checksum — only checks format.
 */
export declare function isValidNftId(id: string): boolean;
/**
 * EIP-55 mixed-case checksum encoding.
 *
 * Uses Keccak-256 (NOT NIST SHA3-256 — they differ in padding).
 * Takes any hex address and returns the checksummed form.
 *
 * @see https://eips.ethereum.org/EIPS/eip-55
 */
export declare function checksumAddress(address: string): string;
//# sourceMappingURL=nft-id.d.ts.map