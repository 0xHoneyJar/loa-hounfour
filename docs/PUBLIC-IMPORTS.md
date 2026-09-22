# Public Import Contract

This document makes the package import boundary explicit so refactors do not accidentally turn internal file layout into a consumer API.

## Stable public imports

The following import specifiers are part of the public package surface because they are declared in `package.json` `exports`:

- `@0xhoneyjar/loa-hounfour`
- `@0xhoneyjar/loa-hounfour/core`
- `@0xhoneyjar/loa-hounfour/economy`
- `@0xhoneyjar/loa-hounfour/model`
- `@0xhoneyjar/loa-hounfour/governance`
- `@0xhoneyjar/loa-hounfour/constraints`
- `@0xhoneyjar/loa-hounfour/integrity`
- `@0xhoneyjar/loa-hounfour/graph`
- `@0xhoneyjar/loa-hounfour/composition`
- `@0xhoneyjar/loa-hounfour/commons`
- `@0xhoneyjar/loa-hounfour/vectors`
- `@0xhoneyjar/loa-hounfour/schemas/*`

These paths should be treated as compatibility commitments. Removing, renaming, or changing their runtime/type targets requires explicit version review.

## Internal layout

Consumers should not import from source or generated implementation paths such as:

- `src/*`
- `dist/*`
- private helper files under exported directories
- test fixtures or scripts

Those paths are implementation details and may move as long as the stable specifiers above continue to work.

## Review rule for export-map changes

Any PR that changes `package.json` `exports`, `main`, `types`, or public package files should include:

1. a clear statement of whether the change is additive, compatible, or breaking;
2. `npm run check:public-exports` output;
3. packed-package import evidence when available;
4. a versioning note explaining whether the package version needs a patch, minor, or major bump.

## Relationship to release checks

`check:public-exports` protects source-tree export declarations. Packed-package import checks protect the artifact a consumer installs. Both are review evidence for package-surface PRs, but neither should be used to justify importing internal paths.