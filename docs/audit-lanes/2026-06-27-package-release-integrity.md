# Audit lane: Package export, release integrity, and consumer evidence

## Purpose

This draft PR distills Hounfour's public import, package export, release parity, files-list, and consumer evidence issues into one implementation lane. It is a routing artifact and does not claim the fixes are complete yet.

## Issue coverage

Refs #128, #132, #133, #134, #135, #140, #142, #145, #146, #149, #150, #155, #156, #159.

## Preserved state

Preserve current Hounfour package semantics while making the published/imported contract easier to verify.

## Target

Prove that exported schemas, public import paths, packed package contents, dist parity, release metadata, and release checks match the contract downstream consumers rely on.

## Expected artifacts

Likely scope includes `package.json`, exports-map docs, release integrity files, package smoke tests, dist parity scripts, and release-check documentation.

## Allowed scope

Allowed: package metadata, export docs, parity scripts, smoke tests, and release evidence. Not allowed: unrelated validator semantics unless needed for package proof.

## Decision

Use one package/release PR because these issues share one root contract: what Hounfour publishes must match what consumers import and what release evidence claims.

## Rollback

Rollback is the closing PR revert; implementation commits should keep package metadata and release checks separable.

## Non-claims

This lane does not certify every validator behavior and does not close issue references until implementation evidence is present.