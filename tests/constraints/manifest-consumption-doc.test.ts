/**
 * v8.8.0 (SDD §3, FR-C4) — drift check: docs/conformance/
 * manifest-consumption-level-1.md must equal the rendering of the contract
 * table plus MIGRATION.md's v9.0.0 flip subsection. Regenerate with
 * `npm run docs:manifest-contract`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MC1_DOC_PATH,
  extractFlipStatement,
  renderManifestContractDoc,
} from '../../scripts/generate-manifest-contract-doc.js';
import {
  UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT,
  UNVERIFIED_OBLIGATION_REASONS,
} from '../../src/constraints/unverified-obligations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(__dirname, '..', '..', 'MIGRATION.md'), 'utf8');

describe('MC-1 doc drift', () => {
  it('the committed doc is byte-identical to the generator output', () => {
    expect(readFileSync(MC1_DOC_PATH, 'utf8')).toBe(renderManifestContractDoc(MIGRATION));
  });

  it('the doc carries one table row per reason, with its judgement', () => {
    const doc = readFileSync(MC1_DOC_PATH, 'utf8');
    for (const reason of UNVERIFIED_OBLIGATION_REASONS) {
      const line = doc.split('\n').find((l) => l.startsWith(`| \`${reason}\` |`));
      expect(line, reason).toBeDefined();
      expect(line).toContain(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason].judgement_requested);
    }
  });

  it('the flip statement is copied verbatim from MIGRATION.md and distinguishes the two defaults', () => {
    const flip = extractFlipStatement(MIGRATION);
    expect(flip).toContain('x-crypto-bearing');
    expect(flip).toContain('x-chain-bearing');
    expect(flip).toContain('already fail closed');
    expect(readFileSync(MC1_DOC_PATH, 'utf8')).toContain(flip);
  });

  it('extractFlipStatement throws when the subsection is missing', () => {
    expect(() => extractFlipStatement('# nothing here')).toThrow(/missing/);
  });

  it('a changed contract row would change the rendering (the check has teeth)', () => {
    const row = UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT.crypto_deferred;
    const rendered = renderManifestContractDoc(MIGRATION);
    expect(rendered).toContain(row.judgement_requested);
    expect(rendered.replace(row.judgement_requested, 'X?')).not.toBe(rendered);
  });
});
