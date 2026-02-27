# PRD: Hounfour v9 Cross-Repo Extraction + CI Modernization

**Status:** Draft
**Author:** Jani + Claude
**Date:** 2026-02-27
**Cycle:** 037
**References:** [Hounfour PR #39](https://github.com/0xHoneyJar/loa-hounfour/pull/39) · [Hounfour Issue #38](https://github.com/0xHoneyJar/loa-hounfour/issues/38) · [Launch Readiness #66](https://github.com/0xHoneyJar/loa-finn/issues/66) · [Staging Deployment PR #110](https://github.com/0xHoneyJar/loa-finn/pull/110)

---

## 1. Problem Statement

Hounfour PR #39 proposes 21 extraction candidates discovered during cross-repo staging deployment. Six are P0 — protocol hardening that must land before the ecosystem can graduate from staging to production. loa-finn is uniquely positioned to contribute to several of these because it is the *only* repo that exercises the full routing → reputation → audit path at runtime.

Separately, loa-finn's CI pipeline has accumulated technical debt: silent E2E test skips on main, inconsistent GitHub Action versions across workflows, a fragile hounfour dist overlay in Docker, and no lint enforcement despite eslint being installed. The staging deployment (cycle-036) exposed these gaps — PR #109 had all checks failing, and the "green" main branch was green only because cross-repo E2E tests silently skipped.

This cycle addresses both: contribute finn's operational findings back to hounfour v9, and modernize the CI pipeline so that "green means green."

> Source: Hounfour PR #39 §P0 items 1-6, Issue #66 Round 11 Command Deck CI status, PR #110 Bridgebuilder review

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Hounfour v9 P0 contributions from finn | PR comments with `[finn]` prefix on hounfour PR #39 | All 6 P0 items addressed |
| model_performance emission | Finn emits `ReputationEvent.model_performance` after routing decisions | Verified in shadow mode on staging |
| GovernedResource<T> verification | Conformance test validates finn's governance types against hounfour schemas | All pass |
| Audit trail genesis hash verification | Finn's audit chain verified against hounfour's `computeAuditEntryHash` | Chain valid |
| CI green-means-green | All 11 workflows pass or fail explicitly (no silent skips on main) | 0 silent skips |
| Action version consistency | Single SHA per action across all workflows | 0 version inconsistencies |
| Lint enforcement | eslint runs in CI, fails on error | Enabled |
| Hounfour dist validation | Docker build validates dist freshness | Commit hash check |

---

## 3. Users & Stakeholders

| Persona | Need |
|---------|------|
| **Hounfour maintainers** | Receive finn's P0 contributions as structured feedback on PR #39 |
| **Operator (Jani)** | CI that accurately reflects codebase health; staging emits reputation events |
| **Finn (the service)** | Emit model_performance events for the autopoietic loop |
| **Dixie (future consumer)** | Receives well-formed ReputationEvents from finn via the event bus |
| **CI** | All workflows deterministic — pass, fail, or explicitly skip with reason |

---

## 4. Functional Requirements

### FR-1: model_performance Event Emission

Close the autopoietic feedback loop by emitting `ReputationEvent.model_performance` after each routing decision.

**The Loop (from hounfour #38):**
```
Request → Finn routes to model/pool → Model responds → Finn observes quality →
Finn emits model_performance ReputationEvent → (Future: Dixie aggregates) →
(Future: Routing weights updated) → Loop closed
```

**Schema Strategy:**

Hounfour v8.2.0 already exports `ModelPerformanceEvent` and `QualityObservation` types from the governance entrypoint (confirmed in `grimoires/loa/context/hounfour-v8.2.0-exports.md`). The `model_performance` variant is the 4th discriminated union member of `ReputationEvent`. Finn implements against the **installed v8.2.0 schema** — no local schema fork needed.

If the installed version's exports change or Issue #38 lands a breaking revision, finn updates its hounfour pin and adapts. The conformance test (AC6) is the contract enforcement mechanism.

**What finn emits (conforming to hounfour `ModelPerformanceEvent`):**
```typescript
{
  event_id: ulid(),
  agent_id: string,         // NFT token ID (from request.token_id)
  collection_id: string,    // Collection address (from NFT resolution)
  timestamp: ISO8601,
  type: "model_performance",
  model_id: string,         // e.g. "claude-sonnet-4-20250514" (from StreamStart.model)
  provider: string,         // e.g. "anthropic" (from pool config)
  pool_id: string,          // Pool selected by routing (from routingResult.poolId)
  task_type: TaskType,      // From hounfour governance exports (TASK_TYPES enum)
  quality_observation: {    // Conforms to hounfour QualityObservation schema
    score: number,          // [0, 1] — required by hounfour schema
    dimensions: {           // Optional per hounfour schema (pattern: ^[a-z][a-z0-9_]{0,31}$)
      latency: number,      // Normalized: 1 - min(latency_ms / 10000, 1)
      token_efficiency: number // completion_tokens / max(prompt_tokens, 1), capped at 1
    },
    latency_ms: number      // Raw latency (>=0, required by hounfour schema)
  },
  // finn-internal metadata (not part of hounfour canonical schema)
  metadata: {
    trace_id: string,
    contract_version: string,
    was_fallback: boolean,
    shadow: boolean,         // true when FINN_REPUTATION_ROUTING=shadow
    finn_version: string     // finn build version for provenance
  }
}
```

**Identity field semantics:** `agent_id` and `collection_id` follow hounfour's ReputationEvent identity model: `agent_id` is the NFT token ID sourced from the request's `token_id` field (same value passed to `/api/v1/agent/chat`); `collection_id` is the NFT collection contract address from NFT resolution. For non-NFT requests (x402/oracle), `agent_id` is set to `"anonymous"` and `collection_id` to the treasury address.

**`metadata` wrapper:** The `shadow`, `trace_id`, `was_fallback`, and `finn_version` fields are finn-internal context not defined in hounfour's canonical schema. They are placed in a `metadata` object to keep the canonical event body clean. If hounfour v9 adds a standard metadata extension point, finn migrates to it. The `metadata` field is stripped before forwarding events to Dixie (future cycle).

**Where it happens:** After `resolveWithGoodhart()` completes (or deterministic fallback completes), before the response is returned. The event is fire-and-forget (non-blocking on the request path).

**Storage:** Initially stored in Redis as a capped list (`finn:reputation:events:{pool_id}`, max 1000 entries). Future: forwarded to Dixie via HTTP transport when `DIXIE_BASE_URL` is set.

**Acceptance Criteria:**
- AC1: After every routing decision, a `model_performance` event is constructed with all required fields from hounfour's `ModelPerformanceEvent` type
- AC2: Event emission does not add >1ms p99 to request latency (fire-and-forget)
- AC3: Events are stored in Redis with TTL (7 days default)
- AC4: In `disabled` routing mode, no events are emitted
- AC5: In `shadow` mode, `metadata.shadow` is `true`; in `enabled` mode it is `false`
- AC6: Event body (excluding `metadata`) validates against hounfour v8.2.0's `ReputationEventSchema` imported from `@0xhoneyjar/loa-hounfour/governance`

### FR-2: GovernedResource<T> Protocol Verification

Verify that finn's usage of governance types is isomorphic with hounfour's protocol definition.

**Context:** Three repos (finn, dixie, freeside) all import governance types from hounfour. PR #39 P0-2 asks each repo to verify they're using `GovernedResource<T>` correctly — not just importing it, but satisfying the protocol's invariants.

**Two verification mechanisms:**

1. **Static analysis (CI guard):** A grep/tsquery-based check that scans for direct mutations to governed state (bypassing `evaluateGovernanceMutation()`). Runs in CI to catch regressions. Patterns to flag:
   - Direct property assignment on types that extend `GovernedResource<T>`
   - `Object.assign` or spread operators on governed state
   - Missing invariant checks where governed state is created

2. **Runtime conformance tests:** Targeted tests for specific governed state transitions that finn performs (e.g., reputation score updates, pool weight changes). These validate that the transition produces valid output per hounfour's invariant definitions.

**What to verify:**
1. Every type finn imports from `@0xhoneyjar/loa-hounfour/governance` is used correctly
2. Governance mutations go through `evaluateGovernanceMutation()` (not ad-hoc state changes)
3. Invariant checks (`buildBoundedInvariant`, `buildNonNegativeInvariant`, `buildSumInvariant`) are applied where finn manages governed state

**Acceptance Criteria:**
- AC7: Static CI guard that flags direct mutations to governed state types (grep-based, runs in ci.yml)
- AC8: Runtime conformance tests for each governed state transition finn performs (list extracted from `grep -r "from.*loa-hounfour/governance"`)
- AC9: Any violations documented with fix or justification in a `GOVERNANCE-CONFORMANCE.md` report

### FR-3: Audit Trail Genesis Hash Verification

Verify the integrity of finn's audit trail against hounfour's hash chain specification.

**Context:** Finn already uses `computeAuditEntryHash` from hounfour's commons module. PR #39 P0-3 asks each repo to verify their genesis hash and domain separation are correct.

**Genesis seed determinism:** The genesis seed is a compile-time constant defined in code: `FINN_AUDIT_GENESIS_SEED = "finn:audit:genesis:v1"`. This constant is the same across all environments (staging, production). The domain separation prefix `finn:audit:` is prepended to all hash inputs. The resulting genesis hash is deterministic: `SHA-256(finn:audit: + finn:audit:genesis:v1)`. This value is documented in the conformance report and can be independently verified by any repo.

**What to verify:**
1. Finn's audit trail starts with a proper genesis entry (hash of the constant seed, not empty string)
2. Domain separation prefix `finn:audit:` is prepended to all hash inputs
3. Hash chain is contiguous — `verifyAuditTrailIntegrity()` passes on a sample trail
4. Genesis hash is reproducible across environments (same constant → same hash)

**Acceptance Criteria:**
- AC10: Integration test that creates a small audit trail and verifies with `verifyAuditTrailIntegrity()`
- AC11: Genesis hash uses `FINN_AUDIT_GENESIS_SEED` constant with `finn:audit:` domain separation
- AC12: Conformance report documents: (a) the seed constant, (b) the domain prefix, (c) the resulting genesis hash hex value, for cross-repo verification

### FR-4: x402 Schema Verification

Verify that finn's x402 payment schemas conform to hounfour's canonical definitions.

**Context:** PR #39 P0-4 identifies 5 schemas in the payment flow. Finn owns the payment endpoint (`/api/v1/x402/invoke`) and quote generation. The schemas must match across finn (producer) and freeside (consumer).

**Schema availability decision:** Hounfour v8.2.0 does NOT export x402 payment schemas (they are not in the economy or core entrypoints). Therefore this cycle's scope is: (a) document finn's current x402 schemas as the proposed canonical source, (b) open or attach to a hounfour PR adding them, and (c) validate finn's schemas against freeside's consumption patterns (from `grimoires/loa/context/dixie-contract.md`).

**What to verify:**
1. Quote schema (`quote_id`, `model`, `max_cost`, `payment_address`, `chain_id`, `token_address`, `valid_until`)
2. Payment proof schema (`X-Payment` header structure)
3. Settlement record schema (`payment_id`, `quote_id`)
4. Error codes (`PAYMENT_REQUIRED`, `NOT_ALLOWLISTED`, `INFERENCE_FAILED`, `FEATURE_DISABLED`)

**Acceptance Criteria:**
- AC13: Finn's x402 schemas documented as JSON Schema files in `src/x402/schemas/` (quote, payment-proof, settlement, error-codes)
- AC14: Schemas proposed as upstream contribution to hounfour (PR comment on #39 or separate hounfour PR)
- AC15: Error code enum documented; cross-repo match deferred to hounfour adoption (not blockable in this cycle since hounfour doesn't define them yet)

### FR-5: Hounfour v9 PR Feedback

Post structured `[finn]` feedback on hounfour PR #39 covering all P0 items from finn's perspective.

**Acceptance Criteria:**
- AC16: Comment posted on PR #39 with `[finn]` prefix addressing all 6 P0 items
- AC17: Each P0 item classified as additive vs breaking from finn's perspective
- AC18: Include finn-specific evidence (code references, staging observations, test results)

### FR-6: CI Modernization — Green Means Green

Fix silent E2E test skips and standardize the CI pipeline.

**6a: E2E Test Gating**

| Workflow | Current | Fix |
|----------|---------|-----|
| `e2e-v2.yml` | Warns and skips if `ARRAKIS_CHECKOUT_TOKEN` missing | Fail on `main` branch, skip on feature branches with clear annotation |
| `e2e-smoke.yml` | Warns and skips | Same: fail on `main`, skip on feature with annotation |

**6b: Action Version Standardization**

Pin each action to the SHA corresponding to a specific released version (not "latest commit on default branch"). Update only via a deliberate dependency bump PR.

| Action | Current State | Target (release SHA) |
|--------|---------------|--------|
| `actions/checkout` | v4.2.2 and v4.3.1 mixed | Single SHA for v4.3.1 across all workflows |
| `amazon-ecs-render-task-definition` | v1.7.1 and v1.7.2 mixed | Single SHA for v1.7.2 across all workflows |
| All other actions | Already consistent | Verify and document in `ACTION-PINS.md` |

**Source of truth:** A manifest comment block at the top of each workflow file maps action name → release version → SHA. Updates to this manifest are a dedicated PR reviewed for supply chain risk.

**6c: Lint Enforcement**

eslint v9.39.2 is installed but no `lint` script exists and CI doesn't run it.

- Add `"lint": "eslint src/"` to package.json scripts
- Add lint step to ci.yml
- Fix any existing lint errors (expect a batch of fixable issues)

**6d: Hounfour Dist Validation**

The Docker build copies pre-built hounfour dist from local node_modules (workaround for Docker buildkit network isolation). No validation that the dist is fresh.

- Add a commit hash file (`node_modules/@0xhoneyjar/loa-hounfour/.dist-commit`) during `build-hounfour-dist.sh`
- Docker build stage validates the hash file exists and is non-empty
- CI logs the hounfour commit hash for audit trail

**6e: Node.js Version Standardization**

package.json declares `engines.node: ">=22"`. Standardize CI to match.

**Compatibility check (prerequisite):** Before changing matrices, verify:
1. All GitHub-hosted runner images support Node 22 (ubuntu-latest ships Node 20 by default; `actions/setup-node` handles this)
2. pnpm@10.28.0 supports Node 22 (confirmed: pnpm 10.x requires Node >=18)
3. eslint v9.39.2 supports Node 22 (confirmed: eslint 9.x requires Node >=18.18)
4. Composite actions used in workflows don't hard-depend on Node 20 runtime (GitHub Actions node20 runtime is separate from repo code; action runtime version is determined by action.yml, not our matrix)

**Scope:** Only change the Node version for repo code steps (`actions/setup-node`). Action runtime versions (node20 in action.yml) are outside our control.

- Remove Node 18 from `lib-tests.yml` matrix
- Set `actions/setup-node` to Node 22 in all workflows
- Keep `node-version: 22` explicit (not `lts/*` which resolves to 20)

**Acceptance Criteria:**
- AC19: `e2e-v2.yml` and `e2e-smoke.yml` fail (not skip) on main when token is missing
- AC20: All 11 workflows use exactly one release-pinned SHA per GitHub Action (no version drift)
- AC21: `pnpm lint` runs in CI and passes
- AC22: Docker build logs hounfour dist commit hash
- AC23: All `actions/setup-node` steps use `node-version: "22"` (action runtimes excluded — outside our control)
- AC24: `lib-tests.yml` matrix reduced to `[22]` only

---

## 5. Technical & Non-Functional Requirements

**Request-path constraints (for FR-1):**
- model_performance event construction: <0.5ms (in-memory, no network)
- Redis LPUSH for event storage: <1ms p99 (same Redis instance as routing)
- Event emission is fire-and-forget — Redis failure does not affect response
- Events use existing Redis connection (no new connections)

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Event emission p99 overhead | <1ms per request | Histogram: `finn_reputation_event_duration_seconds` |
| CI pipeline total time | <10 minutes for full suite | GitHub Actions timing |
| Lint step duration | <30 seconds | CI timing |
| Hounfour conformance tests | <5 seconds | vitest timing |

---

## 6. Scope

### In Scope
- Emit model_performance ReputationEvents (stored locally in Redis)
- GovernedResource<T> conformance verification tests
- Audit trail genesis hash + domain separation verification
- x402 schema verification (document current, prepare for upstream)
- Post `[finn]` feedback on hounfour PR #39
- CI: E2E gating, action standardization, lint enforcement, dist validation, Node version standardization

### Out of Scope (Future Cycles)
- Forwarding events to Dixie via HTTP (requires `DIXIE_BASE_URL` wiring, separate cycle)
- Cross-model scoring aggregation (lives in Dixie, consumes finn's events)
- Routing weight updates from reputation signals (requires full loop closure with Dixie)
- Proper hounfour git tag/release (PR #39 P0-6 — owned by hounfour maintainers)
- Economic boundary evaluation (PR #39 P0-5 — primarily freeside concern)
- SLSA provenance, SBOM generation, keyless signing (P1 security, future cycle)
- Production deployment (requires graduation from staging)

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hounfour v8.2.0 model_performance export API changes before v9 release | Low | Medium | Conformance test (AC6) catches drift; finn pins to v8.2.0 until v9 is tagged |
| eslint initial run finds hundreds of errors | Medium | Low | Fix auto-fixable, triage rest into separate batch; use `--max-warnings` for gradual adoption |
| E2E gating on main breaks CI until token is configured | Low | High | Verify `ARRAKIS_CHECKOUT_TOKEN` is configured before merging the gating change; add to STAGING-RUNBOOK |
| Conformance tests reveal governance type misuse | Medium | Medium | Document violations in GOVERNANCE-CONFORMANCE.md; fix or justify each |
| Node 22 incompatible with some composite action | Low | Low | Compatibility check task (FR-6e prerequisite) catches this before matrix change |
| x402 schemas proposed upstream get rejected/modified by hounfour maintainers | Medium | Low | Schemas live in finn first; upstream adoption is additive, not blocking |

### Dependencies
- `@0xhoneyjar/loa-hounfour@8.2.0` (already installed; exports `ModelPerformanceEvent`, `QualityObservation`, `ReputationEventSchema`)
- Hounfour PR #39 open for comments
- `ARRAKIS_CHECKOUT_TOKEN` confirmed configured as GitHub repo secret before E2E gating merge
- Staging (finn.armitage.arrakis.community) healthy for shadow-mode event verification

---

## 8. Implementation Notes

### model_performance Event Architecture

The event should be constructed in the routing hot path but emitted asynchronously:

```typescript
// After routing decision (in HounfourRouter or resolveWithGoodhart)
const event: ModelPerformanceEvent = {
  event_id: ulid(),
  agent_id: request.token_id ?? 'anonymous',
  collection_id: request.collectionAddress ?? TREASURY_ADDRESS,
  timestamp: new Date().toISOString(),
  type: 'model_performance',
  model_id: routingResult.selectedModel,  // from StreamStart.model
  provider: routingResult.provider,
  pool_id: routingResult.poolId,
  task_type: inferTaskType(request),      // maps to TASK_TYPES enum
  quality_observation: {
    score: computeNormalizedScore(routingResult),
    dimensions: {
      latency: 1 - Math.min(routingResult.durationMs / 10000, 1),
      token_efficiency: Math.min(
        response.usage.completion_tokens / Math.max(response.usage.prompt_tokens, 1),
        1
      )
    },
    latency_ms: routingResult.durationMs
  },
  metadata: {
    trace_id: request.traceId,
    contract_version: HOUNFOUR_VERSION,
    was_fallback: routingResult.wasFallback,
    shadow: routingMode === 'shadow',
    finn_version: FINN_VERSION
  }
};

// Fire-and-forget — don't await
emitReputationEvent(redis, event).catch(err =>
  console.warn('[finn] reputation event emission failed (non-fatal)', err.message)
);
```

### Redis Storage Pattern

```
Key:    finn:reputation:events:{pool_id}
Type:   List (LPUSH, JSON-serialized event)
TTL:    7 days (configurable via FINN_REPUTATION_EVENT_TTL)
Cap:    1000 entries per pool (LTRIM after LPUSH)
```

### Conformance Test Pattern

```typescript
// tests/conformance/governance.test.ts
import { ReputationEventSchema } from '@0xhoneyjar/loa-hounfour/governance';

test('model_performance event conforms to hounfour schema', () => {
  const event = buildModelPerformanceEvent({ /* test data */ });
  // Validate canonical fields (excluding finn-internal metadata)
  const { metadata, ...canonical } = event;
  expect(validateAgainstSchema(ReputationEventSchema, canonical)).toBe(true);
});
```

### CI Action Version Manifest

Each workflow includes a manifest comment mapping action name → release version → SHA. The actual SHAs used in `uses:` lines must match this manifest. Example format:

```yaml
# Action pins (release-version pinned, update via dedicated PR only):
# actions/checkout      v4.3.1  → 34e1148...
# actions/setup-node    v4.3.0  → cdca736...
# pnpm/action-setup     v4.1.0  → a7487c7...
```

**Note:** The exact SHAs above are illustrative. The implementation task will look up the actual current release SHAs from each action's GitHub releases page and standardize across all 11 workflows.
