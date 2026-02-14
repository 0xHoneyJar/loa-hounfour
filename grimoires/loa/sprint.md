# Sprint Plan: Bridge Iteration 1 — Compatibility & Validation Safety

**Cycle:** cycle-005 (continued) — Bridgebuilder Refinement
**Source:** [Bridgebuilder Review Iteration 1](https://github.com/0xHoneyJar/loa-hounfour/pull/1#issuecomment-3900215158) — BB-C5-001 through BB-C5-015
**Created:** 2026-02-14

---

## Overview

| Property | Value |
|----------|-------|
| **Total sprints** | 1 |
| **Total tasks** | 6 |
| **Scope** | Fix compatibility validator, AccessPolicy validation gaps, test coverage, docs |
| **Team** | 1 AI agent |
| **Quality gates** | Build + Test |

### Findings Backlog

| ID | Severity | Description |
|----|----------|-------------|
| BB-C5-001 | HIGH | validateCompatibility rejects v2.4.0 despite MIN_SUPPORTED_VERSION=2.4.0 |
| BB-C5-015 | HIGH | No test coverage for validateCompatibility |
| BB-C5-002 | MEDIUM | AccessPolicy extraneous field validation gap |
| BB-C5-005 | MEDIUM | Schema-level AccessPolicy gap (same root cause as BB-C5-002) |
| BB-C5-003 | MEDIUM | Unsafe `as BillingEntry` cast in billing pipeline |
| BB-C5-011 | MEDIUM | Migration guide missing role_based mapping |
| BB-C5-006 | LOW | No AccessPolicy pre-built validator |
| BB-C5-007 | LOW | Guard functions accept string instead of AgentLifecycleState |
| BB-C5-012 | LOW | No test for empty string in roles array |
| BB-C5-013 | LOW | Billing pipeline test uses stale contract_version |
| BB-C5-004 | LOW | multiplyBps allows bps=0 without bounds warning |

---

## Sprint 1: Compatibility & Validation Safety

### S1-T1: Fix validateCompatibility Cross-Major Logic (BB-C5-001 + BB-C5-015)

**Description:** Fix the compatibility validator to respect MIN_SUPPORTED_VERSION across major boundaries. Add comprehensive test coverage.

**Files:** `src/validators/compatibility.ts`, `tests/vectors/compatibility.test.ts` (new)

**Changes:**
- Rewrite validateCompatibility: check MIN_SUPPORTED_VERSION floor FIRST, then check major for future versions
- Logic: remote < MIN_SUPPORTED_VERSION → incompatible; remote.major > local.major → incompatible; remote.major < local.major && remote >= min → compatible with warning; same major + minor diff → compatible with warning; match → compatible
- Create `tests/vectors/compatibility.test.ts` with 8+ tests

**Acceptance Criteria:**
- [ ] `validateCompatibility('3.0.0')` → compatible (exact match)
- [ ] `validateCompatibility('2.4.0')` → compatible with warning (cross-major, above min)
- [ ] `validateCompatibility('2.3.0')` → incompatible (below min)
- [ ] `validateCompatibility('4.0.0')` → incompatible (future major)
- [ ] `validateCompatibility('invalid')` → incompatible (bad format)

---

### S1-T2: AccessPolicy Cross-Field Validation — Extraneous Fields (BB-C5-002 + BB-C5-005)

**Description:** Add inverse checks to validateAccessPolicy: warn when duration_hours is set for non-time_limited, or roles for non-role_based. Return warnings alongside errors.

**Files:** `src/schemas/conversation.ts`, `tests/vectors/conversation.test.ts`

**Changes:**
- Update `validateAccessPolicy` return type: `{ valid: boolean; errors: string[]; warnings: string[] }`
- Add: if type !== 'time_limited' && duration_hours present → warning
- Add: if type !== 'role_based' && roles present → warning
- Update validateSealingPolicy to propagate warnings
- Add test for empty-string roles (BB-C5-012)

**Acceptance Criteria:**
- [ ] `{type: 'none', duration_hours: 24}` → valid with warning about extraneous duration_hours
- [ ] `{type: 'none', roles: ['admin']}` → valid with warning about extraneous roles
- [ ] `{type: 'role_based', roles: ['']}` → invalid (minLength: 1 violation)
- [ ] Existing tests still pass

---

### S1-T3: Eliminate Unsafe Cast in Billing Pipeline (BB-C5-003)

**Description:** Remove `as BillingEntry` cast by having validate() return typed data on success path.

**Files:** `src/validators/billing.ts`

**Changes:**
- Use `Value.Decode` from TypeBox or structure the pipeline to extract typed data from compiled check
- Remove `as BillingEntry` cast

**Acceptance Criteria:**
- [ ] No `as` type assertion in billing.ts
- [ ] All billing-pipeline tests still pass
- [ ] TypeScript strict mode passes

---

### S1-T4: Add AccessPolicy Pre-Built Validator (BB-C5-006)

**Description:** Add AccessPolicySchema to the validators object and import.

**Files:** `src/validators/index.ts`

**Changes:**
- Import `AccessPolicySchema` from conversation.ts
- Add `accessPolicy: () => getOrCompile(AccessPolicySchema)` to validators object

**Acceptance Criteria:**
- [ ] `validators.accessPolicy()` returns compiled TypeCheck
- [ ] Build passes

---

### S1-T5: Migration Guide Completeness (BB-C5-011)

**Description:** Add role_based mapping row and note explaining it's new in v3.0.0.

**Files:** `MIGRATION.md`

**Changes:**
- Add row to migration mapping table for role_based
- Note: "New in v3.0.0 — no v2.x equivalent"

---

### S1-T6: Test Hygiene & Documentation (BB-C5-004, BB-C5-007, BB-C5-013)

**Description:** Fix stale test data, add JSDoc to multiplyBps, improve guard typing.

**Files:** `tests/vectors/billing-pipeline.test.ts`, `src/vocabulary/currency.ts`, `src/utilities/lifecycle.ts`

**Changes:**
- Update billing-pipeline.test.ts contract_version to '3.0.0' (BB-C5-013)
- Add JSDoc to multiplyBps noting it has no business range constraints (BB-C5-004)
- Type guard functions with AgentLifecycleState where appropriate (BB-C5-007)

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Build passes
