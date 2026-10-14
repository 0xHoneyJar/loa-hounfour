#!/usr/bin/env bash
# Reference-verifier parity harness (FR-C2, SDD §5).
#
# Runs the verifier conformance suite (vectors/verifier/) through the TS
# reference (scripts/verifier-runner.ts) and the Go port
# (vectors/runners/go/cmd/verifier-runner), then asserts the two result
# manifests are byte-identical after a deterministic sort. Each runner
# also checks every case against its `expected` object.
#
# Exit codes:
#   0 — both runners match `expected` on every case and agree with each other
#   1 — a runner mismatched `expected`, or the runners diverged (diff printed)
#   2 — toolchain missing or runner build/run failure
#
# Usage:
#   bash scripts/run-verifier-parity.sh      (or: npm run verifier:parity)
#
# @since v8.8.0 (FR-C2)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$REPO_ROOT"

need_tool() {
  local tool="$1"
  local hint="$2"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "[verifier-parity] FAIL: required tool '$tool' not found in PATH." >&2
    echo "  install: $hint" >&2
    return 1
  fi
}
TOOLCHAIN_OK=1
need_tool npx "Node.js 22+ + npm (https://nodejs.org)"     || TOOLCHAIN_OK=0
need_tool go  "Go 1.22+ (https://go.dev/doc/install)"      || TOOLCHAIN_OK=0
need_tool jq  "jq (https://jqlang.github.io/jq/)"          || TOOLCHAIN_OK=0
if [[ $TOOLCHAIN_OK -eq 0 ]]; then
  echo "[verifier-parity] FAIL: required toolchains missing (see above)." >&2
  exit 2
fi

# $1 label, rest: command. Exit 1 from a runner means "case mismatch"
# (its manifest is still complete); anything else is a run failure.
run_runner() {
  local label="$1"; shift
  local rc=0
  "$@" --emit-manifest > "$TMP_DIR/$label.json" 2> "$TMP_DIR/$label.stderr" || rc=$?
  if [[ $rc -ne 0 && $rc -ne 1 ]]; then
    echo "[verifier-parity] FAIL: $label runner exited $rc" >&2
    cat "$TMP_DIR/$label.stderr" >&2
    exit 2
  fi
  return $rc
}

MISMATCH=0
echo "[verifier-parity] TS reference (scripts/verifier-runner.ts) ..."
run_runner ts npx tsx scripts/verifier-runner.ts || MISMATCH=1

echo "[verifier-parity] Go (vectors/runners/go/cmd/verifier-runner) ..."
run_runner go env GOPATH="${GOPATH:-$HOME/go}" go -C vectors/runners/go run ./cmd/verifier-runner || MISMATCH=1

SORT='sort_by(.kind, .case)'
jq -S "$SORT" "$TMP_DIR/ts.json" > "$TMP_DIR/ts.sorted.json"
jq -S "$SORT" "$TMP_DIR/go.json" > "$TMP_DIR/go.sorted.json"

if [[ $MISMATCH -eq 1 ]]; then
  echo "" >&2
  echo "[verifier-parity] FAIL: at least one runner disagreed with a case's expected result:" >&2
  grep -h 'mismatch' "$TMP_DIR/ts.stderr" "$TMP_DIR/go.stderr" >&2 || true
fi

if ! diff -q "$TMP_DIR/ts.sorted.json" "$TMP_DIR/go.sorted.json" >/dev/null; then
  echo ""
  echo "[verifier-parity] DIVERGENCE: TS vs Go"
  diff "$TMP_DIR/ts.sorted.json" "$TMP_DIR/go.sorted.json" | head -40
  exit 1
fi
if [[ $MISMATCH -eq 1 ]]; then
  exit 1
fi

ENTRIES=$(jq 'length' "$TMP_DIR/ts.sorted.json")
echo ""
echo "[verifier-parity] OK: TS and Go agree on all $ENTRIES verifier cases and every case matches expected."
