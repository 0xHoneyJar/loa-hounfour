# Audit lane: Validator determinism and contract enforcement

## Purpose

This draft PR distills Hounfour's validator, format, cache, cross-field, warning-severity, and schema-wiring issues into one implementation lane. It is a bounded reliability lane and does not claim the full validator issue cluster is complete unless the linked issue acceptance criteria are satisfied.

## Issue coverage

Refs #121, #122, #123, #124, #125, #126, #127, #129, #130, #131, #136, #137, #138, #139, #141, #143, #144, #147, #148, #151, #152, #153, #154, #157, #158, #160, #165.

## Preserved state

Preserve existing Hounfour package behavior outside the named validator and contract-evidence surfaces.

## Target

Make runtime validation behavior explicit and testable across string formats, cross-field validator registration, skip behavior, warning metadata, and schema coverage.

## Expected artifacts

Likely scope includes `src/validators/index.ts`, validator helpers, schema fixtures, cross-field fixtures, warning/result tests, and short validation docs.

## Allowed scope

Allowed: focused validator code, fixtures, tests, and short docs. Not allowed: unrelated package export, release-integrity, or consumer-import changes unless needed for local validation proof.

## Decision

Use one validator contract PR because these issues share one root contract: Hounfour validation must be deterministic, explicit, and testable for downstream consumers.

## Evidence model

This lane now separates executable runtime evidence from advisory inventory evidence.

Executable evidence:

- runtime validator fixtures in `tests/validators/registry-contract.test.ts`;
- cross-field validator dispatch and skip behavior;
- warning metadata propagation;
- runtime rejection for invalid `date-time`, `uri`, and `uuid` string formats.

Advisory evidence:

- `scripts/check-validator-registry.mjs` remains an inventory scanner;
- package script `check:validator-registry-advisory` makes the non-blocking role explicit;
- `check:all` still runs the advisory scan so drift remains visible in normal validation output.

The advisory scanner is not treated as full contract enforcement. Future enforcement must be added as separate executable tests or a stricter checker with a clearly documented failure policy.

## Rollback

Rollback is the closing PR revert; implementation commits should keep validator behavior changes local.

## Non-claims

This lane does not certify the full package release surface and does not close every referenced issue by itself. It narrows the accepted scope to executable runtime fixtures plus explicit advisory registry inventory evidence.