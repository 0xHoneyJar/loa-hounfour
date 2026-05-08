/**
 * Synthetic-violation regression suite for the class-vs-policy
 * boundary lint. Each rule has at least one fixture the lint MUST
 * catch and one fixture that MUST stay clean — the negative case
 * is what protects against false-positive regressions when the
 * patterns get adjusted.
 *
 * @see scripts/check-class-policy-boundary.ts
 * @see docs/adr/ADR-010-class-vs-policy-boundary.md
 */
import { describe, it, expect } from 'vitest';
import {
  checkRule1,
  checkRule2,
  checkRule3SchemaFile,
  checkRule4,
  checkRule5,
  checkRule6,
  RULE_5_ALLOWED_PATH,
  RULE_6_GUARDED_PATH,
} from '../../scripts/check-class-policy-boundary.ts';

const noAllow = () => false;

describe('RULE-1 — exported allow/deny union return types', () => {
  it('flags a function returning an allow|deny union outside src/validators/', () => {
    const content = `export function decide(x: number): 'allow' | 'deny' { return 'allow'; }\n`;
    expect(checkRule1('src/governance/decider.ts', content, noAllow)).toHaveLength(1);
  });

  it('flags returns containing rejected / verified / needs_review', () => {
    const content = `export function evaluate(): 'verified' | 'rejected' | 'needs_review' {\n  return 'verified';\n}\n`;
    expect(checkRule1('src/governance/check.ts', content, noAllow)).toHaveLength(1);
  });

  it('does not flag files under src/validators/', () => {
    const content = `export function check(): 'allow' | 'deny' { return 'allow'; }\n`;
    expect(checkRule1('src/validators/index.ts', content, noAllow)).toHaveLength(0);
  });

  it('does not flag legitimate ValidationResult shapes', () => {
    const content = `export function validate(): { valid: boolean; errors: string[] } { return { valid: true, errors: [] }; }\n`;
    expect(checkRule1('src/governance/check.ts', content, noAllow)).toHaveLength(0);
  });

  it('respects allowlist for an explicit waiver', () => {
    const content = `export function decide(): 'allow' | 'deny' { return 'allow'; }\n`;
    const allowed = (rule: string, path: string) =>
      rule === 'RULE-1' && path === 'src/utilities/access-policy.ts';
    expect(checkRule1('src/utilities/access-policy.ts', content, allowed)).toHaveLength(0);
  });
});

describe('RULE-2 — signature-verification crypto imports', () => {
  it('flags @noble/hashes/ed25519 import', () => {
    const content = `import { ed25519 } from '@noble/hashes/ed25519.js';\n`;
    expect(checkRule2('src/economy/signer.ts', content, noAllow)).toHaveLength(1);
  });

  it('flags @noble/hashes/secp256k1 import', () => {
    const content = `import { secp256k1 } from '@noble/hashes/secp256k1';\n`;
    expect(checkRule2('src/economy/signer.ts', content, noAllow)).toHaveLength(1);
  });

  it('does not flag SHA-256 imports', () => {
    const content = `import { sha256 } from '@noble/hashes/sha2.js';\n`;
    expect(checkRule2('src/commons/hash.ts', content, noAllow)).toHaveLength(0);
  });

  it('does not flag @noble/hashes/utils', () => {
    const content = `import { bytesToHex } from '@noble/hashes/utils.js';\n`;
    expect(checkRule2('src/commons/hash.ts', content, noAllow)).toHaveLength(0);
  });
});

describe('RULE-3 — verifier/evaluator/engine/matcher in $id names', () => {
  it('flags top-level $id ending in Evaluator', () => {
    const content = JSON.stringify({ $id: 'PolicyEvaluator', type: 'object' });
    expect(checkRule3SchemaFile('schemas/policy-evaluator.schema.json', content, noAllow)).toHaveLength(1);
  });

  it('flags inner $id ending in Verifier', () => {
    const content = JSON.stringify({
      $id: 'PolicyShape',
      properties: { v: { $id: 'CryptoVerifier', type: 'object' } },
    });
    expect(checkRule3SchemaFile('schemas/policy-shape.schema.json', content, noAllow)).toHaveLength(1);
  });

  it('flags Engine and Matcher patterns', () => {
    const a = JSON.stringify({ $id: 'StateEngine' });
    const b = JSON.stringify({ $id: 'PatternMatcher' });
    expect(checkRule3SchemaFile('schemas/a.schema.json', a, noAllow)).toHaveLength(1);
    expect(checkRule3SchemaFile('schemas/b.schema.json', b, noAllow)).toHaveLength(1);
  });

  it('does not flag versioned $id URIs that look fine', () => {
    const content = JSON.stringify({
      $id: 'https://schemas.0xhoneyjar.com/loa-hounfour/8.5.0/access-decision',
    });
    expect(checkRule3SchemaFile('schemas/access-decision.schema.json', content, noAllow)).toHaveLength(0);
  });

  it('does not flag legitimate names without forbidden suffixes', () => {
    const content = JSON.stringify({ $id: 'AccessDecision', type: 'object' });
    expect(checkRule3SchemaFile('schemas/access-decision.schema.json', content, noAllow)).toHaveLength(0);
  });
});

