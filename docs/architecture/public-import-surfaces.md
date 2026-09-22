# Public Import Surfaces

The supported consumer-facing import paths of `@0xhoneyjar/loa-hounfour`
(issues #128, #134, #142, #155). Anything not listed here is internal and may
move without notice.

## Subpath exports

| Import path | Surface |
|-------------|---------|
| `@0xhoneyjar/loa-hounfour` | Everything (root barrel) |
| `@0xhoneyjar/loa-hounfour/core` | Agents, messages |
| `@0xhoneyjar/loa-hounfour/economy` | Billing, JWT, escrow |
| `@0xhoneyjar/loa-hounfour/governance` | Delegation, permissions |
| `@0xhoneyjar/loa-hounfour/constraints` | Constraint DSL |
| `@0xhoneyjar/loa-hounfour/model` | Model/provider schemas |
| `@0xhoneyjar/loa-hounfour/graph` | Graph schemas |
| `@0xhoneyjar/loa-hounfour/integrity` | Integrity/audit schemas |
| `@0xhoneyjar/loa-hounfour/composition` | Composition schemas |
| `@0xhoneyjar/loa-hounfour/commons` | Commons schemas |
| `@0xhoneyjar/loa-hounfour/schemas/*` | Generated JSON Schema files |
| `@0xhoneyjar/loa-hounfour/vectors` | Conformance vectors |

## How the surface is enforced (not just documented)

| Risk | Gate |
|------|------|
| Export target missing from the shipped package | `check:public-exports` — validates `main`/`types`, every `exports` target path, and the `files` list |
| Export resolves in the repo but not from the packed tarball | `check:packed-imports` — packs the tarball and imports **every** `exports` subpath from it |
| Package layout change silently breaks a subpath (#155 export-map coupling) | Same two gates; both run in `check:all`, which is a required CI job |
| Contract-version discipline (#142) | `semver:check` + `check:migration`; additive-only within a MAJOR line per the semver policy in CLAUDE.md |

## Changing the surface

Adding a subpath: add the `exports` entry, ship the target in `files`, update
this table — `check:public-exports`/`check:packed-imports` fail until all
three agree. Removing or renaming a subpath is a **breaking change** (MAJOR)
per the strict-semver policy.
