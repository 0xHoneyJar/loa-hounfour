# Freeside Governance Substrate PRD — cycle-043

> Full PRD captured from `/home/merlin/Documents/thj/code/loa-freeside/grimoires/loa/archive/2026-02-26-the-governance-substrate/prd.md`
> This is freeside's comprehensive plan for adopting hounfour v8.2.0 as constitutional infrastructure.

## Key Details for Hounfour

### Consumer Adoption Scope
- **10 FRs** covering dependency pin, protocol barrel extension (commons + governance), DynamicContract validation, GovernedCredits, audit trail hash chain, ModelPerformanceEvent handler, contract spec, conformance tests, ADR-001 import guards
- **78+ existing symbols** remain valid in v8.2.0 (verified via `pnpm tsc --noEmit`)
- **New commons symbols** (21+ schemas, 7 conservation law factories, enforcement SDK) to be adopted through protocol barrel

### Protocol Barrel Pattern
All hounfour imports — including `/commons` — MUST go through the protocol barrel (`@arrakis/core/protocol`). App code never imports from `@0xhoneyjar/loa-hounfour/*` directly. Only `themes/sietch/src/packages/core/protocol/index.ts` imports subpaths.

### Phased Version Negotiation (Phase A/B/C)
1. **Phase A**: Freeside upgrades with dual-accept window (`validateCompatibility` accepts `>=7.11.0 <9.0.0`)
2. **Phase B**: loa-finn upgrades to v8.2.0 (separate PR)
3. **Phase C**: Freeside tightens to `>=8.2.0` — BLOCKED until finn upgrades
- Rollback: If finn delays, freeside operates safely in dual-accept mode indefinitely

### Conformance Vector Strategy
- **219 vectors** total (up from 3)
- **P0 vectors** (CI-blocking, <30s): audit trail hash reference, governed resource, reputation event, dynamic contract monotonic — ~40 vectors
- **Full suite** (nightly): All 219 in parallel with cached hounfour dist
- **Clock injection**: All TTL/expiry vectors use injected fixed clock — no `Date.now()`
- **Flake policy**: Vector failures are hard failures (no retry/skip)

### Symbol Delta Checklist (v7.11.0 → v8.2.0)
- All commons foundation schemas: ADOPT
- All governed resources (Credits, Reputation, Freshness): ADOPT
- All hash chain operations: ADOPT
- All dynamic contract schemas + utilities: ADOPT
- All enforcement SDK functions: ADOPT
- ModelPerformanceEventSchema + QualityObservationSchema: ADOPT
- `resetFactoryCounter`: DEFER (testing utility only)

### Contract Spec
- `spec/contracts/contract.json` updated with commons entrypoint
- `CONTRACT_VERSION` updated to 8.2.0
- Dual-accept window during rollout, tightened to `>=8.2.0` post-coordination
