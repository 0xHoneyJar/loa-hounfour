<!-- docs-version: 7.0.0 -->

# Project Notes

## Learnings

- loa-hounfour v1.1.0 is stable with zero TODOs, 91 golden test vectors, and all PR #61 BridgeBuilder findings integrated
- TypeBox + TypeCompiler pattern works well for lazy-compiled validation — extend for v2.0.0 types
- String-encoded micro-USD (`^[0-9]+$`) prevents floating-point issues across languages — continue this pattern for BillingEntry
- `@noble/hashes` requires `.js` extension in imports with `moduleResolution: "NodeNext"` — package exports use subpath `.js` suffixes
- TypeCompiler does NOT validate string formats (date-time, uri) by default — must register via `FormatRegistry.Set()` in validators
- EIP-55 checksumming requires Keccak-256 (NOT NIST SHA3-256) — they differ in padding
- Largest-remainder allocation with BigInt is deterministic and handles rounding without floating-point — tie-break by array index
- `allocateRecipients` MUST validate `share_bps` sums to 10000 and reject negative totals — missed in initial implementation, caught by Bridgebuilder
- Cross-field validation (e.g., encryption_scheme vs key_derivation) cannot be expressed in JSON Schema alone — utility functions like `validateSealingPolicy()` fill this gap
- TypeBox `Type.Intersect` preserves shared type constraints while allowing description overrides — use instead of re-declaring inline patterns (CreditNote BB-C2-004)
- AsyncAPI 3.0 spec generation from TypeBox schemas works well via template literal interpolation of `CONTRACT_VERSION` — generated at build time, not hardcoded
- Cross-language vector runners (Python `jsonschema`, Go `santhosh-tekuri/jsonschema/v6`) validate protocol interoperability — Python runner confirmed 21/21 vectors passing
- `DomainEventBatch` transactional outbox pattern with `minItems: 1` prevents empty batch submission — composition test vectors should always include metadata-carrying events
- `LifecycleTransitionPayload` with mandatory `reason` field (Kubernetes-inspired) significantly improves debugging — forced reasoning at write time pays dividends at read time
- `schemas/index.json` machine-readable registry enables tooling discovery without parsing individual schema files — pair with human-readable README.md for dual audience

## Blockers

- (RESOLVED) loa-hounfour v2.0.0 is implemented on `feature/protocol-types-v2` — PR #1 open as draft, awaiting merge
- (RESOLVED) cycle-010 sprints 6-8 deferred to cycle-011 scope where relevant (billing provenance converges with pricing convergence FR-3)

## Observations

- RFC loa-finn#66 is extraordinarily comprehensive (12 comments, canonical launch plan v1.0, Bridgebuilder review, cross-pollination research)
- The project has a "Vercel markup on Terraform" metaphor — infrastructure is 90% done, product experience is 25%
- 5 of 8 agent sovereignty dimensions already built (auth, model prefs, cost accounting, personality, session continuity)
- BillingEntry.recipients[] is the key breaking change from v1.1.0 — multi-party cost attribution from day 1 avoids Stripe-Connect-style rewrite
- Conversations belong to the NFT, not the user — this is a fundamental architectural decision that affects Conversation schema design
- Run Bridge with 2 Bridgebuilder iterations achieved 93.6% severity reduction (score 47 → 3) — 19 findings addressed across 2 CRITICAL, 5 HIGH, 10 MEDIUM, 5 LOW
- v2.0.0 final state: 169 tests, 15 JSON schemas, 53 files changed, 8 new TypeBox schemas, 7 new error codes
- Run Bridge cycle-002 achieved 100% severity reduction (score 4 → 0) in 1 iteration — 4 LOW findings addressed, 3 PRAISE received
- v2.1.0 final state: 182 tests, 17 JSON schemas, 48 files changed, 23 total findings addressed across both bridge cycles
- Cumulative bridge trajectory: 47 → 3 → 4 → 0 — three consecutive iterations below flatline threshold confirms kaironic termination
- SCHEMA-CHANGELOG.md per-schema evolution tracking (Confluent-inspired) proved valuable for cross-team contract visibility
- Post-flatline Bridgebuilder deep review (BB-V3-001 through BB-V3-018) revealed 13 forward-looking findings at a deeper level of inquiry — flatline means methodology exhaustion, not finding exhaustion
- Metadata namespace conventions (loa.*, x-*, trace.*) should be established before consumers create shadow schemas — Google FieldMask cautionary tale
- DomainEvent typed wrappers (AgentEvent, BillingEvent) have no runtime enforcement — compile-time safety ends at the trust boundary between services
- `parseEncodings` in req-hash.ts has correct code but comments describe the wrong decompression order — documentation-code divergence caught
- Cross-field validation (validateSealingPolicy) is invisible to JSON Schema consumers — Go/Python implementers won't know it exists without reading TypeScript
- LifecycleTransitionPayload reason field should evolve to Kubernetes-style reason_code + reason_message split for machine-parseable event filtering
- Schema deprecation mechanism needed before first field removal — TypeBox supports `deprecated: true` flowing through to JSON Schema
- Event type vocabulary registry would prevent multi-model naming divergence (agent.lifecycle.transitioned vs agent.state.changed)
- Transfer saga compensation path has no protocol representation — DomainEventBatch needs optional saga context for forward vs compensation distinction
- Run Bridge cycle-008 (v4.5.0 Hardening Release) achieved flatline in 3 iterations: score 0.100 → 0.060 → 0.000 — 29 findings addressed, 799 tests, 56 files changed
- BigInt arithmetic for financial conservation checks (CommonsDividend amount_micro sum) catches precision issues that floating-point would miss — always use BigInt for micro-USD validation
- Negative amount_micro in dividend distribution recipients must be explicitly rejected — BigInt sum conservation alone doesn't catch it because negatives can cancel out
- Injectable `now` parameter pattern (`now?: number` defaulting to `Date.now()`) makes temporal logic deterministic in tests — apply to all time-dependent validators
- Cross-field validator discoverability via `x-cross-field-validated: true` schema extension helps consumers know which schemas have validation beyond JSON Schema — pair with `getCrossFieldValidatorSchemas()` utility
- ECONOMY_FLOW vocabulary linking schemas across the three-economy pipeline (Performance → Reputation → Routing → Billing) uses semantic/causal links, not direct foreign keys — document linking_field semantics clearly
- Sanction escalation rules as cross-field warnings (not errors) allows operator override while still flagging deviations — warning-level enforcement is appropriate for policy-configurable behavior
- Bridgebuilder iteration 3 returned ALL PRAISE (5/5) with zero actionable findings — confirms kaironic termination pattern: methodology exhaustion signals diminishing returns
- cycle-010 → cycle-011 transition: "The adapter abstraction wants to be a protocol" (issue #349) is the foundational insight. v5.0.0 built the behavioral contract; v5.1.0 builds the constitutional contract. The missing Ostrom principles (1: boundaries, 4: monitoring, 5: graduated sanctions) map directly to ModelProviderSpec, conformance vectors, and sanction formalization.
- The Kubernetes Conformance Working Group parallel is apt: K8s went from "works" to "trustworthy" when it added conformance testing. Our conformance vectors are that primitive.
- Pricing convergence chain (ModelCapabilities.pricing → CompletionResult.usage.cost_micro → BillingEntry.cost_micro) is a conservation law — the double-entry bookkeeping of the agent economy. `computeCostMicro()` as a pure function makes this auditable.
