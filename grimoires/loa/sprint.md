# Sprint Plan: Domain Tag Impedance Fix

**Cycle:** cycle-002 (hounfour)
**PRD:** [grimoires/loa/prd.md](prd.md)
**SDD:** [grimoires/loa/sdd.md](sdd.md)
**Branch:** `fix/domain-tag-impedance`
**Version:** v8.4.0 (MINOR)

---

## Overview

Single-sprint cycle. The fix touches 1 source file, ~8 test files, and ~1 conformance vector. Scope is deliberately minimal — this is a surgical behavioral fix, not a feature build.

**Team:** 1 AI developer (Claude)
**Baseline:** 6,628 tests passing, 0 failures

---

## Sprint 1: Domain Tag Sanitization Fix

**Goal:** Fix `buildDomainTag()` to produce `validateDomainTag()`-compliant output, update all affected tests and vectors, build release artifacts.

**Success criteria:** All 6,628+ tests pass, `buildDomainTag()` output always passes `validateDomainTag()`, conformance vectors regenerated.

---

### Task 1.1: Implement `buildDomainTag()` sanitization

**Priority:** P0 (blocks all other tasks)
**File:** `src/commons/audit-trail-hash.ts`
**FR:** FR-1 (AC-1.1 through AC-1.7)

**Description:**
Replace the current passthrough `buildDomainTag()` with the sanitized version per SDD §2.1:

1. Add `SCHEMA_ID_RE` (`/^[a-zA-Z][a-zA-Z0-9._:-]*$/`) and `CONTRACT_VERSION_RE` (`/^[0-9][a-zA-Z0-9._+-]*$/`) input grammar regexes
2. Add `sanitizeSegment()` helper: `toLowerCase()` → strip colons → dots-to-hyphens → strip non-`[a-z0-9_-]`
3. Add input validation with `TypeError` for non-matching inputs
4. Add JSDoc with collision risk documentation (AC-1.7)
5. Keep `computeAuditEntryHash()` and `verifyAuditTrailIntegrity()` unchanged

**Acceptance Criteria:**
- [ ] `buildDomainTag('GovernedCredits', '8.0.0')` → `'loa-commons:audit:governedcredits:8-0-0'`
- [ ] `buildDomainTag('test-store', '8.3.0')` → `'loa-commons:audit:test-store:8-3-0'`
- [ ] `buildDomainTag('', '8.0.0')` → `TypeError`
- [ ] `buildDomainTag('123bad', '8.0.0')` → `TypeError`
- [ ] `buildDomainTag('a:b', '8.0.0')` → `'loa-commons:audit:ab:8-0-0'`
- [ ] JSDoc documents lossy collision risk
- [ ] `computeAuditEntryHash` and `verifyAuditTrailIntegrity` untouched

**Pre-implementation step (Flatline SKP-004):** Before coding, run `grep -rn 'GovernedCredits:8.0.0\|sha256:[a-f0-9]\{64\}' tests/ vectors/` to map every hardcoded hash and domain tag string. Document blast radius.

**Estimated effort:** Small (1 function + 1 helper + 2 regexes)
**Dependencies:** None

---

### Task 1.2: Update `buildDomainTag` unit tests

**Priority:** P0 (validates core fix)
**File:** `tests/commons/audit-trail-hash.test.ts`
**FR:** FR-1 (AC-1.1 through AC-1.6), FR-3 (AC-3.1)

**Description:**
Update existing tests and add new tests for the sanitized `buildDomainTag()`:

1. Update `DOMAIN_TAG` constant from `'loa-commons:audit:GovernedCredits:8.0.0'` to use `buildDomainTag('GovernedCredits', '8.0.0')` (computed, not hardcoded)
2. Update "produces correct format" test to expect sanitized output (AC-3.1)
3. Add test: "passes validateDomainTag" — import `validateDomainTag` from chain-bound-hash and verify output passes
4. Add test: "rejects empty schemaId" → `TypeError` (AC-1.5)
5. Add test: "rejects invalid schemaId (digit start)" → `TypeError`
6. Add test: "rejects empty version" → `TypeError`
7. Add test: "strips colons" → `buildDomainTag('a:b', '8.0.0')` produces expected output (AC-1.6)
8. Add test: "documents collision behavior" — verify `buildDomainTag('a.b', '1.0.0')` and `buildDomainTag('a-b', '1-0-0')` produce identical tags (Flatline IMP-004: codify lossy collision behavior)
9. Add test: "verifies old-format tag backward compatibility" — build entry with hardcoded legacy tag `'loa-commons:audit:GovernedCredits:8.0.0'`, verify `verifyAuditTrailIntegrity()` passes (Flatline IMP-003: backward verification fixture)
10. Add edge-case tests (Flatline IMP-002): max-length schemaId (31 chars), single-char schemaId (`'a'`), version with `+` build metadata (`'8.3.0+build1'`), version with `-rc` prerelease (`'8.3.0-rc.1'`)
11. Existing "varies by schema id" and "varies by version" tests remain
12. Update `makeEntry()` helper to use new DOMAIN_TAG value
13. All existing `verifyAuditTrailIntegrity` tests must still pass (they use stored `hash_domain_tag` — FR-2)

