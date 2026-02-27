## `[freeside]` Cross-Repo Feedback — Cycle 045 CI Rehabilitation + Governance Substrate

**Source**: loa-freeside PRs #97 (E2E Infrastructure), #99 (Governance Substrate), #100 (Staging Integration), #107 (CI Pipeline Rehabilitation)
**Hounfour pin**: `b6e0027a` (v8.2.0 — confirmed working after re-pin from broken `addb0bf`)
**GPT cross-model review**: APPROVED (cycle-045 PRD iteration 2, SDD iteration 3, Sprint iteration 3)

---

### Tier 1 Extraction Witnesses

Freeside provides **production witnesses** for 5 of the 6 P0 items and all 3 Tier 1 patterns identified by dixie.

#### FR-1: GovernedResource\<T\> — 3 Production Witnesses

Freeside's governance substrate (PR #99, 42 files) adopted hounfour's governance primitives as constitutional infrastructure rather than reimplementing locally:

| Witness | File | Pattern |
|---------|------|---------|
| `CreditLotGovernor` | `arrakis-governance.ts:20-41` | `LOT_CONSERVATION = createBalanceConservation()` — ratifies hounfour's invariant definition, enforced at both application layer AND SQL constraint (`available + reserved + consumed = original`) |
| `AmendmentService` | `amendment-service.ts:1-100` | Status machine (proposed → approved → enacted \| rejected \| expired) with 30-day TTL, audit trail integration, and `evaluateGovernanceMutation()` delegation to hounfour |
| `GovernedMutationService` | `governed-mutation-service.ts:76-100` | Atomic coupling of state mutation + audit append in single SERIALIZABLE transaction — the canonical pattern for GovernedResource write path |

**Architectural note**: Freeside's `CreditMutationContext` interface (lines 97-150) extends the governance pattern with `accessPolicy` (required_reputation_state, required_role, min_reputation_score) and `resolveActorId()` (JWT sub priority → service identity fallback → throw). This is a natural candidate for the GovernedResource\<T\> abstract base — it's the mutation context that every governed resource needs.

**Recommendation**: The abstract base should include `MutationContext` as a generic parameter alongside `T`. Dixie's 3 witnesses + freeside's 3 witnesses = 6 production implementations to extract from. The interface is stable.

#### FR-2: EMA Feedback Dampening — Confirming Dixie's Constants

Freeside consumes reputation scores via `routeReputationEvent()` (`arrakis-governance.ts:158-165`) with timestamp validation guard (iter-1 bridgebuilder finding, fixed). We don't compute EMA locally — we delegate to dixie's reputation store.

**However**: Freeside's billing reconciliation (`reconciliation.ts`) uses a similar dampening pattern for cost averaging across billing periods. The `ALPHA_MIN=0.1, ALPHA_MAX=0.5, RAMP_SAMPLES=50` constants dixie proposes would work for both domains. +1 to extracting `computeDampenedScore()` with configurable constants.

#### FR-3: Chain-Bound Hashing — 2 Production Implementations

Freeside imports directly from hounfour:

```typescript
// audit-trail-service.ts
import { computeAuditEntryHash, verifyAuditTrailIntegrity, AUDIT_TRAIL_GENESIS_HASH, buildDomainTag } from '@0xhoneyjar/loa-hounfour/commons';
```

**TOCTOU prevention**: Freeside uses `pg_advisory_xact_lock(advisoryLockKey(domainTag))` to linearize hash chain appends per domain tag. The lock is released at transaction end (SERIALIZABLE isolation). This is the same pattern dixie describes.

**Genesis race prevention**: Freeside's `governed-mutation-service.ts` handles the genesis case by checking `previous_hash IS NULL` count in the same transaction before inserting with `AUDIT_TRAIL_GENESIS_HASH`.

**Evidence for extraction**: Both repos independently converged on identical patterns. The chain-bound hashing utilities should absolutely be promoted to hounfour with the TOCTOU prevention helper.

#### FR-4: Audit Timestamp Validation — Direct Evidence

This was flagged as **HIGH severity** in freeside PR #99 bridgebuilder review (iter-1, `bridge-20260226-6bb222`). The fix: timestamp validation guard at top of `routeReputationEvent()` (lines 158-165) prevents hash chain corruption at I/O boundary.

The bridgebuilder's exact assessment: *"Timestamp validation prevents hash chain corruption at I/O boundary"* — promoted to PRAISE in iter-2.

**Recommendation**: `validateAuditTimestamp(isoString: string): { valid: boolean; normalized: string }` should be a hounfour export. Every consumer needs this at their I/O boundary. Currently each repo rolls their own.

#### FR-6: Advisory Lock Collision Resistance — Birthday Paradox Evidence

Freeside hit this independently. PR #99 bridgebuilder review (iter-1) flagged `hashCode()` collision risk at 32-bit space. The fix (iter-2): **FNV-1a replaces Java-style hashCode** for advisory locks, centralized in `audit-helpers.ts`.

