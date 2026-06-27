# Audit lane: Validator determinism and contract enforcement

## Purpose

This draft PR distills Hounfour's validator, format, cache, cross-field, warning-severity, and schema-wiring issues into one implementation lane. It is a routing artifact and does not claim the fixes are complete yet.

## Issue coverage

Refs #121, #122, #123, #124, #125, #126, #127, #129, #130, #131, #136, #137, #138, #139, #141, #143, #144, #147, #148, #151, #152, #153, #154, #157, #158, #160.

## Preserved state

Preserve existing Hounfour package behavior outside the named validator and contract-enforcement surfaces.

## Target

Make runtime validation deterministic and contract-backed across schema compile cache keys, string formats, global registry use, cross-field validator registration, warning metadata, and schema coverage.

## Expected artifacts

Likely scope includes `src/validators/index.ts`, validator helpers, schema fixtures, cross-field fixtures, warning/result tests, and coverage reports.

## Allowed scope

Allowed: focused validator code, fixtures, tests, and short docs. Not allowed: unrelated package export, release-integrity, or consumer-import changes unless needed for local validation proof.

## Decision

Use one validator contract PR because these issues share one root contract: Hounfour validation must be deterministic, explicit, and testable for downstream consumers.

## Rollback

Rollback is the closing PR revert; implementation commits should keep validator behavior changes local.

## Non-claims

This lane does not certify the full package release surface and does not close issue references until implementation evidence is present.