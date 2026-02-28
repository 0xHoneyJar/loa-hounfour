# SDD: Domain Tag Impedance Fix

**Status:** Flatline-reviewed (cycle-002)
**Author:** Claude
**Date:** 2026-02-28
**Cycle:** cycle-002 (hounfour)
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)

---

## 1. Executive Summary

Fix `buildDomainTag()` to produce `validateDomainTag()`-compliant output by adding input validation and sanitization. The fix touches 1 source file (`audit-trail-hash.ts`), updates ~8 test files, and regenerates conformance vectors. Release as v8.4.0 MINOR.

## 2. Architecture

No new modules, files, or dependencies. This is a behavioral fix to an existing function.

### 2.1 Component: `buildDomainTag()` in `src/commons/audit-trail-hash.ts`

**Current implementation (line 28-30):**
```typescript
export function buildDomainTag(schemaId: string, contractVersion: string): string {
  return `loa-commons:audit:${schemaId}:${contractVersion}`;
}
```

**Reference: `validateDomainTag()` in `src/commons/chain-bound-hash.ts`:**

The existing validator enforces this segment grammar (NOT being changed):
```typescript
const DOMAIN_TAG_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/;
// Format: "prefix:namespace:schemaSegment:versionSegment"
// Each segment must match DOMAIN_TAG_SEGMENT
```

The builder's output segments MUST match `DOMAIN_TAG_SEGMENT`. This is the correctness invariant.

**New implementation:**
```typescript
/**
 * Input grammar for schemaId.
 * Allows PascalCase, kebab-case, dot-separated, and colon-containing identifiers.
 * Colons are allowed in input but stripped during sanitization (they are structural
 * delimiters in the domain tag format — Flatline IMP-005).
 */
const SCHEMA_ID_RE = /^[a-zA-Z][a-zA-Z0-9._:-]*$/;

/**
 * Input grammar for contractVersion.
 * Allows semver and semver-like strings (e.g., "8.3.0", "8.3.0-rc.1").
 */
const CONTRACT_VERSION_RE = /^[0-9][a-zA-Z0-9._+-]*$/;

/**
 * Segment sanitizer: lowercase, strip colons, replace dots with hyphens,
 * strip remaining non-[a-z0-9_-] characters.
 *
 * Post-condition: output matches /^[a-z0-9][a-z0-9_-]*$/ (DOMAIN_TAG_SEGMENT)
 * for any input passing the input grammar.
 *
 * Determinism: All operations (toLowerCase, replace, regex) are ASCII-deterministic.
 * The input grammars constrain to ASCII-only characters, so locale-dependent
 * Unicode lowercasing cannot occur.
 */
function sanitizeSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/:/g, '')
    .replace(/\./g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

/**
 * Build the domain tag for audit entry hashing.
 *
 * Sanitization is lossy: different inputs may produce the same tag.
 * - Case folding: "GovernedCredits" → "governedcredits"
 * - Dot-to-hyphen: "8.3.0" → "8-3-0"
 * - Colon stripping: "a:b" → "ab"
 *
 * This is acceptable because schemaIds are controlled identifiers
 * (not user input) and versions follow semver convention. Collisions are
 * detectable at schema registration time. The original schemaId and
 * contractVersion are available in the calling context for forensic tracing.
 *
 * @param schemaId - Schema identifier (e.g., 'GovernedCredits', 'test-store')
 * @param contractVersion - Protocol version (e.g., '8.3.0')
 * @returns Domain tag string that passes validateDomainTag()
 * @throws {TypeError} If schemaId or contractVersion don't match input grammar
 */
export function buildDomainTag(schemaId: string, contractVersion: string): string {
  if (!SCHEMA_ID_RE.test(schemaId)) {
    throw new TypeError(
      `schemaId must match ${SCHEMA_ID_RE} (got "${schemaId}")`,
    );
  }
  if (!CONTRACT_VERSION_RE.test(contractVersion)) {
    throw new TypeError(
      `contractVersion must match ${CONTRACT_VERSION_RE} (got "${contractVersion}")`,
    );
  }
  return `loa-commons:audit:${sanitizeSegment(schemaId)}:${sanitizeSegment(contractVersion)}`;
}
```