Three independent advisory lock sites in freeside:
1. `event-sourcing-service.ts:236` — per-aggregate linearization
2. `governance-service.ts:288` — per-community governance serialization
3. `audit-trail-service.ts:146` — per-domain-tag hash chain serialization

All three now use the shared `advisoryLockKey()` helper with FNV-1a. Dixie reports the same pattern. This is a clear extraction candidate — `computeAdvisoryLockKey(tag: string): number` with FNV-1a and documented collision bounds.

#### FR-8: Formal Git Tag + Release — Operational Evidence

Freeside's cycle-045 CI rehabilitation (PR #107) was triggered by a **broken commit pin**. The hounfour dependency at `addb0bf` had a broken `dist/` directory that cascaded into ~70% of CI failures across build, lint, and tests. Re-pinning to `b6e0027a` fixed the root cause.

This is the strongest possible argument for formal releases with integrity verification. Commit pins are fragile — a single force-push or broken build artifact breaks all downstream consumers silently. npm releases with checksums prevent this class of failure entirely.

---

### CI Pipeline Patterns (Responding to Finn's FR-5/6/7)

Having just completed full CI rehabilitation on freeside (PR #107 — all 6 quality gates green), some patterns relevant to finn's CI modernization FRs:

#### Security Audit with Known-Unfixable Filtering

The `node-vault → postman-request → form-data/tough-cookie` chain is **unfixable** (node-vault is unmaintained). Freeside's solution: JSON-based `jq` filtering in CI that excludes known unfixable packages while still catching new vulnerabilities:

```bash
KNOWN_UNFIXABLE="form-data|tough-cookie|postman-request|node-vault"
HIGH_CRIT=$(echo "$AUDIT_JSON" | jq -r "
  [.vulnerabilities // {} | to_entries[] |
   select(.value.severity == \"high\" or .value.severity == \"critical\") |
   select(.key | test(\"$KNOWN_UNFIXABLE\") | not) |
   .key] | length
")
```

**If hounfour publishes npm releases (FR-8)**, consumers can drop the commit pin on node-vault entirely and switch to hounfour's exports for vault operations. This would eliminate the unfixable vuln chain for all consumers.

#### Workspace Dependency Resolution in CI

Monorepo CI requires explicit workspace dep installation for aliased imports to resolve. Freeside's vitest workspace aliases (`@arrakis/core → ../../packages/core/`) fail in CI unless `packages/core/node_modules/` exists (opossum CJS `require('./lib/circuit')` breaks). Solution: explicit `npm ci` for each workspace package in CI test job.

This is relevant to finn if it uses similar monorepo aliasing patterns.

---

### Versioning — Supporting v8.3.0 MINOR

Freeside agrees with dixie's recommendation: **v8.3.0 MINOR** for Tier 1 extractions. All 6 FRs from freeside's perspective are purely additive:

- GovernedResource\<T\> interface + abstract base = new export
- `computeDampenedScore()` = new export
- `computeChainBoundHash()` with TOCTOU helper = new export
- `validateAuditTimestamp()` = new export
- `computeAdvisoryLockKey()` = new export
- git tag + npm release = packaging change

Zero breaking changes to existing API. Reserve v9.0.0 for module reorganization.

---

### Migration Plan

When hounfour publishes v8.3.0:

1. **Replace local implementations** (~150 lines deleted):
   - `advisoryLockKey()` from `audit-helpers.ts` → hounfour's `computeAdvisoryLockKey()`
   - Timestamp validation in `routeReputationEvent()` → hounfour's `validateAuditTimestamp()`
   - Genesis hash race prevention logic → hounfour's chain-bound hashing helper

2. **Adopt new abstractions**:
   - `AmendmentService` and `GovernedMutationService` extend `GovernedResource<T>` abstract base
   - `CreditMutationContext` implements hounfour's `MutationContext` interface

3. **Pin to npm release** instead of commit hash — eliminates the class of failure that caused cycle-045.

---

### Remaining Gaps (Not Covered by Current P0 List)

Two patterns observed across freeside bridgebuilder reviews that aren't in the RFC but warrant consideration:

1. **Fail-Closed Default Pattern**: Every governance module in freeside defaults to closed state on error (DynamicContract → `cold`, circuit breaker → reject, AuditTrailNotReady → throw). This was praised across 3 bridgebuilder reviews as "consistent fail-closed philosophy." Should this be a documented protocol-level convention in hounfour?

2. **Deployment Group Orchestration** (bridgebuilder PR #100, Part 4): Cross-service deployment ordering (freeside-first, fail-fast) was identified as missing. Now that all 3 consumers are on v8.2.0, a shared deployment contract (health check schema, readiness gate, rollback trigger) could live in hounfour alongside the protocol schemas.
