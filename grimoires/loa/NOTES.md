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

## Blockers

- (RESOLVED) loa-hounfour v2.0.0 is implemented on `feature/protocol-types-v2` — PR #1 open as draft, awaiting merge

## Observations

- RFC loa-finn#66 is extraordinarily comprehensive (12 comments, canonical launch plan v1.0, Bridgebuilder review, cross-pollination research)
- The project has a "Vercel markup on Terraform" metaphor — infrastructure is 90% done, product experience is 25%
- 5 of 8 agent sovereignty dimensions already built (auth, model prefs, cost accounting, personality, session continuity)
- BillingEntry.recipients[] is the key breaking change from v1.1.0 — multi-party cost attribution from day 1 avoids Stripe-Connect-style rewrite
- Conversations belong to the NFT, not the user — this is a fundamental architectural decision that affects Conversation schema design
- Run Bridge with 2 Bridgebuilder iterations achieved 93.6% severity reduction (score 47 → 3) — 19 findings addressed across 2 CRITICAL, 5 HIGH, 10 MEDIUM, 5 LOW
- v2.0.0 final state: 169 tests, 15 JSON schemas, 53 files changed, 8 new TypeBox schemas, 7 new error codes