### 2.2 Post-Sanitization Invariant (Flatline IMP-005)

For any input passing the input grammar, the sanitized output MUST satisfy:

1. Each segment matches `DOMAIN_TAG_SEGMENT` (`/^[a-z0-9][a-z0-9_-]*$/`)
2. The complete tag passes `validateDomainTag()`
3. The tag contains exactly 4 colon-delimited parts: `prefix:namespace:schema:version`

**Proof sketch:** Given `schemaId` matching `/^[a-zA-Z][a-zA-Z0-9._:-]*$/`:
- After `toLowerCase()`: starts with `[a-z]`, contains `[a-z0-9._:-]`
- After colon strip: contains `[a-z0-9._-]`
- After dot→hyphen: contains `[a-z0-9_-]`
- After final strip: no-op (all chars already valid)
- Result: matches `/^[a-z][a-z0-9_-]*$/` ⊆ `DOMAIN_TAG_SEGMENT`

Given `contractVersion` matching `/^[0-9][a-zA-Z0-9._+-]*$/`:
- After `toLowerCase()`: starts with `[0-9]`, contains `[a-z0-9._+-]`
- After colon strip: no-op (no colons in grammar)
- After dot→hyphen: contains `[a-z0-9_+-]`
- After final strip: `+` removed → contains `[a-z0-9_-]`
- Result: matches `/^[0-9][a-z0-9_-]*$/` ⊆ `DOMAIN_TAG_SEGMENT`

### 2.2 Sanitization Pipeline

```
Input:  schemaId="GovernedCredits", contractVersion="8.3.0"
  |  validate against input grammar (TypeError if invalid)
  |  sanitizeSegment(schemaId)
  |    toLowerCase() -> "governedcredits"
  |    strip colons -> "governedcredits"
  |    dots->hyphens -> "governedcredits"
  |    strip non-[a-z0-9_-] -> "governedcredits"
  |  sanitizeSegment(contractVersion)
  |    toLowerCase() -> "8.3.0"
  |    strip colons -> "8.3.0"
  |    dots->hyphens -> "8-3-0"
  |    strip non-[a-z0-9_-] -> "8-3-0"
  |  interpolate
Output: "loa-commons:audit:governedcredits:8-3-0"
```

### 2.4 Hash Chain Continuity Model

```
                 +-----------------------------------+
                 |    Existing Entries (pre-fix)      |
                 |  hash_domain_tag = unsanitized     |
                 |  entry_hash = f(unsanitized_tag)   |
                 +-----------------+-----------------+
                                   |
              verifyAuditTrailIntegrity()
              reads stored hash_domain_tag
              -> verification UNCHANGED
                                   |
                 +-----------------+-----------------+
                 |    New Entries (post-fix)          |
                 |  hash_domain_tag = sanitized       |
                 |  entry_hash = f(sanitized_tag)     |
                 +-----------------------------------+

  computeAuditEntryHash() does NOT validate -> OK
  computeChainBoundHash() validates -> NOW PASSES
```

**Critical invariant (Flatline SKP-002):** The stored `hash_domain_tag` field IS the epoch marker. Verification logic MUST always read the stored `hash_domain_tag` from the entry and MUST NEVER re-derive the domain tag from schema metadata. This invariant holds for both pre-fix (unsanitized) and post-fix (sanitized) entries.

**Version-boundary behavior (Flatline IMP-002):**

