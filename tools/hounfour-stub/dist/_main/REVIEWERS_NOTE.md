# Reviewers' note for `tools/hounfour-stub/dist/_main/`

This directory is a **build artifact**, not source code authored by PR-A3.11.

`tools/hounfour-stub/scripts/build.mjs` copies the loa-hounfour main package's
compiled `dist/` tree into this `_main/` directory at stub build time. The
resulting bundle lets `file:./tools/hounfour-stub` consumer installs resolve
all imports within the stub's package boundary (npm copies the stub's contents
into the consumer's `node_modules/`; relative imports reaching outside the
package boundary break under that copy behavior — verified empirically before
iter-3).

## Findings about `_main/` contents are out of scope for the stub PR

Every file under `_main/` is a verbatim copy of the corresponding file at the
main package's `dist/`. Real concerns about the bundled code (validator
registration semantics, schema-graph guard logic, DAG recursion bounds, etc.)
ARE valid — but they apply to `src/<original-path>`, not to anything authored
by PR-A3.11. The correct review channel is a separate PR against the main
`src/`, citing this directory as the surface that surfaced the latent issue.

The `check:dist-parity` gate verifies `_main/` is byte-equal to main's `dist/`
on every CI run; drift between them is a hard failure. Iterating on stub
content does not change `_main/` — it changes `tools/hounfour-stub/scripts/build.mjs`
or `dist/index.js` directly.

## Cycle-005 lifecycle context

The `_main/` bundle is transient: cycle-005 v8.6.0 ships (PR-A3.12), the stub
follows for ~1 week of RC consumer aliasing, then v8.7.0 deletes the stub
when the registry-published GA is canonical (operator-private specs cover
the broader stub lifecycle).

@since v8.6.0 — PR-A3.11 (FR-D1) iter-4 (cycle-005)
