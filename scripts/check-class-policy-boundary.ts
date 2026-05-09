#!/usr/bin/env tsx
/**
 * Class-vs-policy boundary structural lint (ADR-010).
 *
 * Six rules block accidental crossings of the boundary that ADR-010
 * draws between hounfour (ships shape) and consumers (ship authority):
 *
 *   RULE-1: src TS — exported function returning a union containing
 *           'allow' | 'deny' | 'needs_review' | 'verified' | 'rejected'.
 *           Allowlisted: src/validators/.
 *   RULE-2: src TS — import from @noble/hashes/{ed25519,secp256k1}
 *           or any signature-verification subpath. SHA-256 OK.
 *   RULE-3: schemas JSON — top-level $id matching '*Evaluator',
 *           '*Verifier', '*Engine', '*Matcher'.
 *   RULE-4: tests TS — assertValid() against crypto-bearing schemas.
 *           Required: assertStructurallyValid() or
 *           assertCryptoBearingFailsByDefault().
 *   RULE-5: src + tests TS — direct import from the 'canonicalize'
 *           package. Allowed only in src/utilities/safe-canonicalize.ts.
 *   RULE-6: src/integrity/index.ts — re-exports whose names contain
 *           "canonicaliz" must carry an @experimental annotation in the
 *           comment block directly above the export, or be path-
 *           allowlisted. Enforces CT-01 hybrid carve-out from cycle-005:
 *           the existing safeCanonicalize re-export is allowed under
 *           @experimental governance per
 *           docs/architecture/canonicalization-spec-v8.6.md; any future
 *           canonicalization helper re-export requires explicit ADR-010
 *           deliberation. Hash-named re-exports (computeReqHash, etc.)
 *           are stable utilities and deliberately NOT policed here.
 *
 * Allowlist: scripts/check-class-policy-boundary.allowlist.json.
 *
 * @see docs/adr/ADR-010-class-vs-policy-boundary.md
 * @since v8.5.0 (PR-A2.1; G1 + G3 additions per discovery run-2)
 * @since v8.6.0 (PR-A3.0; RULE-6 added per CT-01 hybrid)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Public types — exported for tests/scripts/check-class-policy-boundary.test.ts
// ---------------------------------------------------------------------------

export type RuleId = 'RULE-1' | 'RULE-2' | 'RULE-3' | 'RULE-4' | 'RULE-5' | 'RULE-6';

export interface Violation {
  rule: RuleId;
  path: string;
  line?: number;
  excerpt: string;
}

export interface AllowlistEntry {
  path: string;
  rule: string;
  reason: string;
}

export interface Allowlist {
  $comment?: string;
  entries: AllowlistEntry[];
}

export type AllowlistChecker = (rule: RuleId, path: string) => boolean;

export const RULE_DOC_LINK = 'docs/adr/ADR-010-class-vs-policy-boundary.md';

export const RULE_5_ALLOWED_PATH = posix.normalize('src/utilities/safe-canonicalize.ts');
export const RULE_6_GUARDED_PATH = posix.normalize('src/integrity/index.ts');

const RULE_FINDING_LINK: Record<RuleId, string> = {
  'RULE-1': RULE_DOC_LINK + ' (RULE-1 / no-go invariants 1, 3, 4)',
  'RULE-2': RULE_DOC_LINK + ' (RULE-2 / no-go invariant 2)',
  'RULE-3': RULE_DOC_LINK + ' (RULE-3 / naming hygiene)',
  'RULE-4': RULE_DOC_LINK + ' (RULE-4 / G1 safe-by-default crypto-bearing API)',
  'RULE-5': RULE_DOC_LINK + ' (RULE-5 / G3 canonicalize-cap bypass prevention)',
  'RULE-6': RULE_DOC_LINK + ' (RULE-6 / CT-01 hybrid carve-out @experimental governance)',
};

// ---------------------------------------------------------------------------
// Rule patterns
// ---------------------------------------------------------------------------

const RULE_1_FORBIDDEN_LITERALS = ['allow', 'deny', 'needs_review', 'verified', 'rejected'];
const RULE_1_PATTERN = new RegExp(
  String.raw`^\s*export\s+function\s+\w+[^{;]*?:\s*[^{;]*?['"](?:${RULE_1_FORBIDDEN_LITERALS.join('|')})['"]`,
  'm',
);

const RULE_2_PATTERN =
  /from\s+['"]@noble\/hashes\/(ed25519|secp256k1|p256|p384|p521|bls12-381|bn254)/g;

const RULE_3_PATTERN = /(?:Evaluator|Verifier|Engine|Matcher)$/;

// Exported so the determinism property test in
// tests/properties/crypto-bearing-flag-determinism.test.ts can assert set-
// equality between this list and the schemas actually flagged
// `'x-crypto-bearing': true` in the TypeBox source. The hard-coded list and
// the runtime discovery MUST agree — silent drift here is exactly the
// scenario RULE-4 is designed to prevent.
export const RULE_4_CRYPTO_BEARING_NAMES = [
  'SignatureEnvelopeSchema',
  'RecallReceiptSchema',
  'CommitmentRootSchema',
  'AssertionSchema',
  // v8.6.0 PR-A3.4 — FR-B2 PhaseCompletionEnvelope (Tier-1 + Tier-2).
  'PhaseCompletionEnvelopeTier1Schema',
  'PhaseCompletionEnvelopeSchema',
  // v8.6.0 PR-A3.6 — FR-B9 PlanSignoffEnvelope (x-crypto-bearing).
  'PlanSignoffEnvelopeSchema',
  // v8.6.0 PR-A3.7 — FR-A1 Challenge layer (x-crypto-bearing).
  'ChallengeSchema',
];
const RULE_4_PATTERN = new RegExp(
  String.raw`assertValid\s*\(\s*(?:${RULE_4_CRYPTO_BEARING_NAMES.join('|')})\b`,
  'g',
);

const RULE_5_PATTERN = /(?:from|require\()\s*['"]canonicalize['"]/g;

// RULE-6: re-exports from src/integrity/index.ts whose names match
// /canonicaliz/i must have @experimental in the preceding comment block.
// The pattern is narrow on purpose — CT-01 is specifically about
// canonicalization-helper exports, not arbitrary hash-named symbols (which
// are stable utilities under v8.5.x semver). Pattern matches the canonical
// English-and-American spellings.
// Matches both `export { ... } from '...'` and the type-only re-export form
// `export type { ... } from '...'`. The optional `type` keyword sits between
// `export` and `{`. ASI-omitted-semicolon variants are not matched — the
// codebase consistently terminates exports with semicolons.
const RULE_6_EXPORT_BLOCK_PATTERN = /^export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"][^'"]+['"]\s*;/gm;
const RULE_6_BARRED_NAME_PATTERN = /canonicaliz/i;
// `export * from '...'` and `export * as ns from '...'` are forbidden in
// the guarded path entirely: they bypass name-level inspection, so a
// re-export targeting a module that contains a `canonicalize`-named symbol
// (now or later) silently slips through RULE-6's annotation check. The
// carve-out is for *individually named, individually annotated* symbols.
const RULE_6_NAMESPACE_REEXPORT_PATTERN =
  /^export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"][^'"]+['"]\s*;/gm;

// ---------------------------------------------------------------------------
// Rule check functions — pure (path, content, allowed) → Violation[]
// ---------------------------------------------------------------------------

function isCommentLine(beforeMatch: string): boolean {
  const lineStart = beforeMatch.lastIndexOf('\n') + 1;
  const lineUpToMatch = beforeMatch.slice(lineStart);
  return /\/\//.test(lineUpToMatch) || /^\s*\*/.test(lineUpToMatch);
}

function lineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

export function checkRule1(path: string, content: string, allowed: AllowlistChecker): Violation[] {
  if (path.startsWith(posix.normalize('src/validators/'))) return [];
  if (allowed('RULE-1', path)) return [];
  const m = content.match(RULE_1_PATTERN);
  if (!m) return [];
  return [
    {
      rule: 'RULE-1',
      path,
      line: lineNumber(content, m.index!),
      excerpt: m[0].split('\n')[0].trim().slice(0, 120),
    },
  ];
}

export function checkRule2(path: string, content: string, allowed: AllowlistChecker): Violation[] {
  if (allowed('RULE-2', path)) return [];
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  RULE_2_PATTERN.lastIndex = 0;
  while ((m = RULE_2_PATTERN.exec(content)) !== null) {
    out.push({ rule: 'RULE-2', path, line: lineNumber(content, m.index), excerpt: m[0] });
  }
  return out;
}

export function checkRule3SchemaFile(
  path: string,
  content: string,
  allowed: AllowlistChecker,
): Violation[] {
  if (allowed('RULE-3', path)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const out: Violation[] = [];
  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const id = obj.$id;
    if (typeof id === 'string') {
      const name = id.includes('/') ? id.split('/').pop()! : id;
      if (RULE_3_PATTERN.test(name)) {
        out.push({ rule: 'RULE-3', path, excerpt: `$id="${id}"` });
      }
    }
    for (const v of Object.values(obj)) visit(v);
  }
  visit(parsed);
  return out;
}