| Scenario | Behavior |
|----------|----------|
| Pre-fix entry verified with `verifyAuditTrailIntegrity()` | Reads stored unsanitized tag → PASSES |
| Post-fix entry verified with `verifyAuditTrailIntegrity()` | Reads stored sanitized tag → PASSES |
| Mixed trail (pre-fix + post-fix entries) | Each entry carries its own tag → PASSES |
| Pre-fix entry re-hashed with new `buildDomainTag()` | Would produce different hash → NOT a valid operation (verification reads stored tag) |
| `computeChainBoundHash()` with new `buildDomainTag()` output | Tag passes `validateDomainTag()` → PASSES |
| `computeChainBoundHash()` with legacy unsanitized tag | Tag fails `validateDomainTag()` → FAILS (expected; legacy tags were never valid) |

## 3. Test Strategy

### 3.1 Unit Tests (`tests/commons/audit-trail-hash.test.ts`)

| Test | Type | Description |
|------|------|-------------|
| Produces sanitized format | Unit | `buildDomainTag('GovernedCredits', '8.0.0')` -> `'loa-commons:audit:governedcredits:8-0-0'` |
| Passes validateDomainTag | Unit | Output always passes validation |
| Rejects empty schemaId | Unit | `buildDomainTag('', '8.0.0')` -> TypeError |
| Rejects invalid schemaId | Unit | `buildDomainTag('123bad', '8.0.0')` -> TypeError (starts with digit) |
| Rejects empty version | Unit | `buildDomainTag('test', '')` -> TypeError |
| Strips colons | Unit | `buildDomainTag('a:b', '8.0.0')` -> `'loa-commons:audit:ab:8-0-0'` |
| Varies by schema id | Unit | Different schemaId -> different tag |
| Varies by version | Unit | Different version -> different tag |
| Builder->validator roundtrip | Property | `forAll(validSchemaId, validVersion) -> validateDomainTag(buildDomainTag(id, ver)).valid === true` |

### 3.2 Integration Tests

| Test | File | Change |
|------|------|--------|
| Chain-bound hash with builder output | `chain-bound-hash.test.ts` | Add test: `computeChainBoundHash(entry, buildDomainTag('test', '8.3.0'), genesis)` succeeds |
| Legacy + new tag mixed trail | `commons-quarantine-flow.test.ts` | Update `DOMAIN_TAG` constant |
| Mutation lifecycle | `commons-mutation-lifecycle.test.ts` | Update `DOMAIN_TAG` constant |
| Property: hash chain | `commons-hash-chain.test.ts` | Update `DOMAIN_TAG` constant |
| Property: checkpoint | `commons-checkpoint.test.ts` | Update `DOMAIN_TAG` constant |

### 3.3 Conformance Vectors

Regenerate all vectors that use `buildDomainTag()` output as domain tag input. Add `domain_tag_format: "v8.4.0-sanitized"` metadata field to affected vectors.

## 4. Release Plan

### 4.1 Version: v8.4.0 (MINOR)

**Rationale for MINOR (not MAJOR):** The function signature is unchanged — same parameters, same return type, same export. The behavioral change (different output strings) is a bug fix: the previous output was invalid per the protocol's own validator. No consumer was successfully using `buildDomainTag()` output with `computeChainBoundHash()` — they all had workarounds. MINOR signals the behavioral change per semver convention (new correct behavior), while MAJOR would imply a contract break (the contract was already broken). This classification was reviewed and accepted in Flatline PRD SKP-002.

**Call-site impact analysis (Flatline SKP-006):** The new `TypeError` for invalid inputs changes `buildDomainTag()` from permissive to validating. Known call sites:

| Consumer | Current Input | Valid? | Impact |
|----------|--------------|--------|--------|
| Finn (`store.ts:143`) | `buildDomainTag('store', '8.3.0')` + `.replace()` | Yes (after removing workaround) | None — remove workaround |
| Dixie (`audit-trail-store.ts:55`) | Local `buildDomainTag()` using `v10` | N/A — uses local copy | Replace with import |
| Hounfour tests | `buildDomainTag('GovernedCredits', '8.0.0')` | Yes | Output changes (expected) |
| Hounfour tests | `buildDomainTag('test-store', '8.1.0')` | Yes | Output changes (expected) |

