// Go reference runner for the verifier conformance suite (FR-C2, SDD §5).
//
// Runs every case under vectors/verifier/ through the Go port in package
// verify. With --emit-manifest, prints a JSON array of
// {kind, case, result, matches_expected} for scripts/run-verifier-parity.sh,
// which diffs it against scripts/verifier-runner.ts.
//
// Usage:
//
//	cd vectors/runners/go
//	go run ./cmd/verifier-runner --emit-manifest > go-verifier.json
//	go run ./cmd/verifier-runner                  # exit 1 on any mismatch
//
// @since v8.8.0 (FR-C2)
package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/0xHoneyJar/loa-hounfour/vectors/runners/go/verify"
)

func main() {
	emit := false
	for _, a := range os.Args[1:] {
		if a == "--emit-manifest" {
			emit = true
		}
	}
	cwd, err := os.Getwd()
	if err != nil {
		fatal(err)
	}
	root, err := verify.FindRepoRoot(cwd)
	if err != nil {
		fatal(err)
	}
	manifest, err := verify.BuildManifest(root)
	if err != nil {
		fatal(err)
	}
	failed := 0
	if emit {
		out, err := json.MarshalIndent(manifest, "", "  ")
		if err != nil {
			fatal(err)
		}
		fmt.Println(string(out))
	}
	for _, e := range manifest {
		if !emit {
			status := "ok  "
			if !e.MatchesExpected {
				status = "FAIL"
			}
			fmt.Printf("%s %s/%s\n", status, e.Kind, e.Case)
		}
		if !e.MatchesExpected {
			failed++
			r, _ := json.Marshal(e.Result)
			fmt.Fprintf(os.Stderr, "[verifier-runner:go] mismatch %s/%s: %s\n", e.Kind, e.Case, r)
		}
	}
	if failed > 0 {
		os.Exit(1)
	}
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "[verifier-runner:go] %v\n", err)
	os.Exit(2)
}
