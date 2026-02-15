import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseNftId,
  formatNftId,
  isValidNftId,
  checksumAddress,
} from '../../src/utilities/nft-id.js';

const VECTORS_DIR = join(__dirname, '../../vectors/agent');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('NftId Golden Vectors', () => {
  const data = loadVectors('nft-id.json');

  describe('valid NftId parsing', () => {
    for (const v of data.valid as Array<{ id: string; input: string; note: string }>) {
      it(`${v.id}: ${v.note}`, () => {
        expect(isValidNftId(v.input)).toBe(true);
        const parsed = parseNftId(v.input);
        expect(parsed.chainId).toBeGreaterThan(0);
        expect(parsed.collection).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(parsed.tokenId).toBeTruthy();
      });
    }
  });

  describe('roundtrip formatting', () => {
    for (const v of data.roundtrip as Array<{
      id: string; chainId: number; collection: string; tokenId: string; expected: string; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const formatted = formatNftId(v.chainId, v.collection, v.tokenId);
        expect(formatted).toBe(v.expected);
        const parsed = parseNftId(formatted);
        expect(parsed.chainId).toBe(v.chainId);
        expect(parsed.tokenId).toBe(v.tokenId);
      });
    }
  });

  describe('EIP-55 checksum', () => {
    for (const v of data.checksum as Array<{ id: string; input: string; expected: string; note: string }>) {
      it(`${v.id}: ${v.note}`, () => {
        expect(checksumAddress(v.input)).toBe(v.expected);
      });
    }
  });

  describe('invalid NftId rejection', () => {
    for (const v of data.invalid as Array<{ id: string; input: string; note: string }>) {
      it(`${v.id}: ${v.note}`, () => {
        expect(isValidNftId(v.input)).toBe(false);
      });
    }

    it('parseNftId throws on invalid input', () => {
      expect(() => parseNftId('not-valid')).toThrow('Invalid NftId');
    });
  });
});
