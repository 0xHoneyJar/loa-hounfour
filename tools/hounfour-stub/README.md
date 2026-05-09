# `@0xhoneyjar/loa-hounfour-stub`

RC-staging stub for `@0xhoneyjar/loa-hounfour`. Re-exports the v8.6.0 cycle-005 cluster (16 schemas + 4 FR-C constraint builtins) from the main package's source tree.

## Why

During the v8.6.0 RC window, downstream consumers want to lock against the staged surface — schema shapes that may iterate before GA. Aliasing their `@0xhoneyjar/loa-hounfour` dependency to this stub lets them pin to the local source without depending on a registry-published RC tag.

After v8.6.0 GA publish, consumers switch their alias from `file:./tools/hounfour-stub` to the published version (`@0xhoneyjar/loa-hounfour@8.6.0`). The differential test under `tests/stub/diff-against-main.test.ts` ensures the stub's surface is byte-identical to main's, so the swap is observable as a no-op at the consumer's import surface.

## Consumer alias incantation

Add to your consumer repo's `package.json` during RC:

```json
{
  "dependencies": {
    "@0xhoneyjar/loa-hounfour": "file:./path/to/loa-hounfour/tools/hounfour-stub"
  }
}
```

Run `npm install` (or `pnpm install`). Your code's existing `import { ... } from '@0xhoneyjar/loa-hounfour'` continues to work; the imports now resolve through the stub.

After GA:

```json
{
  "dependencies": {
    "@0xhoneyjar/loa-hounfour": "8.6.0"
  }
}
```

## Why `private: true`

The stub is unpublishable by design. `npm publish` from this directory errors `EPRIVATE` because `package.json` declares `"private": true`. This is the NA-2 fix per the cycle-005 PRD: the stub stages the production surface but cannot leak to the registry.

A search by `@0xhoneyjar/loa-hounfour` in the npm / GitHub Packages registry returns only the production package (`@0xhoneyjar/loa-hounfour`, not `@0xhoneyjar/loa-hounfour-stub`); the stub is unfindable to consumers who didn't get the file path directly from this repo.

## Schema `$id` discipline

Every re-exported schema's `$id` retains the production namespace (`@0xhoneyjar/loa-hounfour/...`). Consumers querying `Schema.$id` see the production identifier whether they resolved the schema via the stub or via the published version — no surface drift across the alias swap.

## Contract enforcement

The differential test (`tests/stub/diff-against-main.test.ts`) and CI workflow (`.github/workflows/stub-differential.yml`) ensure the stub's surface stays byte-identical to main's:

- Every exported schema is referentially equal between stub and main (re-export-from-main architecture).
- Canonical-JSON serialization is byte-equal across both sides.
- Every schema's `$id` is PascalCase production-namespaced.
- The package.json declares the exact stub-namespaced name + version + private flag.

Drift is a hard CI failure.

## Scope

| Included | Not included |
|---|---|
| v8.6.0 cycle-005 schemas (16) | v8.4.0 / v8.5.0 substrate schemas |
| 4 FR-C constraint builtins | v8.7.0 schemas (PR-B1.x landings) |
| `CONTRACT_VERSION`, `MIN_SUPPORTED_VERSION`, `SCHEMA_BASE_URL` | Cross-runner harness output (separate path) |
| `CHALLENGE_TYPES`, `CHALLENGE_REQUESTED_EFFECTS`, `PHASE_KINDS` canonical arrays | `validate(...)` registry — consumers call into main directly |

Consumers needing v8.4.0 / v8.5.0 substrate pin to the published version for the substrate AND alias only the v8.6.0 deltas through the stub if they need RC-window-fixed semantics for cycle-005 surfaces only. The stub does not attempt to mirror every transitive dep — it only mirrors what cycle-005 added or modified.

## Lifecycle

| Cycle | State |
|---|---|
| v8.6.0 RC (now) | Active — consumers alias here |
| v8.6.0 GA (PR-A3.12 ship) | Deprecated — consumers switch alias to published |
| v8.7.0 RC | Reactivated — v8.7.0 deltas land here |

@since v8.6.0 — PR-A3.11 (FR-D1)
