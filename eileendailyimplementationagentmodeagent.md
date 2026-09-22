# Eileen Daily Implementation Agent Mode Agent

This repo-local runbook must be read by the daily GPT-5.5 Thinking implementation agent before editing `0xHoneyJar/loa-hounfour`. The agent must decide what should be implemented and why before coding, then write a PR report that traces every commit/file change back to repo value, scaling, security, and simplicity.

## Repository responsibility

`loa-hounfour` owns protocol/schema contracts: TypeBox/JSON Schema, constraint DSL, conformance vectors, cross-language validation, package integrity, and schema-level governance primitives.

It must not own runtime servers, transport layers, model calls, Freeside product behavior, Dixie BFF routes, Finn experiment verdicts, Straylight runtime semantics, Aleph précis doctrine, or Arcturus revenue-oracle logic.

## Eligible input

Implement only from a Daily Deep Research Report or plan-audit item with `PROPOSED_NEXT_LANE_SEED`, candidate ID, repo-fit reasoning, acceptance criteria, rollback path, and `VERDICT: ACCEPT_PLAN`.

Without `VERDICT: ACCEPT_PLAN`, the agent may self-audit only docs, fixtures, tests, checkers, or clearly experimental schema/vector candidates.

## Required pre-implementation thesis

Before editing, write and preserve this analysis:

1. candidate issue, candidate ID, and verdict
2. what should be implemented
3. why it should be implemented now
4. why it belongs in Hounfour and not a sibling repo
5. what this is good for
6. why the implementation path should work
7. how it advances Hounfour's endgame as a portable governance-contract substrate
8. creative future paths not implemented now
9. mass-user scaling impact for validation cost, package consumers, vector volume, schema versioning, and integration drift
10. security scope for malformed input, package integrity, supply-chain, and cross-repo contract risks
11. simplicity argument: how the design avoids hidden runtime complexity
12. non-goals, forbidden surfaces, checks, and rollback

If this thesis is weak, do not implement.

## Additive-only policy

Allowed by default: new docs, conformance vectors, tests, validators/checkers, experimental schema candidates marked as such, and non-canonical examples.

Forbidden without explicit Eileen approval: deleting files, changing canonical schema semantics, renaming public exports, changing package API behavior by default, adding runtime servers or transport behavior, model calls, production migrations, broad refactors, unrelated dependency upgrades, sibling repo mutation, auto-merge, or closing source issues.

## Hounfour-specific stop conditions

Stop with `VERDICT: NEEDS_HUMAN` if the candidate moves runtime or HTTP responsibility into Hounfour, changes existing canonical schema meaning, promotes experimental vectors into canonical contracts without acceptance, weakens cross-field invariants, or introduces model invocation/network transport.

## Implementation steps

1. Read this file, README/package scripts, and nearby docs.
2. Confirm `VERDICT: ACCEPT_PLAN`.
3. Check for duplicate open issues/PRs.
4. Write the required pre-implementation thesis.
5. Create branch `daily-impl/YYYY-MM-DD-loa-hounfour-<candidate>`.
6. Implement exactly one candidate with minimal diff.
7. Prefer explicit schemas/vectors/checks over clever abstractions.
8. Run relevant checks.
9. Open a draft PR.
10. Add `CODEX AUDIT REQUEST` and the traceability report.
11. Comment: `@codex review for additive-only scope violations, schema-semantic regressions, public export changes, scaling risks, security regressions, unnecessary complexity, failing or missing tests, rollback clarity, and repo-boundary violations`.
12. Do not merge or close the source issue.

## Required PR traceability report

Every implementation PR must include source issue and candidate ID, pre-implementation thesis summary, file-by-file change rationale, why each changed file is good for Hounfour, why it advances the repo endgame, why it should work, mass-user scaling analysis, security scope, simplicity analysis, tests/checks, skipped checks, rollback path, future creative paths not implemented, and `CODEX AUDIT REQUEST`.
