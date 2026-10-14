/**
 * Shared loader + executor for the reference-verifier conformance suite
 * (`vectors/verifier/`, SDD §5). Used by the vitest suite
 * (tests/integrity/verifier-vectors.test.ts) and by the TS CLI
 * (scripts/verifier-runner.ts) whose manifest the parity harness diffs
 * against the Go CLI.
 *
 * @since v8.8.0 (FR-C2)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { verifyEnvelopeSignatureEd25519, lookupRevocation } from '../../src/integrity/verify.js';
import { verifyAuditTrailIntegrity } from '../../src/commons/audit-trail-hash.js';
import type { AuditTrail } from '../../src/commons/audit-trail.js';
import type { RevocationList } from '../../src/canonical/revocation-list.js';

export const VERIFIER_KINDS = ['audit-trail', 'signature', 'revocation'] as const;
export type VerifierKind = (typeof VERIFIER_KINDS)[number];

export interface VerifierCase {
  case: string;
  kind: VerifierKind;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

export interface VerifierManifestEntry {
  kind: VerifierKind;
  case: string;
  result: unknown;
  matches_expected: boolean;
}

/** Load every case file, sorted by kind then case name. */
export function loadVerifierCases(repoRoot: string): VerifierCase[] {
  const out: VerifierCase[] = [];
  for (const kind of VERIFIER_KINDS) {
    const dir = join(repoRoot, 'vectors', 'verifier', kind);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8')) as VerifierCase;
      if (c.kind !== kind || `${c.case}.json` !== f) {
        throw new Error(`verifier vector ${kind}/${f}: kind/case do not match its path`);
      }
      out.push(c);
    }
  }
  return out;
}

/** Run one case through the TS reference functions and return the raw result. */
export async function runVerifierCase(c: VerifierCase): Promise<unknown> {
  switch (c.kind) {
    case 'audit-trail':
      return verifyAuditTrailIntegrity(c.input.trail as AuditTrail);
    case 'signature':
      return verifyEnvelopeSignatureEd25519(
        c.input.envelope as Record<string, unknown>,
        c.input.public_key as string,
        c.input.options as { signatureField?: string; omitFields?: string[] } | undefined,
      );
    case 'revocation':
      return lookupRevocation(
        c.input.lists as RevocationList[],
        c.input.signer_key_id as string,
        c.input.at as string,
      );
    default:
      throw new Error(`unknown verifier kind ${(c as { kind: string }).kind}`);
  }
}

/** Run the whole suite; JSON round-trips each result so absent ≠ undefined. */
export async function buildVerifierManifest(repoRoot: string): Promise<VerifierManifestEntry[]> {
  const entries: VerifierManifestEntry[] = [];
  for (const c of loadVerifierCases(repoRoot)) {
    const result = JSON.parse(JSON.stringify(await runVerifierCase(c))) as unknown;
    entries.push({ kind: c.kind, case: c.case, result, matches_expected: isDeepStrictEqual(result, c.expected) });
  }
  return entries;
}
