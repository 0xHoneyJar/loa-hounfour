import { Type, type Static } from '@sinclair/typebox';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Canonical NFT identification: eip155:{chainId}/{collectionAddress}/{tokenId}
 * Used across all agent-related schemas for consistent NFT identification.
 */

export const NftIdSchema = Type.String({
  $id: 'NftId',
  pattern: '^eip155:\\d+\\/0x[a-fA-F0-9]{40}\\/\\d+$',
  description: 'Canonical NFT identifier: eip155:{chainId}/{collectionAddress}/{tokenId}',
});

export type NftId = Static<typeof NftIdSchema>;

export const NFT_ID_PATTERN = /^eip155:(\d+)\/0x([a-fA-F0-9]{40})\/(\d+)$/;

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
export function parseNftId(id: string): ParsedNftId {
  const match = NFT_ID_PATTERN.exec(id);
  if (!match) {
    throw new Error(`Invalid NftId: ${id}`);
  }
  return {
    chainId: Number(match[1]),
    collection: checksumAddress(`0x${match[2]}`),
    tokenId: match[3],
  };
}

/**
 * Format a canonical NftId string from components.
 * Always outputs EIP-55 checksummed collection address.
 */
export function formatNftId(
  chainId: number,
  collection: string,
  tokenId: string,
): NftId {
  return `eip155:${chainId}/${checksumAddress(collection)}/${tokenId}`;
}

/**
 * Check whether a string is a syntactically valid NftId.
 * Does NOT verify EIP-55 checksum — only checks format.
 */
export function isValidNftId(id: string): boolean {
  return NFT_ID_PATTERN.test(id);
}

/**
 * EIP-55 mixed-case checksum encoding.
 *
 * Uses Keccak-256 (NOT NIST SHA3-256 — they differ in padding).
 * Takes any hex address and returns the checksummed form.
 *
 * @see https://eips.ethereum.org/EIPS/eip-55
 */
export function checksumAddress(address: string): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }

  const stripped = address.slice(2).toLowerCase();
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(stripped)));

  let checksummed = '0x';
  for (let i = 0; i < 40; i++) {
    const nibble = parseInt(hash[i], 16);
    checksummed += nibble >= 8 ? stripped[i].toUpperCase() : stripped[i];
  }

  return checksummed;
}