describe('RULE-4 — assertValid against crypto-bearing schemas (G1)', () => {
  it('flags assertValid(SignatureEnvelopeSchema, ...) call site', () => {
    const content = `assertValid(SignatureEnvelopeSchema, payload);\n`;
    expect(checkRule4('tests/economy/sig.test.ts', content, noAllow)).toHaveLength(1);
  });

  it('flags assertValid against the four crypto-bearing schemas', () => {
    const content = [
      `assertValid(SignatureEnvelopeSchema, p);`,
      `assertValid(RecallReceiptSchema, p);`,
      `assertValid(CommitmentRootSchema, p);`,
      `assertValid(AssertionSchema, p);`,
    ].join('\n');
    expect(checkRule4('tests/recall/recall.test.ts', content, noAllow)).toHaveLength(4);
  });

  it('does not flag assertStructurallyValid against the same schemas', () => {
    const content = `assertStructurallyValid(SignatureEnvelopeSchema, p);\n`;
    expect(checkRule4('tests/economy/sig.test.ts', content, noAllow)).toHaveLength(0);
  });

  it('does not flag assertValid against non-crypto-bearing schemas', () => {
    const content = `assertValid(BillingEntrySchema, p);\n`;
    expect(checkRule4('tests/economy/billing.test.ts', content, noAllow)).toHaveLength(0);
  });

  it('does not flag the pattern when it appears inside a // comment', () => {
    const content = `// assertValid(SignatureEnvelopeSchema, p) — discussed below\nconst x = 1;\n`;
    expect(checkRule4('tests/recall/recall.test.ts', content, noAllow)).toHaveLength(0);
  });

  it('does not flag the pattern when it appears inside a JSDoc block', () => {
    const content = ` * assertValid(SignatureEnvelopeSchema, p) — wrong shape per ADR-010.\n`;
    expect(checkRule4('tests/recall/recall.test.ts', content, noAllow)).toHaveLength(0);
  });
});