export function checkRule4(path: string, content: string, allowed: AllowlistChecker): Violation[] {
  if (allowed('RULE-4', path)) return [];
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  RULE_4_PATTERN.lastIndex = 0;
  while ((m = RULE_4_PATTERN.exec(content)) !== null) {
    if (isCommentLine(content.slice(0, m.index))) continue;
    out.push({ rule: 'RULE-4', path, line: lineNumber(content, m.index), excerpt: m[0] });
  }
  return out;
}

export function checkRule5(path: string, content: string, allowed: AllowlistChecker): Violation[] {
  if (path === RULE_5_ALLOWED_PATH) return [];
  if (allowed('RULE-5', path)) return [];
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  RULE_5_PATTERN.lastIndex = 0;
  while ((m = RULE_5_PATTERN.exec(content)) !== null) {
    if (isCommentLine(content.slice(0, m.index))) continue;
    out.push({ rule: 'RULE-5', path, line: lineNumber(content, m.index), excerpt: m[0] });
  }
  return out;
}

// Strip a comma-separated `export { … }` body into individual binding names.
// Handles `type` prefix and `as` aliases; preserves the source name (the part
// the export refers to in the imported module).
function parseExportNames(body: string): string[] {
  return body
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      // `type Foo` -> `Foo`; `Foo as Bar` -> `Foo`.
      const withoutType = trimmed.replace(/^type\s+/, '');
      const sourceName = withoutType.split(/\s+as\s+/)[0].trim();
      return sourceName;
    })
    .filter(Boolean);
}

// True if the @experimental tag sits in a comment block that is **directly
// adjacent** to the export at `endIndex` — i.e. only blank lines and other
// comment lines separate the tag from the export. A distant unrelated
// comment block elsewhere in the file does NOT authorize a re-export.
//
// We walk lines backward from the export. The first non-blank line we
// encounter must be a comment line. Within the contiguous comment-line
// run that immediately precedes the export, we look for `@experimental`.
// As soon as we hit a line that is neither blank nor a comment, the
// adjacent block has ended without finding the tag.
function hasExperimentalAnnotationBefore(content: string, endIndex: number): boolean {
  const before = content.slice(0, endIndex);
  const lines = before.split('\n');
  // Drop the partial line at the export start (split returns an empty/partial
  // tail when content ends mid-line; for adjacency we only care about the
  // lines strictly above).
  if (!lines[lines.length - 1].trim().length) lines.pop();
  let inComment = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      // Blank line — allowed inside or between comment blocks; if we have
      // not yet entered a comment block, treat as continuation.
      continue;
    }
    const isComment =
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*/') ||
      trimmed.startsWith('*');
    if (!isComment) {
      // First non-blank, non-comment line above — adjacency window closed.
      return false;
    }
    inComment = true;
    if (/@experimental\b/.test(trimmed)) return true;
  }
  // Reached top of file scanning the adjacent comment run without finding
  // the tag (or never entered a comment run at all). `inComment` tracks the
  // distinction for any future caller that wants to differentiate them; for
  // this rule both outcomes are "annotation absent".
  void inComment;
  return false;
}

