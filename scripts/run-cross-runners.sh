#!/usr/bin/env bash
# Cross-language conformance harness for loa-hounfour.
#
# Runs the TS / Python / Go / Rust cross-runners and asserts that
# every runner emits a byte-identical manifest (after sort by
# schema+vector). Divergence is a hard error per AT-1 — the TS
# reference is the golden corpus; runners that diverge fail the gate.
#
# Schema scope: v8.4.0 substrate + v8.6.0 cycle-005 cluster (14
# schemas across SCHEMAS in scripts/cross-runner.ts). Cross-field
# invariants (CR-1, FR-C builtins, byte-cap, etc.) are NOT exercised
# by this harness — those are consumer-side per ADR-010 and surface
# as `'pass-cross-field-deferred'` in the manifest.
#
# Non-schema corpora (is_valid_dag / extract_path / contract_version_
# binding / ed25519_pattern) are exercised by the TS reference only;
# cross-runner ports of those evaluators are deferred to v8.7.0
# (FR-A2 follow-up — each evaluator's per-runtime port is its own
# review-surface unit).
#
# Exit codes:
#   0 — all four runners agree
#   1 — at least one runner diverged (diff printed)
#   2 — runner build/run failure
#
# Usage:
#   bash scripts/run-cross-runners.sh
#
# @since v8.6.0 — PR-A3.9 (FR-A2)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$REPO_ROOT"

# iter-2 F011 mitigation: the parity_protocol_version is a SSOT loaded
# at runtime from vectors/runners/_shared/parity-protocol-version.txt
# by every runner. The harness reads the same file and announces it
# at the top of its log so a divergent install is obvious before any
# manifest comparison runs.
SHARED_VERSION="$(cat "$REPO_ROOT/vectors/runners/_shared/parity-protocol-version.txt" | tr -d '[:space:]')"
echo "[cross-runners] parity_protocol_version (SSOT) = $SHARED_VERSION"

# iter-3 F003 mitigation: pre-flight toolchain detection. Without this,
# missing tools surface as an opaque exec-failure deep in the harness;
# operators have to grep the log to figure out which runner failed.
# Now: each missing tool emits a clear "[install hint]" line up front.
need_tool() {
  local tool="$1"
  local hint="$2"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "[cross-runners] FAIL: required tool '$tool' not found in PATH." >&2
    echo "  install: $hint" >&2
    return 1
  fi
}
TOOLCHAIN_OK=1
need_tool npx    "Node.js + npm (https://nodejs.org)"            || TOOLCHAIN_OK=0
need_tool python3 "Python 3 (https://www.python.org)"            || TOOLCHAIN_OK=0
need_tool go     "Go 1.22+ (https://go.dev/doc/install)"         || TOOLCHAIN_OK=0
need_tool cargo  "Rust + cargo (https://rustup.rs)"              || TOOLCHAIN_OK=0
need_tool jq     "jq (https://jqlang.github.io/jq/)"             || TOOLCHAIN_OK=0
if [[ $TOOLCHAIN_OK -eq 0 ]]; then
  echo "[cross-runners] FAIL: required toolchains missing (see above)." >&2
  exit 2
fi

echo "[cross-runners] TS reference (scripts/cross-runner.ts) ..."
npx tsx scripts/cross-runner.ts --emit-manifest > "$TMP_DIR/ts.json"
# The TS reference covers schema + non-schema corpora. The
# cross-runner harness compares the schema-only subset (other
# runners do not yet implement is_valid_dag / extract_path).
jq '[.[] | select(.schema | test("^(is_valid_dag|extract_path|contract_version_binding|ed25519_pattern)$") | not)]' \
  "$TMP_DIR/ts.json" > "$TMP_DIR/ts-schema.json"

echo "[cross-runners] Python (vectors/runners/python/cross_runner.py) ..."
python3 vectors/runners/python/cross_runner.py --emit-manifest > "$TMP_DIR/py.json"

echo "[cross-runners] Go (vectors/runners/go/cmd/cross-runner) ..."
GOPATH="${GOPATH:-$HOME/go}" go -C vectors/runners/go run ./cmd/cross-runner --emit-manifest \
  2>"$TMP_DIR/go.stderr" > "$TMP_DIR/go.json"

echo "[cross-runners] Rust (vectors/runners/rust/target/release/cross-runner) ..."
# iter-1 mitigation: ALWAYS rebuild the Rust binary before running it.
# The previous "build only when missing" path silently ran a stale
# binary after main.rs edits — exactly the failure mode parity tests
# exist to prevent. Cargo's incremental compilation makes
# unconditional rebuild cheap (≤1 s when source is unchanged).
cargo build --release --manifest-path vectors/runners/rust/Cargo.toml --bin cross-runner \
  --quiet 2>"$TMP_DIR/rust.build.stderr"
RUST_BIN="$REPO_ROOT/vectors/runners/rust/target/release/cross-runner"
"$RUST_BIN" --emit-manifest > "$TMP_DIR/rust.json"

# Sort each manifest deterministically before comparison so insertion
# order from each runner does not matter — the contract is set
# equality on (schema, vector, expected, result, diagnostic) tuples.
SORT='sort_by(.schema, .vector)'
jq -S "$SORT" "$TMP_DIR/ts-schema.json" > "$TMP_DIR/ts.sorted.json"
jq -S "$SORT" "$TMP_DIR/py.json"        > "$TMP_DIR/py.sorted.json"
jq -S "$SORT" "$TMP_DIR/go.json"        > "$TMP_DIR/go.sorted.json"
jq -S "$SORT" "$TMP_DIR/rust.json"      > "$TMP_DIR/rust.sorted.json"

DIVERGED=0
for runner in py go rust; do
  if ! diff -q "$TMP_DIR/ts.sorted.json" "$TMP_DIR/$runner.sorted.json" >/dev/null; then
    echo ""
    echo "[cross-runners] DIVERGENCE: TS vs $runner"
    diff "$TMP_DIR/ts.sorted.json" "$TMP_DIR/$runner.sorted.json" | head -40
    DIVERGED=1
  fi
done

if [[ $DIVERGED -eq 1 ]]; then
  echo ""
  echo "[cross-runners] FAIL: at least one runner diverged from the TS reference."
  exit 1
fi

ENTRIES=$(jq 'length' "$TMP_DIR/ts.sorted.json")
echo ""
echo "[cross-runners] OK: TS, Python, Go, Rust all agree ($ENTRIES schema entries; parity_protocol_version=$SHARED_VERSION)."
