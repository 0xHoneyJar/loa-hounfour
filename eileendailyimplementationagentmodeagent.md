# Eileen Daily Implementation Agent Mode Agent

This file is the repo-local runbook for the daily GPT-5.5 Thinking implementation agent. The daily agent prompt must explicitly read this file before editing this repo. This file is intentionally separate from `AGENTS.md`; it is a workflow contract for converting Daily Deep Research Report issues into additive implementation PRs.

## Repository responsibility

`0xHoneyJar/loa-hounfour` owns protocol/schema contracts: TypeBox/JSON Schema, constraint DSL, conformance vectors, cross-language validation, package integrity, and schema-level governance primitives.

This repo is not the place for runtime servers, transport layers, model calls, Freeside product behavior, Dixie BFF routes, Finn experiment verdicts, Straylight runtime semantics, Aleph précis doctrine, or Arcturus revenue-oracle logic.

## Eligible input

Only implement from a Daily Deep Research Report issue or follow-up plan-audit issue/comment that contains:

- `PROPOSED_NEXT_LANE_SEED`
- candidate ID
- repo-fit reasoning
- acceptance criteria
- rollback path
- `VERDICT: ACCEPT_PLAN`

If the candidate lacks `VERDICT: ACCEPT_PLAN`, the agent may perform in-run plan audit only for docs, fixtures, tests, checkers, or explicitly experimental schema/vector candidates.

## Selection rule

Pick at most one candidate per run. Prefer work that strengthens schema clarity, conformance vectors, validation tests, or package integrity without changing existing schema semantics.

Priority order:

1. docs-only schema/governance notes
2. fixture/vector-only additions
3. test-only conformance coverage
4. checker/validator-only additions
5. experimental schema candidates clearly marked non-canonical

## Additive-only policy

Nothing currently working may stop functioning.

Allowed by default:

- new docs
- new conformance vectors
- new tests
- new validators/checkers
- new experimental schema candidates marked as such
- non-canonical examples

Forbidden without explicit Eileen approval:

- deleting files
- changing canonical schema semantics
- renaming public exports
- changing package API behavior by default
- adding runtime servers or transport behavior
- model calls
- production migrations
- broad refactors
- unrelated dependency upgrades
- sibling repo mutation
- auto-merge
- closing source issues

## Hounfour-specific stop conditions

Stop and return `VERDICT: NEEDS_HUMAN` if the candidate would:

- move runtime or HTTP responsibility into Hounfour
- change existing canonical schema meaning
- collapse experimental vectors into canonical contracts without acceptance
- weaken cross-field invariants or constraint evaluation
- introduce model invocation or network transport

## Implementation steps

1. Read this file, README/package scripts, and relevant docs near the target surface.
2. Inspect the source issue and confirm `VERDICT: ACCEPT_PLAN`.
3. Check for obvious duplicate open issues/PRs.
4. Write a short plan: selected candidate, implementation class, allowed files, forbidden surfaces, checks, rollback.
5. Create a branch named `daily-impl/YYYY-MM-DD-loa-hounfour-<candidate>`.
6. Implement exactly one candidate with a minimal diff.
7. Run relevant checks from the repo.
8. Open a draft PR.
9. Add `CODEX AUDIT REQUEST` to the PR body.
10. Comment: `@codex review for additive-only scope violations, schema-semantic regressions, public export changes, failing or missing tests, rollback clarity, repo-boundary violations, and security regressions`.
11. Do not merge and do not close the source issue.

## PR body requirements

The PR must include:

- source issue
- candidate ID
- implementation class
- what changed
- what did not change
- checks run
- skipped or failing checks
- rollback path
- Codex audit request

## Final run report

Report the selected repo, source issue, branch, PR URL, files changed, checks run, Codex review status, blockers, and whether any boundary was approached.
