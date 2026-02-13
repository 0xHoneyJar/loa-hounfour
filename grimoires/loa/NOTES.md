# Project Notes

## Learnings

- loa-hounfour v1.1.0 is stable with zero TODOs, 91 golden test vectors, and all PR #61 BridgeBuilder findings integrated
- TypeBox + TypeCompiler pattern works well for lazy-compiled validation — extend for v2.0.0 types
- String-encoded micro-USD (`^[0-9]+$`) prevents floating-point issues across languages — continue this pattern for BillingEntry

## Blockers

- loa-hounfour v2.0.0 is the critical path bottleneck for the entire launch plan (4 repos depend on it)
- Loa framework merge (v1.37.0) brought comprehensive .gitignore but removed some old TS package files from git tracking via upstream patterns — source files still exist on disk

## Observations

- RFC loa-finn#66 is extraordinarily comprehensive (12 comments, canonical launch plan v1.0, Bridgebuilder review, cross-pollination research)
- The project has a "Vercel markup on Terraform" metaphor — infrastructure is 90% done, product experience is 25%
- 5 of 8 agent sovereignty dimensions already built (auth, model prefs, cost accounting, personality, session continuity)
- BillingEntry.recipients[] is the key breaking change from v1.1.0 — multi-party cost attribution from day 1 avoids Stripe-Connect-style rewrite
- Conversations belong to the NFT, not the user — this is a fundamental architectural decision that affects Conversation schema design