**Acceptance Criteria:**
- [ ] All new unit tests pass
- [ ] Existing `computeAuditEntryHash` tests pass (DOMAIN_TAG constant updated)
- [ ] Existing `verifyAuditTrailIntegrity` tests pass (entries carry their own tag)
- [ ] `validateDomainTag` roundtrip verified

**Estimated effort:** Medium (update ~10 test cases, add ~5 new)
**Dependencies:** Task 1.1

---

### Task 1.3: Add builder→validator property test

**Priority:** P1
**File:** `tests/commons/audit-trail-hash.test.ts` (new describe block)
**FR:** FR-1 (AC-1.4), FR-3 (AC-3.3)

**Description:**
Add property-based test using fast-check to verify the post-sanitization invariant:

```typescript
import fc from 'fast-check';

// Constrained generators matching input grammar
const validSchemaId = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9._:-]{0,30}$/);
const validVersion = fc.stringMatching(/^[0-9][a-zA-Z0-9._+-]{0,20}$/);

it('builder output always passes validator (property)', () => {
  fc.assert(
    fc.property(validSchemaId, validVersion, (id, ver) => {
      const tag = buildDomainTag(id, ver);
      const result = validateDomainTag(tag);
      return result.valid === true;
    }),
    { numRuns: 500 }
  );
});
```

**Acceptance Criteria:**
- [ ] Property test passes with 500 runs
- [ ] Generators match the input grammar from SDD §2.1

**Estimated effort:** Small
**Dependencies:** Task 1.1

---

### Task 1.4: Add chain-bound hash integration test

**Priority:** P1
**File:** `tests/commons/chain-bound-hash.test.ts`
**FR:** FR-2 (AC-2.1 through AC-2.4)

**Description:**
Add integration test verifying that `buildDomainTag()` output works with `computeChainBoundHash()`:

1. Add test: `computeChainBoundHash(entry, buildDomainTag('test', '8.3.0'), genesis)` succeeds
2. This proves the impedance mismatch is fixed end-to-end

**Acceptance Criteria:**
- [ ] `computeChainBoundHash()` succeeds with `buildDomainTag()` output (no validation rejection)
- [ ] Existing `chain-bound-hash` tests still pass

**Estimated effort:** Small (1-2 tests)
**Dependencies:** Task 1.1

---

### Task 1.5: Update integration and property test DOMAIN_TAG constants

**Priority:** P1
**Files:**
- `tests/integration/commons-quarantine-flow.test.ts` (line 34)
- `tests/integration/commons-mutation-lifecycle.test.ts` (line 33)
- `tests/properties/commons-hash-chain.test.ts` (line 24)
- `tests/properties/commons-checkpoint.test.ts` (line 18)
- `tests/commons/audit-trail-checkpoint.test.ts` (line 17)

**FR:** FR-3 (AC-3.4)

**Description:**
These tests call `buildDomainTag()` to create their `DOMAIN_TAG` constant. Since `buildDomainTag()` output changes, the tags used in these tests change automatically. However:

1. All hash computations in these tests use `computeAuditEntryHash(entry, DOMAIN_TAG)` — they pass their DOMAIN_TAG to the hash function, so the hashes will be recomputed correctly
2. `verifyAuditTrailIntegrity()` reads the stored `hash_domain_tag` from entries — entries are created with the new DOMAIN_TAG, so verification will use the new tag
3. No hardcoded hash values should break (they're computed, not pinned)

**Action:** Run all tests after Task 1.1 to verify they pass. If any hardcoded hash assertions exist, update them.

**Acceptance Criteria:**
- [ ] `commons-quarantine-flow.test.ts` passes
- [ ] `commons-mutation-lifecycle.test.ts` passes
- [ ] `commons-hash-chain.test.ts` passes
- [ ] `commons-checkpoint.test.ts` passes
- [ ] `audit-trail-checkpoint.test.ts` passes

**Estimated effort:** Small (likely zero-change if hashes are computed not pinned; investigate if any fail)
**Dependencies:** Task 1.1

---

### Task 1.6: Update conformance vectors

**Priority:** P1
**File:** `vectors/conformance/commons/audit-trail/hash-reference-vector.json`
**FR:** FR-3 (AC-3.2)

**Description:**
The conformance vector pins exact hash values computed with the old domain tag. Update:

1. Preserve the old vector as `hash-reference-vector-v8.3.0-legacy.json` for consumers that pin legacy format (Flatline SKP-005)
2. Update main vector `domain_tag` field from `"loa-commons:audit:GovernedCredits:8.0.0"` to `"loa-commons:audit:governedcredits:8-0-0"`
3. Recompute `entry_hash` with the new domain tag
4. Add `"domain_tag_format": "v8.4.0-sanitized"` metadata field (Flatline IMP-006)
5. Verify vector test passes with updated values

**Acceptance Criteria:**
- [ ] Legacy vector preserved as separate file
- [ ] Main vector `domain_tag` updated to sanitized format
- [ ] Main vector `entry_hash` recomputed and updated
- [ ] `domain_tag_format` metadata field added
- [ ] Vector test passes

**Estimated effort:** Small
**Dependencies:** Task 1.1

---

### Task 1.7: Build artifacts and release preparation

**Priority:** P2 (final task)
**FR:** FR-3 (AC-3.4)

**Description:**
Regenerate all build artifacts and verify full test suite:

1. Run `npm run build` — compile TypeScript
2. Run `npm run schema:generate` — regenerate JSON Schema files (if `buildDomainTag` affects schema metadata)
3. Run full test suite: `npm run test` — verify all 6,628+ tests pass
4. Verify `dist/` output is clean
5. Update `RELEASE-INTEGRITY.json` if the build process regenerates it

**Acceptance Criteria:**
- [ ] TypeScript compiles cleanly (zero errors)
- [ ] All 6,628+ tests pass
- [ ] `dist/` artifacts generated
- [ ] No regressions

**Estimated effort:** Small (automated)
**Dependencies:** Tasks 1.1–1.6

---

## Task Dependency Graph

```
Task 1.1 (implement fix)
  ├── Task 1.2 (unit tests)           ← depends on 1.1
  ├── Task 1.3 (property test)        ← depends on 1.1
  ├── Task 1.4 (integration test)     ← depends on 1.1
  ├── Task 1.5 (update constants)     ← depends on 1.1
  └── Task 1.6 (update vectors)       ← depends on 1.1
         └── Task 1.7 (build/release) ← depends on 1.1–1.6
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Hardcoded hash values in tests break | Run full suite after 1.1; most tests compute hashes dynamically |
| Conformance vector consumers fail | Vector includes `domain_tag_format` metadata for version pinning |
| Unexpected test file uses `buildDomainTag` | Full grep before implementation to find all references |
| Property test generator too broad | Constrain generators to match SDD §2.1 input grammar exactly |

## Rollback Trigger (Flatline IMP-001)

If any of these conditions are observed after merge:
1. `verifyAuditTrailIntegrity()` fails on an existing production trail
2. More than 2 consumers report unexpected breakage from `^8.x` auto-upgrade
3. A domain tag collision is discovered between production schema IDs

**Rollback procedure:** Revert the single commit on `src/commons/audit-trail-hash.ts`. All other changes (tests, vectors) depend on the source change and will be reverted together. No data migration is needed because verification reads stored tags.

## Out of Scope (This Sprint)

- Consumer workaround removal (Finn, Dixie) — tracked in their repos
- `validateDomainTag()` changes — stays strict
- `computeAuditEntryHash()` changes — no validation added
- Version bump in `package.json` — deferred to release commit
- CHANGELOG.md update — deferred to release commit
- GitHub issue/PR management (FR-4) — post-merge activity

## Flatline Sprint Review Disposition

| ID | Category | Disposition | Rationale |
|----|----------|-------------|-----------|
| IMP-001 | HIGH_CONSENSUS (855) | Integrated | Added rollback trigger and procedure section |
| IMP-002 | HIGH_CONSENSUS (885) | Integrated | Added edge-case tests to Task 1.2 |
| IMP-003 | HIGH_CONSENSUS (840) | Integrated | Added backward verification fixture to Task 1.2 |
| IMP-004 | HIGH_CONSENSUS (820) | Integrated | Added collision behavior test to Task 1.2 |
| SKP-001 x2 | BLOCKER (920) | Already resolved | PRD SKP-001: collision risk documented, controlled identifiers |
| SKP-002 x2 | BLOCKER (880/890) | Already resolved | PRD SKP-002, SDD §4.1: MINOR accepted with rationale |
| SKP-003 x2 | BLOCKER (870/760) | Already resolved | SDD §2.4: compatibility matrix with mixed-trail behavior |
| SKP-004 x2 | BLOCKER (750/710) | Accepted | Added pre-implementation grep step to Task 1.1 |
| SKP-005 | BLOCKER (720) | Accepted | Legacy vector preserved as separate file in Task 1.6 |