describe("RULE-5 — direct 'canonicalize' import outside safe-canonicalize.ts (G3)", () => {
  it('flags from-import in arbitrary src/ file', () => {
    const content = `import _canonicalize from 'canonicalize';\n`;
    expect(checkRule5('src/economy/sig.ts', content, noAllow)).toHaveLength(1);
  });

  it('flags require()-style import', () => {
    const content = `const c = require('canonicalize');\n`;
    expect(checkRule5('src/economy/sig.ts', content, noAllow)).toHaveLength(1);
  });

  it('does not flag the sanctioned wrapper itself', () => {
    const content = `import _canonicalize from 'canonicalize';\n`;
    expect(checkRule5(RULE_5_ALLOWED_PATH, content, noAllow)).toHaveLength(0);
  });

  it('does not flag mention inside a comment', () => {
    const content = `// from 'canonicalize' is restricted to safe-canonicalize.ts.\nconst x = 1;\n`;
    expect(checkRule5('src/economy/sig.ts', content, noAllow)).toHaveLength(0);
  });

  it('respects allowlist for legacy callers', () => {
    const content = `import _canonicalize from 'canonicalize';\n`;
    const allowed = (rule: string, path: string) =>
      rule === 'RULE-5' && path === 'src/utilities/signature.ts';
    expect(checkRule5('src/utilities/signature.ts', content, allowed)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// RULE-6 — canonicalize/hash re-exports from src/integrity/index.ts (CT-01)
// ---------------------------------------------------------------------------
//
// Added in cycle-005 / v8.6.0 (PR-A3.0) to make the CT-01 hybrid carve-out
// explicit: re-exporting `safeCanonicalize` from @0xhoneyjar/loa-hounfour/integrity
// is allowed under @experimental governance per
// docs/architecture/canonicalization-spec-v8.6.md, but any other canonicalize-
// or hash-named re-export added later must either carry @experimental in the
// preceding comment block or be path-allowlisted.

describe('RULE-6 — canonicalize/hash re-exports require @experimental annotation', () => {
  it('does not flag a re-export that has @experimental in a // comment block', () => {
    const content = `
// safeCanonicalize is the v8.5.0 helper.
//
// @experimental — surface governed by canonicalization-spec-v8.6.md, not semver.
export {
  safeCanonicalize,
} from '../utilities/safe-canonicalize.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(0);
  });

  it('does not flag a re-export that has @experimental in a JSDoc block', () => {
    const content = `
/**
 * Canonicalization helper.
 * @experimental
 */
export { safeCanonicalize } from '../utilities/safe-canonicalize.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(0);
  });

  it('flags a canonicalize re-export without an annotation', () => {
    const content = `
// Plain re-export — stable governance, no carve-out tag.
export { canonicalizeForHash } from './hash-helper.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(1);
  });

  it('flags a Canonicalize-prefixed re-export without an annotation', () => {
    const content = `export { CanonicalizeHelper } from './helper.js';\n`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(1);
  });

  it('does not flag generic hash exports (CT-01 narrows to canonicalize only)', () => {
    // Pre-existing v8.5.x exports like computeReqHash / EMPTY_BODY_HASH are
    // stable utilities; RULE-6 deliberately does not police them.
    const content = `export { computeHash, EMPTY_BODY_HASH } from './req-hash.js';\n`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(0);
  });

  it('does not flag re-exports of unrelated names', () => {
    const content = `export { someOtherSymbol } from './elsewhere.js';\n`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(0);
  });

  it('only applies to src/integrity/index.ts (other paths ignored)', () => {
    const content = `export { canonicalizeAnything } from './x.js';\n`;
    expect(checkRule6('src/utilities/index.ts', content, noAllow)).toHaveLength(0);
    expect(checkRule6('src/integrity/some-other-file.ts', content, noAllow)).toHaveLength(0);
  });

  it('handles type-prefixed and aliased exports correctly', () => {
    const contentWithTag = `
// @experimental tagged group export
export {
  safeCanonicalize,
  type SafeCanonicalizeOptions,
  CanonicalizeKeyCollisionError as CanonError,
} from '../utilities/safe-canonicalize.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, contentWithTag, noAllow)).toHaveLength(0);

    const contentWithoutTag = `
export {
  safeCanonicalize,
  type SafeCanonicalizeOptions,
} from '../utilities/safe-canonicalize.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, contentWithoutTag, noAllow)).toHaveLength(1);
  });

  it('respects path allowlist', () => {
    const content = `export { canonicalizeNew } from './new.js';\n`;
    const allowed = (rule: string, path: string) =>
      rule === 'RULE-6' && path === RULE_6_GUARDED_PATH;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, allowed)).toHaveLength(0);
  });

  it('flags multiple non-tagged canonicalize blocks independently', () => {
    const content = `
export { canonicalizeOne } from './a.js';
export { canonicalizeTwo } from './b.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(2);
  });

  // F-001 — adjacency hardening. A distant `@experimental` comment block
  // separated from the export by intervening *code* (not just blank/comment
  // lines) must NOT authorize the re-export. The annotation contract is
  // between a comment block and the export *immediately following* it.
  it('does NOT accept @experimental from a distant non-adjacent comment block', () => {
    const content = `
// @experimental — this comment authorizes nothing in particular.
export { unrelatedSymbol } from './unrelated.js';

const intervening = 1;

export { canonicalizeNew } from './new.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(1);
  });

  it('accepts @experimental in a comment block separated only by blank lines', () => {
    const content = `
// @experimental — surface governed by canonicalization-spec-v8.6.md.


export { safeCanonicalize } from '../utilities/safe-canonicalize.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(0);
  });

  // F-002 — namespace re-exports bypass per-name inspection and are
  // forbidden in the guarded path entirely.
  it('flags `export * from` even when no canonicalize name appears literally', () => {
    const content = `export * from './some-module.js';\n`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(1);
  });

  it('flags `export * as ns from` namespace alias re-exports', () => {
    const content = `export * as integrity from './some-module.js';\n`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(1);
  });

  it('does not flag namespace re-exports in non-guarded paths', () => {
    const content = `export * from './a.js';\nexport * as ns from './b.js';\n`;
    expect(checkRule6('src/utilities/index.ts', content, noAllow)).toHaveLength(0);
  });

  // F-003 (iter-2) — type-only re-exports. `export type { } from` was a
  // bypass for the original regex; a canonicalize-named type-only re-export
  // without an annotation must still be flagged.
  it('flags `export type { } from` re-exports of canonicalize-named types', () => {
    const content = `export type { CanonicalizeOptions } from '../utilities/safe-canonicalize.js';\n`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(1);
  });

  it('accepts `export type { } from` when @experimental is adjacent', () => {
    const content = `
// @experimental — type-only re-export under canonicalization-spec governance.
export type { CanonicalizeOptions } from '../utilities/safe-canonicalize.js';
`;
    expect(checkRule6(RULE_6_GUARDED_PATH, content, noAllow)).toHaveLength(0);
  });
});