export function checkRule6(path: string, content: string, allowed: AllowlistChecker): Violation[] {
  if (path !== RULE_6_GUARDED_PATH) return [];
  if (allowed('RULE-6', path)) return [];
  const out: Violation[] = [];

  // (a) Namespace re-exports are unconditionally forbidden in the guarded
  //     path — they bypass per-name inspection.
  let nm: RegExpExecArray | null;
  RULE_6_NAMESPACE_REEXPORT_PATTERN.lastIndex = 0;
  while ((nm = RULE_6_NAMESPACE_REEXPORT_PATTERN.exec(content)) !== null) {
    out.push({
      rule: 'RULE-6',
      path,
      line: lineNumber(content, nm.index),
      excerpt: `${nm[0].trim()} — namespace re-export forbidden in src/integrity/index.ts (bypasses RULE-6 name inspection)`,
    });
  }

  // (b) Named re-exports must carry @experimental adjacent to the block when
  //     any exported binding name matches /canonicaliz/i.
  let m: RegExpExecArray | null;
  RULE_6_EXPORT_BLOCK_PATTERN.lastIndex = 0;
  while ((m = RULE_6_EXPORT_BLOCK_PATTERN.exec(content)) !== null) {
    const names = parseExportNames(m[1]);
    const flagged = names.filter((n) => RULE_6_BARRED_NAME_PATTERN.test(n));
    if (flagged.length === 0) continue;
    if (hasExperimentalAnnotationBefore(content, m.index)) continue;
    out.push({
      rule: 'RULE-6',
      path,
      line: lineNumber(content, m.index),
      excerpt: `export { ${flagged.join(', ')} } missing @experimental in directly preceding comment block`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI driver — reads filesystem, applies rules, reports.
// ---------------------------------------------------------------------------

function walk(dir: string, predicate: (p: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
      walk(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function makeAllowlistChecker(allowlist: Allowlist): AllowlistChecker {
  return (rule, path) =>
    allowlist.entries.some(
      (e) => e.rule === rule && posix.normalize(e.path) === posix.normalize(path),
    );
}

function isCli(): boolean {
  // tsx invocation sets process.argv[1] to this file's compiled path.
  const target = process.argv[1] ?? '';
  return target.endsWith('check-class-policy-boundary.ts') ||
    target.endsWith('check-class-policy-boundary.js');
}

if (isCli()) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(__dirname, '..');
  const allowlist = JSON.parse(
    readFileSync(join(__dirname, 'check-class-policy-boundary.allowlist.json'), 'utf-8'),
  ) as Allowlist;
  const allowed = makeAllowlistChecker(allowlist);

  const relPath = (absolute: string): string => posix.normalize(relative(repoRoot, absolute));

  const srcFiles = walk(join(repoRoot, 'src'), (p) => p.endsWith('.ts')).map(relPath);
  const testFiles = walk(join(repoRoot, 'tests'), (p) => p.endsWith('.ts')).map(relPath);
  const schemaFiles = walk(join(repoRoot, 'schemas'), (p) => p.endsWith('.json')).map(relPath);

  const violations: Violation[] = [];
  for (const path of srcFiles) {
    const content = readFileSync(join(repoRoot, path), 'utf-8');
    violations.push(...checkRule1(path, content, allowed));
    violations.push(...checkRule2(path, content, allowed));
    violations.push(...checkRule5(path, content, allowed));
    violations.push(...checkRule6(path, content, allowed));
  }
  for (const path of testFiles) {
    const content = readFileSync(join(repoRoot, path), 'utf-8');
    violations.push(...checkRule4(path, content, allowed));
    violations.push(...checkRule5(path, content, allowed));
  }
  for (const path of schemaFiles) {
    const content = readFileSync(join(repoRoot, path), 'utf-8');
    violations.push(...checkRule3SchemaFile(path, content, allowed));
  }

  if (violations.length === 0) {
    console.log(
      `OK: ${srcFiles.length} src/**/*.ts files, ${testFiles.length} tests/**/*.ts files, ` +
        `${schemaFiles.length} schemas/*.json files clean across RULE-1..RULE-6.\n` +
        `Allowlist: ${allowlist.entries.length} entries ` +
        `(see scripts/check-class-policy-boundary.allowlist.json).`,
    );
    process.exit(0);
  }

  console.error(
    `FAIL: ${violations.length} class-vs-policy boundary violation(s). ` +
      `See ${RULE_DOC_LINK} for the rule definitions and the rationale ` +
      `behind each.\n`,
  );
  for (const v of violations) {
    const where = v.line !== undefined ? `${v.path}:${v.line}` : v.path;
    console.error(`  [${v.rule}] ${where} — ${v.excerpt}`);
    console.error(`           see ${RULE_FINDING_LINK[v.rule]}`);
  }
  console.error(
    '\nIf the violation is a deliberate exception, add an entry to ' +
      'scripts/check-class-policy-boundary.allowlist.json with the rule ' +
      'name, the path, and a one-line justification. Allowlist edits are a ' +
      'reviewer-attention signal.',
  );
  process.exit(1);
}