No known call site passes invalid inputs. The `TypeError` is a safety net, not a behavioral disruption.

### 4.2 Changelog Entry

```markdown
## v8.4.0

### Changed
- `buildDomainTag()` now produces `validateDomainTag()`-compliant output (#41)
  - SchemaId lowercased, dots replaced with hyphens in version, colons stripped
  - Input validation added (TypeError for invalid inputs)
  - Domain tag output format changes (e.g., `GovernedCredits:8.0.0` → `governedcredits:8-0-0`)
  - Existing stored `hash_domain_tag` values are unaffected (verification reads stored tag)

### Migration
- Finn: Remove `.replace(/\./g, "-")` workaround at `store.ts:143`
- Dixie: Replace local `buildDomainTag()` with hounfour import
- Freeside: No workaround deployed; adopt `buildDomainTag()` directly
- All: Conformance vectors regenerated with `domain_tag_format: "v8.4.0-sanitized"` metadata
```

### 4.3 Files Changed (estimated)

| Category | Count |
|----------|-------|
| Source files | 1 (`audit-trail-hash.ts`) |
| Test files | ~8 (unit + integration + property) |
| Vectors | ~10 (regenerated) |
| Build artifacts | `dist/`, `schemas/`, `RELEASE-INTEGRITY.json` |

## 5. Security Considerations

- **No new attack surface** — input validation is strictly tighter than before
- **Lossy transform is documented** — collision risk is theoretical for controlled identifiers; collisions detectable at schema registration time
- **Hash chain integrity preserved** — verification reads stored `hash_domain_tag`, never re-derives from metadata
- **ASCII determinism** — input grammars constrain to ASCII; `toLowerCase()` is deterministic across all JS runtimes for ASCII input (Flatline SKP-005)
- **Domain separation maintained** — colons stripped from input before interpolation prevents structural parsing ambiguity in the 4-part colon-delimited tag format

## 6. Flatline SDD Review Disposition

| ID | Category | Disposition | Rationale |
|----|----------|-------------|-----------|
| IMP-001 | HIGH_CONSENSUS (920) | Integrated | Added validateDomainTag() grammar reference in §2.1 |
| IMP-002 | HIGH_CONSENSUS (858) | Integrated | Added version-boundary compatibility matrix in §2.4 |
| IMP-003 | HIGH_CONSENSUS (765) | Integrated | Fixed changelog: "Changed" not "Fixed", removed "Breaking behavior" label |
| IMP-005 | HIGH_CONSENSUS (783) | Integrated | Added post-sanitization invariant with proof sketch in §2.2 |
| SKP-001 x2 | BLOCKER (920) | Already resolved | PRD Flatline SKP-002: user accepted MINOR; rationale added inline §4.1 |
| SKP-002 | BLOCKER (870) | Accepted | Added critical invariant: stored tag IS epoch marker (§2.4) |
| SKP-002 dup | BLOCKER (890) | Already resolved | PRD Flatline SKP-001: collision risk documented, controlled identifiers |
| SKP-003 | BLOCKER (860) | **Fixed** | Colon contradiction: expanded SCHEMA_ID_RE to allow colons per PRD AC-1.6 |
| SKP-003 dup | BLOCKER (750) | Already resolved | PRD Flatline SKP-001: collision risk documented |
| SKP-004 | BLOCKER (770) | Accepted | Added compatibility matrix in §2.4 |
| SKP-005 | BLOCKER (730) | Accepted | Documented ASCII determinism in §5 and sanitizeSegment JSDoc |
| SKP-005 dup | BLOCKER (720) | Already resolved | PRD §3 covers all known consumers (Finn, Dixie, Freeside) |
| SKP-006 | BLOCKER (710) | Accepted | Added call-site impact analysis in §4.1 |
