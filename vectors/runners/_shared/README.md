# `vectors/runners/_shared/` — cross-runner single-source-of-truth files

Files in this directory are read at runtime by every cross-runner
implementation (TS / Python / Go / Rust). Any divergence between a
runner's hardcoded copy and the shared file is a hard failure —
runners that ship without reading these files break the parity
contract iter-2 of PR-A3.9 (FR-A2) explicitly closed.

| File | Purpose | Format |
|---|---|---|
| `parity-protocol-version.txt` | Cross-runner harness contract version. Bumped together across all four runners. | Single-line semver, no leading whitespace, optional trailing newline. |
| `rfc3339-utc-pattern.txt` | RFC 3339 / ISO 8601 UTC date-time regex shared by Python / Go / Rust runners' format-checker registrations. Mirrors TypeBox's `ISO8601_UTC_PATTERN` shape. | Single-line POSIX/PCRE regex (`^...$`), no leading whitespace, optional trailing newline. |

## Loading discipline

Each runner reads these files at process startup and panics / fatals
if either is missing or malformed. A startup-time hard fail is the
designed failure mode — silent parity drift on stale defaults is
exactly what cycle-005 PR-A3.9 (FR-A2) iter-2 closed.

The TS reference (`scripts/cross-runner.ts`) reads via `readFileSync`,
the Python runner via `Path.read_text()`, the Go runner via
`os.ReadFile`, the Rust runner via `std::fs::read_to_string`. Each
strips trailing newlines but does NOT trim interior whitespace.

## Bumping the protocol version

When the harness contract changes (manifest shape, bucket vocabulary,
result-label vocabulary):

1. Edit `parity-protocol-version.txt` to the new semver string.
2. Update `MIGRATION.md` with the additive / breaking classification.
3. Run `npm run vectors:cross-runners` — the harness re-asserts
   version equality across runners and re-diffs manifests.

The shared file is the load-bearing source; runner source code holds
no hardcoded fallback.

@since v8.6.0 — PR-A3.9 (FR-A2) iter-3 (cycle-005).
