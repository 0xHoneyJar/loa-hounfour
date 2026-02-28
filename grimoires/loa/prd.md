# PRD: Domain Tag Impedance Fix

**Status:** Flatline-reviewed (cycle-002)
**Author:** Jani + Claude
**Date:** 2026-02-28
**Cycle:** cycle-002 (hounfour)
**References:** [Issue #41](https://github.com/0xHoneyJar/loa-hounfour/issues/41) · [Finn PR #115 Bridgebuilder Finding #5](https://github.com/0xHoneyJar/loa-finn/pull/115#issuecomment-3976376955) · [v8.3.0 Release](https://github.com/0xHoneyJar/loa-hounfour/releases/tag/v8.3.0)

---

## 1. Problem Statement

`buildDomainTag()` produces domain tags that fail `validateDomainTag()` validation. This creates an impedance mismatch at the boundary between audit entry hashing and chain-bound hashing:

```typescript
const tag = buildDomainTag("test-store", "8.3.0");
// → "loa-commons:audit:test-store:8.3.0"

validateDomainTag(tag);
// → { valid: false } — dots in "8.3.0" rejected by segment regex
```

Since `computeChainBoundHash()` calls `validateDomainTag()` internally, **chain-bound hashing fails** with any domain tag produced by the builder.

The Bridgebuilder review of finn PR #115 rated this HIGH severity and drew a Mars Climate Orbiter analogy: "one function speaks metric, the other imperial."

### Scope: Two Impedance Vectors

**Vector 1 — Dots in version segment (reported in issue #41):**
- `buildDomainTag("store", "8.3.0")` → segment `8.3.0` fails `/^[a-z0-9][a-z0-9_-]*$/`
- Affects all consumers passing semver versions

**Vector 2 — Uppercase in schemaId segment (discovered during analysis):**
- `buildDomainTag("GovernedCredits", "8.0.0")` → segment `GovernedCredits` fails lowercase regex
- Affects hounfour's own internal tests and any consumer using PascalCase schema IDs
- Currently latent (no consumer passes uppercase tags to `computeChainBoundHash()`) but would bite the first one to try

### Consumer Workarounds Already Deployed

| Consumer | Workaround | Location |
|----------|-----------|----------|
| **Finn** | `.replace(/\./g, "-")` on every `buildDomainTag()` call | `src/cron/store.ts:143` (has `TODO(hounfour#41)`) |
| **Dixie** | Local `buildDomainTag()` using `v10` (no dots), `isLegacyDomainTag()` version dispatch | `app/src/services/audit-trail-store.ts:55` |
| **Dixie** | ADR-006 migration plan for legacy → canonical hash format | `docs/adr/006-chain-bound-hash-migration.md` |

> Sources: finn store.ts:138-143, dixie audit-trail-store.ts:50-57, issue #41

## 2. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| `buildDomainTag()` output always passes `validateDomainTag()` | Zero validation failures when piping builder → validator |
| Zero consumer workarounds required | Finn removes `.replace()`, dixie removes local `buildDomainTag()` |
| Existing hash chains remain verifiable | `verifyAuditTrailIntegrity()` passes on all existing trails (stored `hash_domain_tag` is authoritative) |
| Backward-compatible release | MINOR semver (v8.4.0) — behavioral output change warrants MINOR despite being a bug fix (Flatline SKP-002) |

## 3. Stakeholders

| Persona | Interest |
|---------|----------|
| **Finn** (loa-finn) | Remove `TODO(hounfour#41)` workaround, simplify store.ts |
| **Dixie** (loa-dixie) | Remove local `buildDomainTag()` and `isLegacyDomainTag()` dispatch |
| **Freeside** (loa-freeside) | Adopt chain-bound hashing without workaround |
| **Future consumers** | Call `buildDomainTag()` + `computeChainBoundHash()` without surprise |

## 4. Functional Requirements

### FR-1: buildDomainTag() Sanitization + Input Validation

`buildDomainTag(schemaId, contractVersion)` MUST produce output that passes `validateDomainTag()`.

**Input grammar (Flatline IMP-001, SKP-003):**
- `schemaId`: `/^[a-zA-Z][a-zA-Z0-9._:-]*$/` — PascalCase, kebab-case, dot-separated, or colon-containing identifiers (colons stripped during sanitization per IMP-005)
- `contractVersion`: `/^[0-9][a-zA-Z0-9._+-]*$/` — semver or semver-like strings (e.g., `8.3.0`, `8.3.0-rc.1`)
- Inputs not matching the grammar MUST throw `TypeError` with descriptive message

**Sanitization rules applied before interpolation:**
1. Lowercase the `schemaId` segment
2. Replace dots with hyphens in the `contractVersion` segment
3. Strip colons from both segments (colons are structural delimiters — Flatline IMP-005)
4. Strip any remaining characters not matching `/[a-z0-9_-]/`

**Collision risk documentation (Flatline SKP-001):**
Sanitization is a lossy transform. Different inputs can produce the same output:
- `"GovernedCredits"` and `"governedcredits"` → same tag (case folding)
- `"8.3.0"` and `"8-3-0"` → same tag (dot-to-hyphen)

This is acceptable because:
- SchemaIds are controlled identifiers (not user input) — collisions are detectable at registration time
- Version segments use semver convention — `8-3-0` is not a real semver string
- The original `schemaId` and `contractVersion` are available in the calling context for forensic tracing

**Before:**
```typescript
buildDomainTag("GovernedCredits", "8.3.0")
// → "loa-commons:audit:GovernedCredits:8.3.0"  ← FAILS validation
```

**After:**
```typescript
buildDomainTag("GovernedCredits", "8.3.0")
// → "loa-commons:audit:governedcredits:8-3-0"  ← PASSES validation

buildDomainTag("", "8.3.0")
// → TypeError: schemaId must match /^[a-zA-Z][a-zA-Z0-9._-]*$/

buildDomainTag("store:name", "8.3.0")
// → "loa-commons:audit:storename:8-3-0"  ← colons stripped
```

**Acceptance Criteria:**
- AC-1.1: `buildDomainTag(id, ver)` always passes `validateDomainTag()` for inputs matching the defined grammar
- AC-1.2: Dots in version are replaced with hyphens
- AC-1.3: SchemaId is lowercased
- AC-1.4: Property test: `forAll(validSchemaId, validVersion) → validateDomainTag(buildDomainTag(schemaId, version)).valid === true`
- AC-1.5: `buildDomainTag("", "8.0.0")` throws `TypeError` (Flatline SKP-003)
- AC-1.6: `buildDomainTag("a:b", "8.0.0")` strips colons → `"loa-commons:audit:ab:8-0-0"` (Flatline IMP-005)
- AC-1.7: Collision risk documented in JSDoc (Flatline SKP-001)

### FR-2: Hash Chain Continuity

Existing audit trails MUST remain verifiable after the fix.

**Key insight:** `verifyAuditTrailIntegrity()` reads `entry.hash_domain_tag` from the stored entry — it does NOT re-call `buildDomainTag()`. Therefore:
- Old entries retain their original (unsanitized) `hash_domain_tag` → verification unchanged
- New entries use the sanitized tag → verification works with the new tag
- No migration needed for existing data

**Acceptance Criteria:**
- AC-2.1: `verifyAuditTrailIntegrity()` passes on audit trails containing entries with legacy (unsanitized) domain tags
- AC-2.2: `verifyAuditTrailIntegrity()` passes on audit trails containing entries with new (sanitized) domain tags
- AC-2.3: Mixed trails (legacy + new entries) verify correctly
- AC-2.4: `computeAuditEntryHash()` continues to work with both legacy and sanitized tags (it does not call `validateDomainTag()`)

### FR-3: Test and Vector Updates

Existing tests and conformance vectors that assert exact `buildDomainTag()` output MUST be updated.

**Acceptance Criteria:**
- AC-3.1: `buildDomainTag('GovernedCredits', '8.0.0')` test updated to expect `'loa-commons:audit:governedcredits:8-0-0'`
- AC-3.2: Hash vectors regenerated with new domain tag format; vectors include `domain_tag_version` metadata field for consumer pinning (Flatline IMP-006)
- AC-3.3: Property test added: builder → validator roundtrip (with constrained generators matching input grammar)
- AC-3.4: All existing tests pass (6,628+)

### FR-4: Consumer Notification

Downstream consumers MUST be notified to remove their workarounds.

**Acceptance Criteria:**
- AC-4.1: Issue #41 closed with fix reference
- AC-4.2: Comment on finn issue #113 noting workaround removal opportunity
- AC-4.3: Comment on dixie issue #63 noting local `buildDomainTag()` removal opportunity

## 5. Technical Analysis

### 5.1 Why Sanitize in Builder (Option 1)

The issue proposed two options. We choose Option 1 (sanitize in builder) because:

1. **Strict validation preserved** — `validateDomainTag()` continues to enforce segment format
2. **Correct by construction** — impossible to produce an invalid tag from the builder
3. **Single fix point** — one function change, all consumers benefit
4. **No validation regex relaxation** — dots in segments could theoretically collide with future delimiter changes

### 5.2 Hash Determinism Analysis

**`computeAuditEntryHash(entry, domainTag)`** — takes domainTag as a parameter, stores it in `hash_domain_tag`. The tag is an INPUT to the hash, not derived. Changing `buildDomainTag()` means:
- New entries get a different tag → different hash (expected)
- Old entries keep their stored tag → same hash (no breakage)
- `verifyAuditTrailIntegrity()` reads the stored tag → unaffected

**`computeChainBoundHash(entry, domainTag, prev)`** — validates tag then hashes. After fix:
- `buildDomainTag()` output passes validation → no more rejection
- Hash is deterministic given the (now-sanitized) tag

**Conformance vectors** — test vectors that pin exact hash values will need regeneration because the domain tag input changes. This is expected and correct.

### 5.3 Files in Scope

| File | Change |
|------|--------|
| `src/commons/audit-trail-hash.ts` | Sanitize `buildDomainTag()` — lowercase schemaId, dot-to-hyphen version |
| `tests/commons/audit-trail-hash.test.ts` | Update expected values, add roundtrip property test |
| `tests/commons/chain-bound-hash.test.ts` | Verify builder output works with chain-bound hash |
| `tests/properties/commons-hash-chain.test.ts` | Update domain tag constant |
| `tests/properties/commons-checkpoint.test.ts` | Update domain tag constant |
| `tests/integration/commons-quarantine-flow.test.ts` | Update domain tag constant |
| `tests/integration/commons-mutation-lifecycle.test.ts` | Update domain tag constant |
| `vectors/` | Regenerate affected conformance vectors |
| `schemas/` | Regenerate (if `buildDomainTag` appears in schema metadata) |
| `RELEASE-INTEGRITY.json` | Regenerate |

### 5.4 Versioning

**v8.4.0 (MINOR)** — while this is a bug fix, the behavioral change in `buildDomainTag()` output changes domain tag strings, which changes all downstream hash values. Consumers that pin conformance vectors or compare exact tag strings across services will observe different values. Per Flatline SKP-002, this warrants MINOR to signal the behavioral change.

The function signature is unchanged. No new exports. But output values change — MINOR is the honest semver classification.

## 6. Scope

### In Scope
- Fix `buildDomainTag()` sanitization
- Update all affected tests and vectors
- Notify downstream consumers

### Out of Scope
- Changing `validateDomainTag()` regex (stays strict)
- Migrating existing consumer audit trails (not needed — stored tags are authoritative)
- `computeAuditEntryHash()` changes (it doesn't validate tags)
- Consumer-side workaround removal (tracked in their respective issues)

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Conformance vector consumers break on updated vectors | Low | Medium | Vectors include domain tag in metadata; consumers match on tag value |
| Consumer assumes exact `buildDomainTag()` output format | Low | Low | All consumers already have workarounds; fix removes need for them |
| PascalCase lowercasing surprises a consumer | Low | Low | No consumer currently passes PascalCase to chain-bound path |
| Sanitization creates tag collisions (Flatline SKP-001) | Very Low | Medium | SchemaIds are controlled identifiers, not user input; collisions detectable at registration time |
| Lossy transform prevents forensic reconstruction (Flatline SKP-004) | Low | Low | Original schemaId/version available in calling context; stored `hash_domain_tag` is authoritative |

## 8. Flatline Review Disposition

| ID | Category | Disposition | Rationale |
|----|----------|-------------|-----------|
| IMP-001 | HIGH_CONSENSUS | Integrated | Defined explicit input grammar for buildDomainTag |
| IMP-006 | HIGH_CONSENSUS | Integrated | Added vector metadata field for consumer pinning |
| IMP-002 | DISPUTED | Skipped | Idempotency is nice-to-have, not essential for this fix |
| IMP-005 | DISPUTED | Accepted | Colon stripping prevents structural parsing ambiguity |
| IMP-008 | DISPUTED | Skipped | Rule ordering doesn't materially affect output currently |
| SKP-001 | BLOCKER (910) | Accepted | Collision risk documented; controlled identifiers mitigate |
| SKP-002 | BLOCKER (860) | Accepted | Bumped to v8.4.0 MINOR |
| SKP-003 | BLOCKER (760) | Accepted | Defined explicit input grammar with validation |
| SKP-004 | BLOCKER (710) | Noted | Lossy transform documented; original fields available in context |
